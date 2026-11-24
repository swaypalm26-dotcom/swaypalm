import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cliPortIdx = process.argv.indexOf('--port');
const cliPort = cliPortIdx !== -1 ? Number(process.argv[cliPortIdx + 1]) : NaN;
const PORT = Number.isFinite(cliPort) && cliPort > 0 ? cliPort : Number(process.env.PORT || 3000);
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

interface PendingVerification {
  codeHash: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

const verificationStore = new Map<string, PendingVerification>();

function hashCode(email: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${email.toLowerCase()}::${code}`)
    .digest('hex');
}

function buildVerificationEmailHtml(name: string, code: string): string {
  return `
  <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="background: #0A4D2E; padding: 20px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">SwayPalm</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #D4AF37;">Where Business Meets The World</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 12px; font-size: 14px; color: #111915;">Hello ${name || 'Business Owner'},</p>
      <p style="margin: 0 0 18px; font-size: 14px; color: #374151; line-height: 1.5;">
        Use the verification code below to confirm your email address and activate your free SwayPalm business account:
      </p>
      <div style="background: #F3F5F4; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 18px;">
        <span style="font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0A4D2E;">${code}</span>
      </div>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        This code expires in 10 minutes. If you did not register on SwayPalm, you can safely ignore this message.
      </p>
    </div>
  </div>`;
}

const OUTBOUND_TIMEOUT_MS = 15000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = OUTBOUND_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new Error(`Upstream request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw new Error(err?.message || 'Unable to reach external service due to a network error.');
  } finally {
    clearTimeout(timer);
  }
}

async function safeReadJson<T = Record<string, any>>(res: Response): Promise<T> {
  const raw = await res.text().catch(() => '');
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

async function deliverEmailCode(
  toEmail: string,
  recipientName: string,
  code: string
): Promise<{ delivered: boolean; provider: string }> {
  const fromAddress = process.env.SMTP_FROM || 'SwayPalm <no-reply@swaypalm.com>';
  const subject = `${code} is your SwayPalm email verification code`;
  const text = `Hello ${recipientName || 'Business Owner'},\n\nYour SwayPalm email verification code is: ${code}\n\nThis code expires in 10 minutes.`;
  const html = buildVerificationEmailHtml(recipientName, code);

  if (process.env.RESEND_API_KEY) {
    const res = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend delivery error: ${body || `HTTP ${res.status}`}`);
    }
    return { delivered: true, provider: 'resend' };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { delivered: true, provider: 'smtp' };
  }

  return { delivered: false, provider: 'none' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.post('/api/auth/send-email-code', async (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const recipientName = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const existing = verificationStore.get(rawEmail);
    const now = Date.now();
    if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      res.status(429).json({ error: `Please wait ${waitSec}s before requesting a new code.` });
      return;
    }

    const code = String(crypto.randomInt(100000, 1000000));
    verificationStore.set(rawEmail, {
      codeHash: hashCode(rawEmail, code),
      expiresAt: now + CODE_TTL_MS,
      lastSentAt: now,
      attempts: 0,
    });

    try {
      const result = await deliverEmailCode(rawEmail, recipientName, code);
      if (result.delivered) {
        res.json({
          sent: true,
          delivery: result.provider,
          expiresInMinutes: 10,
        });
      } else {
        console.info(`[SwayPalm Email Verification] Code for ${rawEmail}: ${code} (SMTP/Resend not configured)`);
        res.json({
          sent: false,
          delivery: 'sandbox_preview',
          previewCode: code,
          expiresInMinutes: 10,
          message:
            'No SMTP or Resend credentials are configured in environment secrets yet; showing verification code for preview testing.',
        });
      }
    } catch (err: any) {
      console.error('Failed to send verification email:', err);
      res.status(502).json({
        error: err?.message || 'Unable to send verification email right now.',
      });
    }
  });

  app.post('/api/auth/verify-email-code', (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!rawEmail || !/^\d{6}$/.test(code)) {
      res.status(400).json({ verified: false, error: 'Enter a valid 6-digit verification code.' });
      return;
    }

    const entry = verificationStore.get(rawEmail);
    if (!entry) {
      res.status(404).json({ verified: false, error: 'No active verification code found. Please request a new code.' });
      return;
    }

    if (Date.now() > entry.expiresAt) {
      verificationStore.delete(rawEmail);
      res.status(410).json({ verified: false, error: 'Verification code expired. Please request a new one.' });
      return;
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      verificationStore.delete(rawEmail);
      res.status(429).json({ verified: false, error: 'Too many invalid attempts. Request a new code.' });
      return;
    }

    const candidateHash = Buffer.from(hashCode(rawEmail, code), 'hex');
    const storedHash = Buffer.from(entry.codeHash, 'hex');
    const match =
      candidateHash.length === storedHash.length &&
      crypto.timingSafeEqual(candidateHash, storedHash);

    if (!match) {
      entry.attempts += 1;
      res.status(400).json({
        verified: false,
        error: `Incorrect verification code. ${MAX_ATTEMPTS - entry.attempts} attempts remaining.`,
      });
      return;
    }

    verificationStore.delete(rawEmail);
    res.json({ verified: true });
  });

  // Google Play Store Trusted Web Activity (TWA) Digital Asset Links
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const packageName = (process.env.PLAY_ANDROID_PACKAGE || 'com.swaypalm.app').trim();
    const envFingerprints = (process.env.PLAY_SHA256_FINGERPRINT || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const fingerprints =
      envFingerprints.length > 0
        ? envFingerprints
        : ['00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'];

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ]);
  });

  // Search Engine Optimization (robots.txt, sitemap.xml & Google Search Console verification)
  const DEFAULT_PUBLISHED_URL = 'https://galvanized-ether-gk4jk.web.app';
  const isValidPublicHost = (host: string) => {
    const bare = host.trim().toLowerCase().split(':')[0];
    return (
      Boolean(bare) &&
      bare.includes('.') &&
      !/^ais-(?:dev|pre)-/i.test(bare) &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(bare)
    );
  };
  const resolveSeoSiteUrl = (req: express.Request) => {
    const publicEnvUrl = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
    if (publicEnvUrl && /^https:\/\//i.test(publicEnvUrl) && isValidPublicHost(publicEnvUrl.replace(/^https?:\/\//i, ''))) {
      return publicEnvUrl;
    }
    const rawHost = String(req.headers['x-forwarded-host'] || req.get('host') || '')
      .split(',')[0]
      .trim();
    if (isValidPublicHost(rawHost)) {
      return `https://${rawHost}`;
    }
    const envAppUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (
      envAppUrl &&
      /^https:\/\//i.test(envAppUrl) &&
      isValidPublicHost(envAppUrl.replace(/^https?:\/\//i, ''))
    ) {
      return envAppUrl;
    }
    return DEFAULT_PUBLISHED_URL;
  };

  const SEO_INDEXABLE_ROUTES = [
    { path: '/swaypalm26', changefreq: 'daily', priority: '1.0' },
    { path: '/swaypalm26/explore', changefreq: 'daily', priority: '0.9' },
    { path: '/swaypalm26/marketplace', changefreq: 'daily', priority: '0.9' },
    { path: '/swaypalm26/shop', changefreq: 'daily', priority: '0.9' },
    { path: '/swaypalm26/advertise', changefreq: 'weekly', priority: '0.8' },
    { path: '/swaypalm26/groups', changefreq: 'daily', priority: '0.8' },
    { path: '/swaypalm26/chat', changefreq: 'weekly', priority: '0.7' },
    { path: '/swaypalm26/friends', changefreq: 'weekly', priority: '0.7' },
    { path: '/swaypalm26/dashboard', changefreq: 'weekly', priority: '0.6' },
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/shop', changefreq: 'daily', priority: '0.9' },
    { path: '/explore', changefreq: 'daily', priority: '0.9' },
    { path: '/marketplace', changefreq: 'daily', priority: '0.9' },
    { path: '/advertise', changefreq: 'weekly', priority: '0.8' },
    { path: '/groups', changefreq: 'daily', priority: '0.8' },
  ];

  const ROUTE_SEO_META: Record<string, { title: string; description: string }> = {
    '/': {
      title: 'SwayPalm26 (SwayPalm) — Global Business Network & Marketplace',
      description:
        'Search SwayPalm26 to connect with verified global businesses, showcase products, trade in the B2B marketplace, and launch $12 sponsored ads.',
    },
    '/explore': {
      title: 'Explore Global Verified Businesses — SwayPalm26',
      description:
        'Discover verified companies, wholesalers, exporters, and service providers worldwide on SwayPalm26.',
    },
    '/marketplace': {
      title: 'B2B Marketplace & Global Trade — SwayPalm26',
      description:
        'Shop wholesale and retail products directly from verified SwayPalm26 businesses with M-Pesa Paybill and card checkout.',
    },
    '/shop': {
      title: 'Shop & B2B Marketplace — SwayPalm26',
      description:
        'Browse and buy wholesale and retail products directly from verified SwayPalm26 sellers with M-Pesa and card checkout.',
    },
    '/advertise': {
      title: 'Post Sponsored Ads ($12) & Plans — SwayPalm26',
      description:
        'Promote your brand to global buyers on SwayPalm26 for $12 per ad slot (open to members and guests) or choose a verified storefront plan.',
    },
    '/groups': {
      title: 'Global Business & Trade Groups — SwayPalm26',
      description:
        'Join regional and industry trade communities on SwayPalm26 to share leads, import/export insights, and partner globally.',
    },
    '/chat': {
      title: 'Real-Time Business Chat & Calls — SwayPalm26',
      description:
        'Message connected business friends, see live online statuses, and host audio or video calls directly on SwayPalm26.',
    },
    '/friends': {
      title: 'Business Friends & Partner Network — SwayPalm26',
      description:
        'Connect with verified entrepreneurs, track online partner availability, and grow your global B2B network on SwayPalm26.',
    },
    '/dashboard': {
      title: 'Business Owner Dashboard — SwayPalm26',
      description:
        'Manage your SwayPalm26 storefront, track sales and 10% platform settlements, view analytics, and monitor active ads.',
    },
  };

  app.get('/robots.txt', (req, res) => {
    const siteUrl = resolveSeoSiteUrl(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${siteUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const siteUrl = resolveSeoSiteUrl(req);
    const lastMod = new Date().toISOString().slice(0, 10);
    const urlsXml = SEO_INDEXABLE_ROUTES.map((route) =>
      [
        '  <url>',
        `    <loc>${siteUrl}${route.path}</loc>`,
        `    <lastmod>${lastMod}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority}</priority>`,
        '  </url>',
      ].join('\n')
    ).join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urlsXml,
        '</urlset>',
      ].join('\n')
    );
  });

  const rawGscVerification = (process.env.GOOGLE_SITE_VERIFICATION || '').trim();
  const extractGscToken = (raw: string) => {
    if (!raw) return '';
    const contentMatch = raw.match(/content=["']([^"']+)["']/i);
    if (contentMatch?.[1]) return contentMatch[1].trim();
    return raw.replace(/^google-site-verification=/i, '').trim();
  };
  const gscTokenOrFile = extractGscToken(rawGscVerification);
  if (gscTokenOrFile && /^google[a-zA-Z0-9_-]+\.html$/.test(gscTokenOrFile)) {
    app.get(`/${gscTokenOrFile}`, (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`google-site-verification: ${gscTokenOrFile}`);
    });
  }

  app.get('/api/seo/status', (req, res) => {
    const siteUrl = resolveSeoSiteUrl(req);
    res.json({
      indexable: true,
      siteUrl,
      websiteUrl: `${siteUrl}/swaypalm26`,
      publishedAppUrl: `${DEFAULT_PUBLISHED_URL}/swaypalm26`,
      robotsUrl: `${siteUrl}/robots.txt`,
      sitemapUrl: `${siteUrl}/sitemap.xml`,
      sitemapUrlsCount: SEO_INDEXABLE_ROUTES.length,
      indexableUrls: SEO_INDEXABLE_ROUTES.map((r) => `${siteUrl}${r.path}`),
      verificationConfigured: Boolean(gscTokenOrFile),
      verificationMethod: gscTokenOrFile
        ? gscTokenOrFile.endsWith('.html')
          ? 'html_file'
          : 'meta_tag'
        : 'none',
      schemaTypes: ['WebSite', 'WebApplication', 'Organization', 'FAQPage'],
    });
  });

  // M-Pesa Paybill 247247 / Account 0460180118328 Subscription, Ad Slot ($12) & Live SIM STK Endpoints
  const PLAN_USD: Record<'ad_slot' | 'basic' | 'pro' | 'premium', number> = {
    ad_slot: 12,
    basic: 5,
    pro: 15,
    premium: 30,
  };
  const KES_RATE = 130;
  const TARGET_PAYBILL = '247247';
  const TARGET_ACCOUNT = '0460180118328';
  const redeemedMpesaCodes = new Set<string>();
  const redeemedOtherRefs = new Set<string>();

  interface SandboxCardSession {
    token: string;
    reference: string;
    brand: string;
    last4: string;
    amountUsd: number;
    redeemed: boolean;
    createdAt: number;
  }
  const sandboxCardSessions = new Map<string, SandboxCardSession>();
  const redeemedCardRefs = new Set<string>();

  interface StkPromptSession {
    checkoutRequestId: string;
    merchantRequestId: string;
    plan: 'ad_slot' | 'basic' | 'pro' | 'premium';
    normalizedPhone: string;
    paybillNumber: string;
    partyB: string;
    accountNumber: string;
    amountUsd: number;
    amountKes: number;
    mode: 'daraja_stk' | 'interactive_prompt';
    status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
    mpesaReceiptNumber: string;
    resultDesc: string;
    settlementStatus: 'pending' | 'direct_paybill_247247' | 'b2b_forwarded' | 'b2b_failed' | 'preview_only';
    b2bConversationId?: string;
    redeemed: boolean;
    createdAt: number;
    updatedAt: number;
  }

  const stkSessions = new Map<string, StkPromptSession>();

  function normalizeKenyanPhone(raw: string): string | null {
    const cleaned = raw.replace(/[\s\-()]/g, '').replace(/^\+/, '');
    if (/^254(7|1)\d{8}$/.test(cleaned)) return cleaned;
    if (/^0(7|1)\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
    if (/^(7|1)\d{8}$/.test(cleaned)) return `254${cleaned}`;
    return null;
  }

  function formatDarajaTimestamp(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
      `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
    );
  }

  function getDarajaConfig(req?: express.Request) {
    const env = (process.env.MPESA_ENV || 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
    const consumerKey = (process.env.MPESA_CONSUMER_KEY || '').trim();
    const consumerSecret = (process.env.MPESA_CONSUMER_SECRET || '').trim();
    const passkey = (process.env.MPESA_PASSKEY || '').trim();
    const shortcode = (process.env.MPESA_SHORTCODE || TARGET_PAYBILL).trim();
    const partyB = (process.env.MPESA_PARTY_B || TARGET_PAYBILL).trim();
    const accountNumber = (process.env.MPESA_ACCOUNT || TARGET_ACCOUNT).trim();

    const missingKeys: string[] = [];
    if (!consumerKey) missingKeys.push('MPESA_CONSUMER_KEY');
    if (!consumerSecret) missingKeys.push('MPESA_CONSUMER_SECRET');
    if (!passkey) missingKeys.push('MPESA_PASSKEY');

    const inferredOrigin = req ? resolveSeoSiteUrl(req) : DEFAULT_PUBLISHED_URL;
    const rawCallbackUrl = (process.env.MPESA_CALLBACK_URL || `${inferredOrigin}/api/payments/mpesa-callback`).trim();
    const callbackUrl = rawCallbackUrl.replace(/([^:]\/)\/+/g, '$1');
    const b2bResultUrl = `${inferredOrigin}/api/payments/mpesa-b2b-callback`;

    const autoB2BEnabled =
      (process.env.MPESA_AUTO_B2B_TRANSFER || 'false').toLowerCase() === 'true' &&
      Boolean((process.env.MPESA_B2B_INITIATOR_NAME || '').trim()) &&
      Boolean((process.env.MPESA_B2B_SECURITY_CREDENTIAL || '').trim());

    return {
      env,
      baseUrl: env === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke',
      consumerKey,
      consumerSecret,
      passkey,
      shortcode,
      partyB,
      accountNumber,
      callbackUrl,
      b2bResultUrl,
      autoB2BEnabled,
      liveSimStkConnected: missingKeys.length === 0,
      missingKeys,
    };
  }

  async function fetchDarajaAccessToken(): Promise<string> {
    const cfg = getDarajaConfig();
    if (!cfg.consumerKey || !cfg.consumerSecret) {
      throw new Error('Missing Daraja consumer credentials.');
    }
    const authToken = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
    const tokenRes = await fetchWithTimeout(
      `${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${authToken}` } }
    );
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      throw new Error(`Safaricom Daraja OAuth failed (${tokenRes.status}): ${errText || 'Verify Consumer Key/Secret and MPESA_ENV.'}`);
    }
    const tokenJson = await safeReadJson<{ access_token?: string }>(tokenRes);
    if (!tokenJson.access_token) {
      throw new Error('Daraja OAuth did not return an access token.');
    }
    return tokenJson.access_token;
  }

  async function triggerAutoB2BTransferIfNeeded(session: StkPromptSession, req?: express.Request) {
    const cfg = getDarajaConfig(req);
    if (session.partyB === TARGET_PAYBILL && session.paybillNumber === TARGET_PAYBILL) {
      session.settlementStatus = 'direct_paybill_247247';
      return;
    }
    if (!cfg.autoB2BEnabled) {
      session.settlementStatus = 'direct_paybill_247247';
      return;
    }
    try {
      const accessToken = await fetchDarajaAccessToken();
      const initiatorName = (process.env.MPESA_B2B_INITIATOR_NAME || '').trim();
      const securityCredential = (process.env.MPESA_B2B_SECURITY_CREDENTIAL || '').trim();
      const b2bRes = await fetchWithTimeout(`${cfg.baseUrl}/mpesa/b2b/v1/paymentrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Initiator: initiatorName,
          SecurityCredential: securityCredential,
          CommandID: 'BusinessPayBill',
          SenderIdentifierType: '4',
          RecieverIdentifierType: '4',
          Amount: session.amountKes,
          PartyA: session.paybillNumber,
          PartyB: TARGET_PAYBILL,
          AccountReference: TARGET_ACCOUNT,
          Remarks: `SwayPalm ${session.plan.toUpperCase()} (${session.mpesaReceiptNumber})`,
          QueueTimeOutURL: cfg.b2bResultUrl,
          ResultURL: cfg.b2bResultUrl,
        }),
      });
      const b2bJson = await safeReadJson<{ ConversationID?: string }>(b2bRes);
      if (b2bRes.ok && b2bJson.ConversationID) {
        session.settlementStatus = 'b2b_forwarded';
        session.b2bConversationId = b2bJson.ConversationID;
      } else {
        session.settlementStatus = 'b2b_failed';
      }
    } catch {
      session.settlementStatus = 'b2b_failed';
    }
  }

  function mapDarajaResultMessage(resultCode: string, defaultDesc?: string): string {
    switch (resultCode) {
      case '0':
        return 'M-Pesa payment confirmed and transferred.';
      case '1':
        return 'Insufficient M-Pesa balance on your SIM wallet.';
      case '1032':
        return 'M-Pesa prompt was cancelled on your phone.';
      case '1037':
        return 'SIM prompt timed out — ensure your phone screen is unlocked, SIM is active, and network coverage is available.';
      case '2001':
        return 'Wrong M-Pesa PIN entered on your handset.';
      default:
        return defaultDesc || 'M-Pesa transaction did not complete.';
    }
  }

  app.get('/api/payments/mpesa-paybill/gateway-status', (req, res) => {
    const cfg = getDarajaConfig(req);
    res.json({
      liveSimStkConnected: cfg.liveSimStkConnected,
      env: cfg.env,
      shortcode: cfg.shortcode,
      partyB: cfg.partyB,
      accountNumber: cfg.accountNumber,
      callbackUrl: cfg.callbackUrl,
      autoB2BEnabled: cfg.autoB2BEnabled,
      missingKeys: cfg.missingKeys,
    });
  });

  app.post('/api/payments/mpesa-paybill/daraja-test-connection', async (req, res) => {
    const cfg = getDarajaConfig(req);
    if (!cfg.liveSimStkConnected) {
      res.status(400).json({
        connected: false,
        missingKeys: cfg.missingKeys,
        error: `Missing Daraja secrets: ${cfg.missingKeys.join(', ')}. Add them in AI Studio Secrets.`,
      });
      return;
    }
    try {
      await fetchDarajaAccessToken();
      res.json({
        connected: true,
        env: cfg.env,
        shortcode: cfg.shortcode,
        partyB: cfg.partyB,
        accountNumber: cfg.accountNumber,
        callbackUrl: cfg.callbackUrl,
        message: `Connected to Safaricom Daraja (${cfg.env}) for Paybill ${cfg.partyB} · Account ${cfg.accountNumber}.`,
      });
    } catch (err: any) {
      res.status(502).json({
        connected: false,
        error: err?.message || 'Unable to authenticate with Safaricom Daraja OAuth.',
      });
    }
  });

  app.post('/api/payments/mpesa-paybill/stk-push', async (req, res) => {
    const rawPlan = typeof req.body?.plan === 'string' ? req.body.plan.trim().toLowerCase() : '';
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const allowPreviewFallback = Boolean(req.body?.allowPreviewFallback);

    if (rawPlan !== 'ad_slot' && rawPlan !== 'basic' && rawPlan !== 'pro' && rawPlan !== 'premium') {
      res.status(400).json({ error: 'Select a valid ad slot ($12) or subscription plan.' });
      return;
    }
    const planKey = rawPlan as 'ad_slot' | 'basic' | 'pro' | 'premium';
    const normalizedPhone = normalizeKenyanPhone(rawPhone);
    if (!normalizedPhone) {
      res.status(400).json({
        error: 'Enter a valid Kenyan M-Pesa SIM number (e.g. 0712 345 678 or +254712345678).',
      });
      return;
    }

    const amountUsd = PLAN_USD[planKey];
    const amountKes = amountUsd * KES_RATE;
    const cfg = getDarajaConfig(req);

    if (cfg.liveSimStkConnected) {
      try {
        const accessToken = await fetchDarajaAccessToken();
        const timestamp = formatDarajaTimestamp();
        const password = Buffer.from(`${cfg.shortcode}${cfg.passkey}${timestamp}`).toString('base64');

        const stkRes = await fetchWithTimeout(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: cfg.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amountKes,
            PartyA: normalizedPhone,
            PartyB: cfg.partyB,
            PhoneNumber: normalizedPhone,
            CallBackURL: cfg.callbackUrl,
            AccountReference: cfg.accountNumber,
            TransactionDesc:
              planKey === 'ad_slot' ? 'SwayPalm $12 Ad Play' : `SwayPalm ${rawPlan.toUpperCase()} Plan`,
          }),
        });
        const stkData = await safeReadJson<{
          MerchantRequestID?: string;
          CheckoutRequestID?: string;
          CustomerMessage?: string;
          errorMessage?: string;
          ResponseDescription?: string;
        }>(stkRes);
        if (!stkRes.ok || !stkData.CheckoutRequestID) {
          throw new Error(
            stkData.errorMessage ||
              stkData.ResponseDescription ||
              'Safaricom M-Pesa STK push request failed.'
          );
        }

        const session: StkPromptSession = {
          checkoutRequestId: stkData.CheckoutRequestID,
          merchantRequestId: stkData.MerchantRequestID || '',
          plan: planKey,
          normalizedPhone,
          paybillNumber: cfg.shortcode,
          partyB: cfg.partyB,
          accountNumber: cfg.accountNumber,
          amountUsd,
          amountKes,
          mode: 'daraja_stk',
          status: 'pending',
          mpesaReceiptNumber: '',
          resultDesc: 'SIM STK prompt sent to handset. Waiting for M-Pesa PIN.',
          settlementStatus: 'pending',
          redeemed: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        stkSessions.set(session.checkoutRequestId, session);

        res.json({
          initiated: true,
          mode: 'daraja_stk',
          checkoutRequestId: session.checkoutRequestId,
          paybillNumber: cfg.partyB,
          accountNumber: cfg.accountNumber,
          amountUsd,
          amountKes,
          normalizedPhone: `+${normalizedPhone}`,
          message:
            stkData.CustomerMessage ||
            `SIM STK push sent to +${normalizedPhone} for KES ${amountKes.toLocaleString()} -> Paybill ${cfg.partyB} (Acc ${cfg.accountNumber}).`,
        });
        return;
      } catch (err: any) {
        res.status(502).json({
          error: err?.message || 'Unable to initiate Safaricom SIM STK push right now.',
        });
        return;
      }
    }

    // Do NOT silently simulate a real SIM STK push unless explicitly requested as a UI sandbox test
    if (!allowPreviewFallback) {
      res.status(503).json({
        initiated: false,
        requiresDarajaSecrets: true,
        missingKeys: cfg.missingKeys,
        paybillNumber: cfg.partyB,
        accountNumber: cfg.accountNumber,
        amountUsd,
        amountKes,
        normalizedPhone: `+${normalizedPhone}`,
        error: `Live Safaricom SIM STK is not connected yet because ${cfg.missingKeys.join(', ')} are not configured in environment Secrets. Pay via Lipa na M-Pesa Paybill ${cfg.partyB} (Acc ${cfg.accountNumber}) and enter your SMS confirmation code, or add Daraja Secrets for live SIM prompts.`,
      });
      return;
    }

    const checkoutRequestId = `ws_CO_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const session: StkPromptSession = {
      checkoutRequestId,
      merchantRequestId: `SWP_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      plan: planKey,
      normalizedPhone,
      paybillNumber: cfg.shortcode,
      partyB: cfg.partyB,
      accountNumber: cfg.accountNumber,
      amountUsd,
      amountKes,
      mode: 'interactive_prompt',
      status: 'pending',
      mpesaReceiptNumber: '',
      resultDesc: 'UI Sandbox Prompt only (no real M-Pesa SIM transfer without Daraja Secrets).',
      settlementStatus: 'preview_only',
      redeemed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    stkSessions.set(checkoutRequestId, session);

    res.json({
      initiated: true,
      mode: 'interactive_prompt',
      checkoutRequestId,
      paybillNumber: cfg.partyB,
      accountNumber: cfg.accountNumber,
      amountUsd,
      amountKes,
      normalizedPhone: `+${normalizedPhone}`,
      message: `UI Sandbox prompt ready for +${normalizedPhone} — KES ${amountKes.toLocaleString()} (No real funds moved until Daraja API keys are added).`,
    });
  });

  app.post('/api/payments/mpesa-paybill/stk-respond', (req, res) => {
    const checkoutRequestId =
      typeof req.body?.checkoutRequestId === 'string' ? req.body.checkoutRequestId.trim() : '';
    const action = typeof req.body?.action === 'string' ? req.body.action.trim().toLowerCase() : '';
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';

    const session = stkSessions.get(checkoutRequestId);
    if (!session) {
      res.status(404).json({ error: 'M-Pesa prompt session not found or expired.' });
      return;
    }
    if (session.mode !== 'interactive_prompt') {
      res.status(400).json({ error: 'Live Safaricom SIM prompts must be confirmed directly on the user SIM handset.' });
      return;
    }

    if (action === 'cancel') {
      session.status = 'cancelled';
      session.resultDesc = 'Sandbox prompt cancelled by user.';
      session.updatedAt = Date.now();
      res.json({
        checkoutRequestId: session.checkoutRequestId,
        status: session.status,
        resultDesc: session.resultDesc,
      });
      return;
    }

    if (action !== 'confirm') {
      res.status(400).json({ error: 'Unsupported STK response action.' });
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      res.status(400).json({ error: 'Enter a valid 4-digit PIN to complete sandbox test.' });
      return;
    }

    if (session.status !== 'confirmed' || !session.mpesaReceiptNumber) {
      const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
      session.mpesaReceiptNumber = `SBX${randomSuffix}`.slice(0, 10);
      session.status = 'confirmed';
      session.settlementStatus = 'preview_only';
      session.resultDesc = `Sandbox test confirmed (${session.mpesaReceiptNumber}).`;
      session.updatedAt = Date.now();
    }

    res.json({
      checkoutRequestId: session.checkoutRequestId,
      status: session.status,
      mpesaReceiptNumber: session.mpesaReceiptNumber,
      paybillNumber: session.partyB,
      accountNumber: session.accountNumber,
      normalizedPhone: `+${session.normalizedPhone}`,
      amountUsd: session.amountUsd,
      amountKes: session.amountKes,
      settlementStatus: session.settlementStatus,
      resultDesc: session.resultDesc,
    });
  });

  app.get('/api/payments/mpesa-paybill/stk-status/:checkoutRequestId', async (req, res) => {
    const checkoutRequestId = req.params.checkoutRequestId?.trim() || '';
    const session = stkSessions.get(checkoutRequestId);
    if (!session) {
      res.status(404).json({ error: 'STK prompt session not found.' });
      return;
    }

    const cfg = getDarajaConfig(req);
    if (session.mode === 'daraja_stk' && session.status === 'pending' && cfg.liveSimStkConnected) {
      try {
        const accessToken = await fetchDarajaAccessToken();
        const timestamp = formatDarajaTimestamp();
        const password = Buffer.from(
          `${session.paybillNumber}${cfg.passkey}${timestamp}`
        ).toString('base64');

        const queryRes = await fetchWithTimeout(`${cfg.baseUrl}/mpesa/stkpushquery/v1/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: session.paybillNumber,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: session.checkoutRequestId,
          }),
        });

        if (queryRes.ok) {
          const queryJson = await safeReadJson<{
            ResultCode?: string | number;
            ResultDesc?: string;
          }>(queryRes);
          const resultCode = String(queryJson.ResultCode ?? '');
          if (resultCode === '0') {
            session.status = 'confirmed';
            session.mpesaReceiptNumber =
              session.mpesaReceiptNumber ||
              `MP${session.checkoutRequestId.replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase()}`;
            session.resultDesc = mapDarajaResultMessage('0', queryJson.ResultDesc);
            await triggerAutoB2BTransferIfNeeded(session, req);
            session.updatedAt = Date.now();
          } else if (resultCode === '1032') {
            session.status = 'cancelled';
            session.resultDesc = mapDarajaResultMessage(resultCode, queryJson.ResultDesc);
            session.updatedAt = Date.now();
          } else if (resultCode && resultCode !== '4999') {
            session.status = 'failed';
            session.resultDesc = mapDarajaResultMessage(resultCode, queryJson.ResultDesc);
            session.updatedAt = Date.now();
          }
        }
      } catch {
        // Keep pending if transient Safaricom query error occurs while polling
      }
    }

    res.json({
      checkoutRequestId: session.checkoutRequestId,
      mode: session.mode,
      status: session.status,
      plan: session.plan,
      paybillNumber: session.partyB,
      accountNumber: session.accountNumber,
      normalizedPhone: `+${session.normalizedPhone}`,
      amountUsd: session.amountUsd,
      amountKes: session.amountKes,
      mpesaReceiptNumber: session.mpesaReceiptNumber,
      settlementStatus: session.settlementStatus,
      b2bConversationId: session.b2bConversationId,
      resultDesc: session.resultDesc,
    });
  });

  app.post(['/api/payments/mpesa-callback', '/api/mpesa/callback'], async (req, res) => {
    const stkCallback = req.body?.Body?.stkCallback;
    const checkoutRequestId =
      typeof stkCallback?.CheckoutRequestID === 'string' ? stkCallback.CheckoutRequestID : '';

    if (checkoutRequestId && stkSessions.has(checkoutRequestId)) {
      const session = stkSessions.get(checkoutRequestId)!;
      const resultCode = String(stkCallback?.ResultCode ?? '');
      const items = Array.isArray(stkCallback?.CallbackMetadata?.Item)
        ? (stkCallback.CallbackMetadata.Item as Array<{ Name?: string; Value?: unknown }>)
        : [];
      const receiptItem = items.find((i) => i?.Name === 'MpesaReceiptNumber');
      const amountItem = items.find((i) => i?.Name === 'Amount');
      const receipt =
        typeof receiptItem?.Value === 'string' ? receiptItem.Value.trim().toUpperCase() : '';
      const paidAmount = Number(amountItem?.Value ?? 0);

      if (resultCode === '0') {
        if (paidAmount > 0 && paidAmount < session.amountKes) {
          session.status = 'failed';
          session.resultDesc = `Received KES ${paidAmount} which is less than required KES ${session.amountKes}.`;
        } else {
          session.status = 'confirmed';
          session.mpesaReceiptNumber =
            receipt || session.mpesaReceiptNumber || `MP${Date.now().toString().slice(-8)}`;
          session.resultDesc = mapDarajaResultMessage('0', String(stkCallback?.ResultDesc || ''));
          await triggerAutoB2BTransferIfNeeded(session, req);
        }
      } else if (resultCode === '1032') {
        session.status = 'cancelled';
        session.resultDesc = mapDarajaResultMessage(resultCode, String(stkCallback?.ResultDesc || ''));
      } else {
        session.status = 'failed';
        session.resultDesc = mapDarajaResultMessage(resultCode, String(stkCallback?.ResultDesc || ''));
      }
      session.updatedAt = Date.now();
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  });

  app.post('/api/payments/mpesa-b2b-callback', (_req, res) => {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  });

  app.post('/api/payments/mpesa-paybill/verify', async (req, res) => {
    const rawPlan = typeof req.body?.plan === 'string' ? req.body.plan.trim().toLowerCase() : '';
    const method = typeof req.body?.method === 'string' ? req.body.method.trim() : '';
    const paybillNumber = typeof req.body?.paybillNumber === 'string' ? req.body.paybillNumber.trim() : '';
    const accountNumber = typeof req.body?.accountNumber === 'string' ? req.body.accountNumber.trim() : '';
    const payerPhone = typeof req.body?.payerPhone === 'string' ? req.body.payerPhone.trim() : '';
    const mpesaCodeRaw = typeof req.body?.mpesaCode === 'string' ? req.body.mpesaCode.trim() : '';
    const referenceRaw = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    const checkoutRequestId =
      typeof req.body?.checkoutRequestId === 'string' ? req.body.checkoutRequestId.trim() : '';

    if (rawPlan !== 'ad_slot' && rawPlan !== 'basic' && rawPlan !== 'pro' && rawPlan !== 'premium') {
      res.status(400).json({ verified: false, error: 'Invalid payment plan or ad slot.' });
      return;
    }
    const planKey = rawPlan as 'ad_slot' | 'basic' | 'pro' | 'premium';

    const amountUsd = PLAN_USD[planKey];
    const amountKes = amountUsd * KES_RATE;

    if (method === 'M-Pesa') {
      if (paybillNumber !== TARGET_PAYBILL || accountNumber !== TARGET_ACCOUNT) {
        res.status(400).json({
          verified: false,
          error: `Payments must target Paybill ${TARGET_PAYBILL} and Account ${TARGET_ACCOUNT}.`,
        });
        return;
      }

      if (checkoutRequestId) {
        const session = stkSessions.get(checkoutRequestId);
        if (!session) {
          res.status(404).json({ verified: false, error: 'STK Push session expired or invalid.' });
          return;
        }
        if (session.status !== 'confirmed' || !session.mpesaReceiptNumber) {
          res.status(400).json({
            verified: false,
            error: 'M-Pesa prompt is still pending PIN confirmation.',
          });
          return;
        }
        if (session.redeemed || redeemedMpesaCodes.has(session.mpesaReceiptNumber)) {
          res.status(409).json({
            verified: false,
            error: `Receipt ${session.mpesaReceiptNumber} has already been applied.`,
          });
          return;
        }
        session.redeemed = true;
        redeemedMpesaCodes.add(session.mpesaReceiptNumber);
        res.json({
          verified: true,
          paybillNumber: session.paybillNumber,
          accountNumber: session.accountNumber,
          normalizedPhone: `+${session.normalizedPhone}`,
          normalizedCode: session.mpesaReceiptNumber,
          amountUsd: session.amountUsd,
          amountKes: session.amountKes,
          verifiedAt: new Date().toISOString(),
        });
        return;
      }

      const normalizedPhone = normalizeKenyanPhone(payerPhone);
      if (!normalizedPhone) {
        res.status(400).json({
          verified: false,
          error: 'Enter a valid Kenyan M-Pesa mobile number (07XX XXX XXX or +2547XX XXX XXX).',
        });
        return;
      }

      const normalizedCode = mpesaCodeRaw.replace(/\s+/g, '').toUpperCase();
      if (!/^[A-Z0-9]{8,14}$/.test(normalizedCode) || !/[A-Z]/.test(normalizedCode) || !/\d/.test(normalizedCode)) {
        res.status(400).json({
          verified: false,
          error: 'Enter a valid M-Pesa transaction confirmation code (8–14 letters & digits, e.g. UA82XYZ910).',
        });
        return;
      }

      if (redeemedMpesaCodes.has(normalizedCode)) {
        res.status(409).json({
          verified: false,
          error: `M-Pesa code ${normalizedCode} has already been submitted.`,
        });
        return;
      }

      redeemedMpesaCodes.add(normalizedCode);
      res.json({
        verified: true,
        paybillNumber: TARGET_PAYBILL,
        accountNumber: TARGET_ACCOUNT,
        normalizedPhone: `+${normalizedPhone}`,
        normalizedCode,
        amountUsd,
        amountKes,
        verifiedAt: new Date().toISOString(),
      });
      return;
    }

    const stripeSessionId =
      typeof req.body?.stripeSessionId === 'string' ? req.body.stripeSessionId.trim() : '';
    const cardSandboxToken =
      typeof req.body?.cardSandboxToken === 'string' ? req.body.cardSandboxToken.trim() : '';

    if (method === 'Card' || method === 'Stripe') {
      if (stripeSessionId) {
        if (redeemedCardRefs.has(stripeSessionId)) {
          res.status(409).json({
            verified: false,
            error: 'This Stripe checkout session has already been applied.',
          });
          return;
        }
        const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
        if (!stripeKey) {
          res.status(503).json({
            verified: false,
            error: 'STRIPE_SECRET_KEY is not configured to verify live Stripe sessions.',
          });
          return;
        }
        try {
          const sRes = await fetchWithTimeout(
            `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(stripeSessionId)}`,
            { headers: { Authorization: `Bearer ${stripeKey}` } }
          );
          const sJson = await safeReadJson<{
            id?: string;
            payment_status?: string;
            payment_intent?: string;
            amount_total?: number;
            error?: { message?: string };
          }>(sRes);
          if (!sRes.ok || sJson.payment_status !== 'paid') {
            res.status(400).json({
              verified: false,
              error: sJson.error?.message || 'Stripe card payment is not marked paid yet.',
            });
            return;
          }
          const paidCents = Number(sJson.amount_total ?? 0);
          if (paidCents > 0 && paidCents < Math.round(amountUsd * 100)) {
            res.status(400).json({
              verified: false,
              error: 'Paid Stripe amount does not match the selected subscription plan.',
            });
            return;
          }
          redeemedCardRefs.add(stripeSessionId);
          const ref = (typeof sJson.payment_intent === 'string' && sJson.payment_intent) || stripeSessionId;
          res.json({
            verified: true,
            paybillNumber: '',
            accountNumber: '',
            normalizedPhone: payerPhone,
            normalizedCode: ref.slice(0, 100),
            amountUsd,
            amountKes,
            verifiedAt: new Date().toISOString(),
          });
          return;
        } catch {
          res.status(502).json({
            verified: false,
            error: 'Unable to reach Stripe to verify checkout session.',
          });
          return;
        }
      }

      if (cardSandboxToken) {
        const sbx = sandboxCardSessions.get(cardSandboxToken);
        if (!sbx) {
          res.status(404).json({
            verified: false,
            error: 'Sandbox card authorization expired or not found.',
          });
          return;
        }
        if (sbx.redeemed) {
          res.status(409).json({
            verified: false,
            error: 'This card authorization has already been used.',
          });
          return;
        }
        sbx.redeemed = true;
        res.json({
          verified: true,
          paybillNumber: '',
          accountNumber: '',
          normalizedPhone: payerPhone,
          normalizedCode: sbx.reference,
          amountUsd,
          amountKes,
          verifiedAt: new Date().toISOString(),
        });
        return;
      }

      if (referenceRaw.length < 6) {
        res.status(400).json({
          verified: false,
          error: 'Complete the card form or enter a valid Card/Stripe transaction reference (6+ characters).',
        });
        return;
      }

      if (redeemedCardRefs.has(referenceRaw)) {
        res.status(409).json({
          verified: false,
          error: `Card reference ${referenceRaw} has already been applied.`,
        });
        return;
      }
      redeemedCardRefs.add(referenceRaw);
      res.json({
        verified: true,
        paybillNumber: '',
        accountNumber: '',
        normalizedPhone: payerPhone,
        normalizedCode: referenceRaw.slice(0, 100),
        amountUsd,
        amountKes,
        verifiedAt: new Date().toISOString(),
      });
      return;
    }

    if (referenceRaw.length < 4) {
      res.status(400).json({
        verified: false,
        error: `Provide a valid ${method} transaction or billing reference.`,
      });
      return;
    }

    const normalizedOtherKey = `${method.toLowerCase()}::${referenceRaw.toUpperCase()}`;
    if (redeemedOtherRefs.has(normalizedOtherKey)) {
      res.status(409).json({
        verified: false,
        error: `${method} reference ${referenceRaw} has already been redeemed.`,
      });
      return;
    }
    redeemedOtherRefs.add(normalizedOtherKey);

    res.json({
      verified: true,
      paybillNumber: '',
      accountNumber: '',
      normalizedPhone: payerPhone,
      normalizedCode: referenceRaw.slice(0, 100),
      amountUsd,
      amountKes,
      verifiedAt: new Date().toISOString(),
    });
  });

  // Card / Stripe Payment Gateway Endpoints (Real Stripe Checkout + Luhn-validated Sandbox Testing)

  function luhnCheck(rawDigits: string): boolean {
    if (!/^\d{13,19}$/.test(rawDigits)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = rawDigits.length - 1; i >= 0; i -= 1) {
      let digit = Number(rawDigits[i]);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  function detectCardBrand(digits: string): 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Card' {
    if (/^4/.test(digits)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'Amex';
    if (/^(6011|65)/.test(digits)) return 'Discover';
    return 'Card';
  }

  function isValidCardExpiry(expiry: string): boolean {
    const match = /^(\d{2})\/(\d{2,4})$/.exec(expiry.trim());
    if (!match) return false;
    const month = Number(match[1]);
    let year = Number(match[2]);
    if (month < 1 || month > 12) return false;
    if (match[2].length === 2) year += 2000;
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    return year > currentYear || (year === currentYear && month >= currentMonth);
  }

  app.get('/api/payments/card/gateway-status', (_req, res) => {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    const isLiveKey = stripeKey.startsWith('sk_live_');
    const isTestKey = stripeKey.startsWith('sk_test_');
    res.json({
      liveCardConnected: Boolean(stripeKey),
      provider: 'Stripe',
      mode: isLiveKey ? 'live' : isTestKey ? 'stripe_test' : 'sandbox_only',
      missingKeys: stripeKey ? [] : ['STRIPE_SECRET_KEY'],
    });
  });

  app.post('/api/payments/card/test-connection', async (_req, res) => {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeKey) {
      res.status(400).json({
        connected: false,
        missingKeys: ['STRIPE_SECRET_KEY'],
        error: 'Missing STRIPE_SECRET_KEY in AI Studio Secrets. Add your Stripe secret key to charge real cards.',
      });
      return;
    }
    try {
      const stripeRes = await fetchWithTimeout('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const data = await safeReadJson<{ livemode?: boolean; error?: { message?: string } }>(stripeRes);
      if (!stripeRes.ok) {
        res.status(502).json({
          connected: false,
          error: data.error?.message || `Stripe returned status ${stripeRes.status}.`,
        });
        return;
      }
      res.json({
        connected: true,
        livemode: Boolean(data.livemode),
        message: `Connected to Stripe (${data.livemode ? 'Live Production' : 'Stripe Test Mode'}). Ready for Visa, Mastercard & Amex checkout.`,
      });
    } catch {
      res.status(502).json({
        connected: false,
        error: 'Network error reaching Stripe API.',
      });
    }
  });

  const PLATFORM_COMMISSION_RATE = 0.1;
  const roundUsdCents = (val: number) => {
    if (!Number.isFinite(val)) return 0;
    return Math.round((val + Number.EPSILON) * 100) / 100;
  };
  const calculateOrderCommissionSplit = (grossAmount: number) => {
    const gross = Math.max(0, roundUsdCents(grossAmount));
    const platformFeeAmount = roundUsdCents(gross * PLATFORM_COMMISSION_RATE);
    const sellerNetAmount = roundUsdCents(gross - platformFeeAmount);
    return {
      grossAmount: gross,
      platformFeeRate: PLATFORM_COMMISSION_RATE,
      platformFeeRatePercent: 10,
      platformFeeAmount,
      sellerNetAmount,
    };
  };

  app.post('/api/payments/card/create-checkout-session', async (req, res) => {
    const purpose =
      req.body?.purpose === 'marketplace'
        ? 'marketplace'
        : req.body?.purpose === 'ad_slot'
          ? 'ad_slot'
          : 'subscription';
    const rawPlan = typeof req.body?.plan === 'string' ? req.body.plan.trim().toLowerCase() : '';
    const customerEmail = typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';

    let amountUsd = Number(req.body?.amountUsd ?? 0);
    let productTitle = description || 'SwayPalm Marketplace Order';
    if (purpose === 'ad_slot') {
      amountUsd = PLAN_USD.ad_slot;
      productTitle = description || 'SwayPalm26 Paid Ad Slot ($12)';
    } else if (purpose === 'subscription') {
      if (rawPlan !== 'basic' && rawPlan !== 'pro' && rawPlan !== 'premium') {
        res.status(400).json({ error: 'Select Basic, Pro, or Premium plan.' });
        return;
      }
      const planKey = rawPlan as 'basic' | 'pro' | 'premium';
      amountUsd = PLAN_USD[planKey];
      productTitle = `SwayPalm26 ${planKey.toUpperCase()} Subscription`;
    } else if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      res.status(400).json({ error: 'Invalid marketplace payment amount.' });
      return;
    }

    const commissionSplit =
      purpose === 'marketplace' ? calculateOrderCommissionSplit(amountUsd) : null;

    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeKey) {
      res.status(503).json({
        initiated: false,
        requiresStripeSecret: true,
        missingKeys: ['STRIPE_SECRET_KEY'],
        amountUsd,
        ...(commissionSplit
          ? {
              platformFeeRate: commissionSplit.platformFeeRate,
              platformFeeUsd: commissionSplit.platformFeeAmount,
              sellerNetUsd: commissionSplit.sellerNetAmount,
            }
          : {}),
        error: 'Live Stripe card gateway is not connected yet because STRIPE_SECRET_KEY is missing in AI Studio Secrets.',
      });
      return;
    }

    try {
      const origin = resolveSeoSiteUrl(req);
      const successUrl = `${origin}/swaypalm26?card_checkout=success&session_id={CHECKOUT_SESSION_ID}&purpose=${purpose}&plan=${encodeURIComponent(rawPlan)}`;
      const cancelUrl = `${origin}/swaypalm26?card_checkout=cancelled&purpose=${purpose}`;

      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('payment_method_types[0]', 'card');
      params.append('line_items[0][price_data][currency]', 'usd');
      params.append('line_items[0][price_data][product_data][name]', productTitle.slice(0, 120));
      params.append('line_items[0][price_data][unit_amount]', String(Math.round(amountUsd * 100)));
      params.append('line_items[0][quantity]', '1');
      params.append('success_url', successUrl);
      params.append('cancel_url', cancelUrl);
      if (commissionSplit) {
        params.append('metadata[purpose]', 'marketplace');
        params.append('metadata[platform_fee_rate]', String(commissionSplit.platformFeeRate));
        params.append('metadata[platform_fee_usd]', commissionSplit.platformFeeAmount.toFixed(2));
        params.append('metadata[seller_net_usd]', commissionSplit.sellerNetAmount.toFixed(2));
        params.append('metadata[settlement_paybill]', TARGET_PAYBILL);
        params.append('metadata[settlement_account]', TARGET_ACCOUNT);
      }
      if (customerEmail && customerEmail.includes('@')) {
        params.append('customer_email', customerEmail);
      }

      const stripeRes = await fetchWithTimeout('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const stripeData = await safeReadJson<{
        id?: string;
        url?: string;
        error?: { message?: string };
      }>(stripeRes);
      if (!stripeRes.ok || !stripeData.url || !stripeData.id) {
        throw new Error(stripeData.error?.message || 'Failed to create Stripe Checkout session.');
      }
      res.json({
        initiated: true,
        mode: 'stripe_checkout',
        sessionId: stripeData.id,
        checkoutUrl: stripeData.url,
        amountUsd,
        ...(commissionSplit
          ? {
              platformFeeRate: commissionSplit.platformFeeRate,
              platformFeeUsd: commissionSplit.platformFeeAmount,
              sellerNetUsd: commissionSplit.sellerNetAmount,
            }
          : {}),
      });
    } catch (err: any) {
      res.status(502).json({
        initiated: false,
        error: err?.message || 'Unable to start Stripe card checkout.',
      });
    }
  });

  app.get('/api/payments/card/verify-session/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId?.trim() || '';
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeKey) {
      res.status(503).json({ verified: false, error: 'STRIPE_SECRET_KEY is not configured.' });
      return;
    }
    if (!sessionId) {
      res.status(400).json({ verified: false, error: 'Missing Stripe sessionId.' });
      return;
    }
    try {
      const sRes = await fetchWithTimeout(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const sJson = await safeReadJson<{
        id?: string;
        payment_status?: string;
        payment_intent?: string;
        amount_total?: number;
        error?: { message?: string };
      }>(sRes);
      if (!sRes.ok) {
        res.status(400).json({ verified: false, error: sJson.error?.message || 'Invalid Stripe session.' });
        return;
      }
      const paid = sJson.payment_status === 'paid';
      res.json({
        verified: paid,
        sessionId: sJson.id,
        reference: (typeof sJson.payment_intent === 'string' && sJson.payment_intent) || sJson.id,
        amountUsd: Number(sJson.amount_total ?? 0) / 100,
        error: paid ? undefined : 'Card payment was not completed.',
      });
    } catch {
      res.status(502).json({ verified: false, error: 'Unable to verify Stripe session.' });
    }
  });

  app.post('/api/payments/card/sandbox-authorize', (req, res) => {
    const cardholderName = typeof req.body?.cardholderName === 'string' ? req.body.cardholderName.trim() : '';
    const cardNumberRaw = typeof req.body?.cardNumber === 'string' ? req.body.cardNumber.replace(/\D/g, '') : '';
    const expiry = typeof req.body?.expiry === 'string' ? req.body.expiry.trim() : '';
    const cvc = typeof req.body?.cvc === 'string' ? req.body.cvc.replace(/\D/g, '') : '';
    const amountUsd = Number(req.body?.amountUsd ?? 0);

    if (cardholderName.length < 2) {
      res.status(400).json({ error: 'Enter the cardholder full name.' });
      return;
    }
    if (!luhnCheck(cardNumberRaw)) {
      res.status(400).json({ error: 'Enter a valid Visa, Mastercard, or Amex card number (failed Luhn check).' });
      return;
    }
    if (!isValidCardExpiry(expiry)) {
      res.status(400).json({ error: 'Enter a valid future expiration date (MM/YY).' });
      return;
    }
    const brand = detectCardBrand(cardNumberRaw);
    const expectedCvcLen = brand === 'Amex' ? 4 : 3;
    if (cvc.length < 3 || cvc.length > 4 || (brand === 'Amex' && cvc.length !== 4)) {
      res.status(400).json({ error: `Enter a valid ${expectedCvcLen}-digit security code (CVC).` });
      return;
    }
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      res.status(400).json({ error: 'Invalid payment amount.' });
      return;
    }

    // Never store raw card number or CVC; only tokenize brand + last 4 digits for sandbox confirmation
    const last4 = cardNumberRaw.slice(-4);
    const token = `sbx_tok_${crypto.randomBytes(6).toString('hex')}`;
    const reference = `SBX_${brand.toUpperCase()}_${last4}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    sandboxCardSessions.set(token, {
      token,
      reference,
      brand,
      last4,
      amountUsd,
      redeemed: false,
      createdAt: Date.now(),
    });

    res.json({
      authorized: true,
      mode: 'sandbox_card',
      cardSandboxToken: token,
      reference,
      brand,
      last4,
      amountUsd,
      message: `Sandbox ${brand} •••• ${last4} authorized ($${amountUsd.toFixed(2)} — test mode, no real funds charged).`,
    });
  });

  app.post('/api/orders/calculate-commission', (req, res) => {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : null;
    let grossAmount = Number(req.body?.totalAmount ?? 0);

    if (rawItems && rawItems.length > 0) {
      grossAmount = rawItems.reduce((sum: number, item: any) => {
        const price = Number(item?.price ?? 0);
        const qty = Number(item?.quantity ?? 0);
        if (!Number.isFinite(price) || !Number.isFinite(qty) || price <= 0 || qty <= 0) {
          return sum;
        }
        return sum + price * qty;
      }, 0);
    }

    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      res.status(400).json({ error: 'Provide a positive sale totalAmount or valid line items.' });
      return;
    }

    const split = calculateOrderCommissionSplit(grossAmount);
    res.json({
      ...split,
      settlementPaybill: TARGET_PAYBILL,
      settlementAccount: TARGET_ACCOUNT,
      feeStatus: 'deducted',
    });
  });

  const escapeHtmlAttr = (val: string) =>
    val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const injectSeoMetadata = (html: string, req: express.Request): string => {
    const activeOrigin = resolveSeoSiteUrl(req);
    const normalizedPath = (req.path || '/').replace(/\/+$/, '') || '/';
    const logicalRoutePath =
      normalizedPath === '/swaypalm26'
        ? '/'
        : normalizedPath.startsWith('/swaypalm26/')
          ? normalizedPath.slice('/swaypalm26'.length)
          : normalizedPath;
    const routeMeta = ROUTE_SEO_META[logicalRoutePath] || ROUTE_SEO_META['/'];
    const canonicalRouteUrl =
      normalizedPath === '/' ? `${activeOrigin}/swaypalm26` : `${activeOrigin}${normalizedPath}`;

    let updated = html
      .replace(new RegExp(DEFAULT_PUBLISHED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), activeOrigin);

    const escapedTitle = escapeHtmlAttr(routeMeta.title);
    const escapedDesc = escapeHtmlAttr(routeMeta.description);
    const escapedCanonical = escapeHtmlAttr(canonicalRouteUrl);

    updated = updated
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`)
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${escapedDesc}" />`
      )
      .replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapedCanonical}" />`
      )
      .replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:url" content="${escapedCanonical}" />`
      )
      .replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:title" content="${escapedTitle}" />`
      )
      .replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:description" content="${escapedDesc}" />`
      )
      .replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:title" content="${escapedTitle}" />`
      )
      .replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:description" content="${escapedDesc}" />`
      );

    if (gscTokenOrFile && !gscTokenOrFile.endsWith('.html')) {
      const safeToken = gscTokenOrFile.replace(/[^a-zA-Z0-9_-]/g, '');
      if (safeToken) {
        updated = updated.replace(
          '</head>',
          `  <meta name="google-site-verification" content="${safeToken}" />\n  </head>`
        );
      }
    }
    return updated;
  };

  const isProd = process.env.NODE_ENV === 'production';

  app.get(['/manifest.json', '/manifest.webmanifest'], (_req, res) => {
    const prodManifest = path.resolve(__dirname, 'dist', 'manifest.json');
    const pubManifest = path.resolve(__dirname, 'public', 'manifest.json');
    const targetPath = isProd && fs.existsSync(prodManifest) ? prodManifest : pubManifest;
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    if (fs.existsSync(targetPath)) {
      res.sendFile(targetPath);
      return;
    }
    res.json({
      id: '/',
      name: 'SwayPalm',
      short_name: 'SwayPalm',
      description:
        'Connect with verified global businesses, showcase products, trade in the B2B marketplace, chat in real time, and launch $12 sponsored ads.',
      theme_color: '#0B3D2E',
      background_color: '#0B3D2E',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      prefer_related_applications: false,
      orientation: 'portrait-primary',
      start_url: '/',
      scope: '/',
      categories: ['business', 'social', 'shopping'],
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    });
  });

  app.get('/sw.js', (_req, res) => {
    const distSwPath = path.resolve(__dirname, 'dist', 'sw.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (fs.existsSync(distSwPath)) {
      res.sendFile(distSwPath);
      return;
    }
    res.send(`self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', () => {});
`);
  });

  app.get(/^\/workbox-[a-zA-Z0-9_-]+\.js$/, (req, res, next) => {
    const fileName = path.basename(req.path);
    const workboxPath = path.resolve(__dirname, 'dist', fileName);
    if (fs.existsSync(workboxPath)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.sendFile(workboxPath);
      return;
    }
    next();
  });

  app.get(['/pwa-192x192.png', '/pwa-512x512.png', '/pwa-maskable-512x512.png', '/apple-touch-icon.png', '/icon.svg', '/favicon.ico', '/swaypalm26-qr.png'], (req, res, next) => {
    const assetName = path.basename(req.path);
    const distAsset = path.resolve(__dirname, 'dist', assetName);
    const pubAsset = path.resolve(__dirname, 'public', assetName);
    const targetAsset = isProd && fs.existsSync(distAsset) ? distAsset : pubAsset;
    if (fs.existsSync(targetAsset)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(targetAsset);
      return;
    }
    next();
  });

  if (!isProd) {

    app.get('/dev-sw.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys().catch(() => []);
    await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    await self.registration.unregister().catch(() => false);
    const clients = await self.clients.matchAll({ type: 'window' }).catch(() => []);
    for (const client of clients) {
      client.navigate(client.url).catch(() => {});
    }
  })());
});
`);
    });

    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(id) {
  return id;
}
export class ErrorOverlay {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(async (req, res, next) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/@') &&
        !req.path.startsWith('/src/') &&
        !req.path.startsWith('/node_modules/') &&
        !path.extname(req.path)
      ) {
        try {
          const rawHtml = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
          const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          res
            .status(200)
            .set({
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Robots-Tag': 'all',
            })
            .end(injectSeoMetadata(transformed, req));
          return;
        } catch (err) {
          next(err);
          return;
        }
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(
        express.static(distDir, {
          index: false,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) {
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
            if (filePath.endsWith('.png') || filePath.endsWith('.svg') || filePath.endsWith('.json')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
            }
          },
        })
      );
      app.get('*', (req, res, next) => {
        if (
          req.path.startsWith('/api') ||
          req.path.startsWith('/assets/') ||
          Boolean(path.extname(req.path))
        ) {
          next();
          return;
        }
        const rawHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
        res
          .status(200)
          .set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Robots-Tag': 'all',
          })
          .end(injectSeoMetadata(rawHtml, req));
      });
    }
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (req.path.startsWith('/api')) {
      res.status(err?.status || 500).json({
        error: err?.message || 'Unexpected server error while processing your request.',
      });
      return;
    }
    next(err);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SwayPalm server running at http://0.0.0.0:${PORT}`);
  });
}

void startServer();
