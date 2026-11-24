import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  Loader2,
  Lock,
  Megaphone,
  Play,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { resizeImageFileToDataUrl } from '../data/sampleCatalog';
import { safeFetchJson } from '../lib/network';
import { normalizeExternalUrl } from '../lib/urls';
import {
  AD_PLAY_PRICE_KES,
  AD_PLAY_PRICE_USD,
  AdvertCampaign,
  PAYBILL_CONFIG,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../types';
import { CardPaymentForm } from './CardPaymentForm';
import { MediaArtwork } from './MediaArtwork';

const AD_THEMES = [
  { id: 'hero_trade', label: 'Global Trade Spotlight' },
  { id: 'hair_luxury', label: 'Beauty & Hair Luxury' },
  { id: 'diani_resort', label: 'Hospitality & Resorts' },
  { id: 'fashion_atelier', label: 'Fashion & Apparel' },
  { id: 'electronics_hub', label: 'Electronics & Tech' },
  { id: 'coffee_export', label: 'Coffee & Agri-Exports' },
  { id: 'tours_safari', label: 'Tours & Travel' },
  { id: 'real_estate', label: 'Real Estate & Property' },
  { id: 'health_wellness', label: 'Health & Wellness' },
  { id: 'services_logistics', label: 'Logistics & Services' },
];

interface PaidAdComposerProps {
  onSuccess?: (advert: AdvertCampaign) => void;
  compact?: boolean;
}

export const PaidAdComposer: React.FC<PaidAdComposerProps> = ({
  onSuccess,
  compact = false,
}) => {
  const {
    firebaseUser,
    userProfile,
    myBusiness,
    createPaidAdvert,
    setActivePage,
    setAuthMode,
    setShowAuthModal,
    notifyToast,
  } = useSwayPalm();

  const isMember = Boolean(firebaseUser && myBusiness);
  const needsEmailVerify = Boolean(firebaseUser && !firebaseUser.emailVerified);

  const [advertiserName, setAdvertiserName] = useState(
    myBusiness?.name || userProfile?.displayName || ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetRegion, setTargetRegion] = useState(
    myBusiness ? `${myBusiness.city}, ${myBusiness.country}` : 'Global'
  );
  const [ctaLabel, setCtaLabel] = useState('Visit Offer');
  const [ctaUrl, setCtaUrl] = useState('');
  const [mediaDataUrl, setMediaDataUrl] = useState<string | undefined>(undefined);
  const [mediaTheme, setMediaTheme] = useState<string>(myBusiness?.coverTheme || 'hero_trade');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('M-Pesa');
  const [mpesaFlow, setMpesaFlow] = useState<'stk_prompt' | 'manual_code'>('stk_prompt');
  const [payerPhone, setPayerPhone] = useState(
    userProfile?.phone || myBusiness?.whatsapp || ''
  );
  const [mpesaCode, setMpesaCode] = useState('');
  const [reference, setReference] = useState('');
  const [paying, setPaying] = useState(false);
  const [requestingStk, setRequestingStk] = useState(false);
  const [stkSession, setStkSession] = useState<{
    checkoutRequestId: string;
    mode: 'daraja_stk' | 'interactive_prompt';
    status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
    normalizedPhone: string;
    amountKes: number;
    mpesaReceiptNumber?: string;
    message: string;
  } | null>(null);
  const [stkPin, setStkPin] = useState('');
  const [confirmingStkPin, setConfirmingStkPin] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [requiresDarajaSecrets, setRequiresDarajaSecrets] = useState<string[] | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<{
    liveSimStkConnected: boolean;
    env: 'production' | 'sandbox';
    partyB: string;
    accountNumber: string;
    missingKeys: string[];
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<'paybill' | 'account' | null>(null);

  useEffect(() => {
    if (myBusiness?.name && !advertiserName) {
      setAdvertiserName(myBusiness.name);
    }
    if ((userProfile?.phone || myBusiness?.whatsapp) && !payerPhone) {
      setPayerPhone(userProfile?.phone || myBusiness?.whatsapp || '');
    }
  }, [myBusiness?.name, myBusiness?.whatsapp, userProfile?.phone]);

  useEffect(() => {
    let active = true;
    void safeFetchJson<{
      liveSimStkConnected: boolean;
      env: 'production' | 'sandbox';
      partyB: string;
      accountNumber: string;
      missingKeys: string[];
    }>('/api/payments/mpesa-paybill/gateway-status', { reportErrors: false }).then((res) => {
      if (active && res.ok && res.data) {
        setGatewayStatus(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 880);
      setMediaDataUrl(dataUrl);
    } catch {
      notifyToast('Could not read ad image file.', 'error');
    }
  };

  const handleCopyPaybill = async (key: 'paybill' | 'account', text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const validateAdDetails = (): boolean => {
    if (!advertiserName.trim()) {
      setCheckoutError('Enter your name or brand name to display on the ad.');
      return false;
    }
    if (title.trim().length < 2) {
      setCheckoutError('Enter an ad headline (at least 2 characters).');
      return false;
    }
    if (!targetRegion.trim()) {
      setCheckoutError('Enter a target region (e.g. Kenya, East Africa, Global).');
      return false;
    }
    if (ctaUrl.trim() && !normalizeExternalUrl(ctaUrl)) {
      setCheckoutError('Enter a valid destination website URL (e.g. https://yourstore.com).');
      return false;
    }
    return true;
  };

  const resetCreativeAndCheckout = () => {
    setTitle('');
    setDescription('');
    setCtaUrl('');
    setMediaDataUrl(undefined);
    setMpesaCode('');
    setReference('');
    setStkSession(null);
    setStkPin('');
    setCheckoutError(null);
  };

  const publishAfterPayment = async (
    method: PaymentMethod,
    paymentRef: string,
    extra?: {
      paybillNumber?: string;
      accountNumber?: string;
      payerPhone?: string;
      amountKes?: number;
      mpesaCode?: string;
      checkoutRequestId?: string;
      cardSandboxToken?: string;
    }
  ) => {
    setPaying(true);
    try {
      const normalizedCta = ctaUrl.trim() ? normalizeExternalUrl(ctaUrl) || undefined : undefined;
      const created = await createPaidAdvert({
        advertiserName: advertiserName.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        targetRegion: targetRegion.trim(),
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: normalizedCta,
        mediaDataUrl,
        mediaTheme,
        method,
        reference: paymentRef,
        ...extra,
      });

      if (created) {
        resetCreativeAndCheckout();
        onSuccess?.(created);
        setActivePage('advertise');
      } else {
        setCheckoutError('Payment verification or publishing could not complete. Please verify your details.');
      }
    } finally {
      setPaying(false);
    }
  };

  const checkStkStatusOnce = async () => {
    if (!stkSession) return;
    const res = await safeFetchJson<{
      status?: 'pending' | 'confirmed' | 'cancelled' | 'failed';
      mpesaReceiptNumber?: string;
      resultDesc?: string;
      normalizedPhone?: string;
      amountKes?: number;
    }>(
      `/api/payments/mpesa-paybill/stk-status/${encodeURIComponent(stkSession.checkoutRequestId)}`,
      { reportErrors: false, retries: 0 }
    );
    if (!res.ok || !res.data) return;
    const data = res.data;
    if (data.status === 'confirmed' && data.mpesaReceiptNumber) {
      setStkSession((prev) =>
        prev
          ? {
              ...prev,
              status: 'confirmed',
              mpesaReceiptNumber: data.mpesaReceiptNumber,
              message: data.resultDesc || 'M-Pesa payment confirmed!',
            }
          : null
      );
      await publishAfterPayment('M-Pesa', data.mpesaReceiptNumber, {
        paybillNumber: PAYBILL_CONFIG.paybillNumber,
        accountNumber: PAYBILL_CONFIG.accountNumber,
        payerPhone: data.normalizedPhone || stkSession.normalizedPhone,
        amountKes: data.amountKes || stkSession.amountKes,
        mpesaCode: data.mpesaReceiptNumber,
        checkoutRequestId: stkSession.checkoutRequestId,
      });
    } else if (data.status === 'cancelled' || data.status === 'failed') {
      setStkSession((prev) =>
        prev
          ? {
              ...prev,
              status: data.status!,
              message: data.resultDesc || 'M-Pesa prompt did not complete.',
            }
          : null
      );
      setCheckoutError(data.resultDesc || 'M-Pesa prompt was cancelled or failed.');
    }
  };

  useEffect(() => {
    if (!stkSession || stkSession.mode !== 'daraja_stk' || stkSession.status !== 'pending') {
      return;
    }
    const timer = window.setInterval(() => {
      void checkStkStatusOnce();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [stkSession?.checkoutRequestId, stkSession?.mode, stkSession?.status]);

  const handleSendStkPrompt = async (allowPreviewFallback = false) => {
    setCheckoutError(null);
    if (!validateAdDetails()) return;
    setRequiresDarajaSecrets(null);
    setStkSession(null);
    setStkPin('');
    setRequestingStk(true);
    try {
      const res = await safeFetchJson<{
        initiated?: boolean;
        requiresDarajaSecrets?: boolean;
        missingKeys?: string[];
        mode?: 'daraja_stk' | 'interactive_prompt';
        checkoutRequestId?: string;
        normalizedPhone?: string;
        amountKes?: number;
        message?: string;
        error?: string;
      }>('/api/payments/mpesa-paybill/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'ad_slot',
          phone: payerPhone,
          businessName: advertiserName.trim() || 'Guest Ad',
          allowPreviewFallback,
        }),
      });
      const json = res.data;
      if (res.status === 503 && json?.requiresDarajaSecrets) {
        setRequiresDarajaSecrets(
          json.missingKeys && json.missingKeys.length > 0
            ? json.missingKeys
            : ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY']
        );
        return;
      }
      if (!res.ok || !json?.initiated || !json.checkoutRequestId) {
        setCheckoutError(
          res.error || json?.error || 'Could not initiate M-Pesa SIM STK prompt. Check the phone number.'
        );
        return;
      }
      setStkSession({
        checkoutRequestId: json.checkoutRequestId,
        mode: json.mode || 'daraja_stk',
        status: 'pending',
        normalizedPhone: json.normalizedPhone || payerPhone.trim(),
        amountKes: json.amountKes || AD_PLAY_PRICE_KES,
        message:
          json.message ||
          `SIM STK prompt sent for Paybill ${PAYBILL_CONFIG.paybillNumber} · Acc ${PAYBILL_CONFIG.accountNumber}.`,
      });
      notifyToast(
        json.mode === 'daraja_stk'
          ? 'Real SIM STK prompt sent! Check your phone to enter your M-Pesa PIN ($12 / KES 1,560).'
          : 'UI Sandbox test prompt opened (no real funds moved).',
        json.mode === 'daraja_stk' ? 'success' : 'info'
      );
    } finally {
      setRequestingStk(false);
    }
  };

  const handleRespondToInteractivePrompt = async (action: 'confirm' | 'cancel') => {
    if (!stkSession) return;
    setCheckoutError(null);
    if (action === 'confirm' && !/^\d{4}$/.test(stkPin.trim())) {
      setCheckoutError('Enter your 4-digit M-Pesa PIN to confirm this test prompt.');
      return;
    }

    setConfirmingStkPin(true);
    try {
      const res = await safeFetchJson<{
        status?: 'confirmed' | 'cancelled';
        mpesaReceiptNumber?: string;
        normalizedPhone?: string;
        amountKes?: number;
        resultDesc?: string;
      }>('/api/payments/mpesa-paybill/stk-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutRequestId: stkSession.checkoutRequestId,
          action,
          pin: stkPin.trim(),
        }),
      });
      const data = res.data;
      if (!res.ok || !data) {
        setCheckoutError(res.error || 'Could not process M-Pesa prompt response.');
        return;
      }
      if (action === 'cancel' || data.status === 'cancelled') {
        setStkSession(null);
        setStkPin('');
        setCheckoutError('M-Pesa prompt cancelled. You can send a new prompt anytime.');
        return;
      }
      if (data.status === 'confirmed' && data.mpesaReceiptNumber) {
        await publishAfterPayment('M-Pesa', data.mpesaReceiptNumber, {
          paybillNumber: PAYBILL_CONFIG.paybillNumber,
          accountNumber: PAYBILL_CONFIG.accountNumber,
          payerPhone: data.normalizedPhone || stkSession.normalizedPhone,
          amountKes: data.amountKes || stkSession.amountKes,
          mpesaCode: data.mpesaReceiptNumber,
          checkoutRequestId: stkSession.checkoutRequestId,
        });
      }
    } finally {
      setConfirmingStkPin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    if (!validateAdDetails()) return;

    if (paymentMethod === 'M-Pesa') {
      if (mpesaFlow === 'stk_prompt') {
        if (!stkSession) {
          await handleSendStkPrompt();
        } else if (stkSession.mode === 'interactive_prompt' && stkSession.status === 'pending') {
          await handleRespondToInteractivePrompt('confirm');
        } else if (stkSession.mode === 'daraja_stk' && stkSession.status === 'pending') {
          await checkStkStatusOnce();
        }
        return;
      }

      const cleanedPhone = payerPhone.trim();
      const cleanedCode = mpesaCode.replace(/\s+/g, '').toUpperCase();
      if (!cleanedPhone) {
        setCheckoutError('Enter the M-Pesa phone number used to send KES 1,560.');
        return;
      }
      if (!/^[A-Z0-9]{8,14}$/.test(cleanedCode) || !/[A-Z]/.test(cleanedCode) || !/\d/.test(cleanedCode)) {
        setCheckoutError(
          'Enter your valid M-Pesa transaction code (8–14 letters & digits, e.g. UA82XYZ910).'
        );
        return;
      }

      await publishAfterPayment('M-Pesa', cleanedCode, {
        paybillNumber: PAYBILL_CONFIG.paybillNumber,
        accountNumber: PAYBILL_CONFIG.accountNumber,
        payerPhone: cleanedPhone,
        amountKes: AD_PLAY_PRICE_KES,
        mpesaCode: cleanedCode,
      });
      return;
    }

    if (paymentMethod === 'Card' || paymentMethod === 'Stripe') {
      return;
    }

    if (reference.trim().length < 4) {
      setCheckoutError(`Enter your ${paymentMethod} billing reference or transaction ID.`);
      return;
    }

    await publishAfterPayment(paymentMethod, reference.trim(), {
      payerPhone: payerPhone.trim() || undefined,
    });
  };

  const saveDraftForStripeRedirect = () => {
    try {
      window.sessionStorage.setItem(
        'swaypalm_pending_ad_checkout',
        JSON.stringify({
          advertiserName: advertiserName.trim() || myBusiness?.name || 'Sponsored Advertiser',
          title: title.trim() || 'Sponsored Business Spotlight',
          description: description.trim(),
          targetRegion: targetRegion.trim() || 'Global',
          ctaLabel: ctaLabel.trim(),
          ctaUrl: normalizeExternalUrl(ctaUrl) || ctaUrl.trim(),
          mediaDataUrl,
          mediaTheme,
          method: paymentMethod,
        })
      );
    } catch {
      // ignore storage quota
    }
  };

  return (
    <div className={compact ? 'space-y-4' : 'bg-white border border-neutral-200 rounded-xl overflow-hidden'}>
      {!compact && (
        <div className="px-5 py-4 bg-[#111915] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                $12 USD Per Ad Playing · Open to Members &amp; Non-Users
              </span>
            </div>
            <h2 className="font-display font-extrabold text-lg sm:text-xl mt-1">
              Post a Sponsored Ad on SwayPalm
            </h2>
            <p className="text-xs text-white/75 mt-0.5">
              Anyone can advertise without signing in — pay $12 USD (KES {AD_PLAY_PRICE_KES.toLocaleString()}) per ad slot and launch live immediately.
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right bg-white/10 border border-white/15 rounded-lg px-3.5 py-2">
            <p className="font-mono font-extrabold text-xl text-[#D4AF37] tabular-nums">
              ${AD_PLAY_PRICE_USD} USD
            </p>
            <p className="font-mono text-[11px] text-white/80 tabular-nums">
              KES {AD_PLAY_PRICE_KES.toLocaleString()} / ad playing
            </p>
          </div>
        </div>
      )}

      {needsEmailVerify && (
        <div className="m-4 mb-0 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            Your signed-in email is not verified yet. Verify your email to attach this ad to your business profile.
          </span>
          <button
            type="button"
            onClick={() => {
              setAuthMode('email_otp');
              setShowAuthModal(true);
            }}
            className="px-3 py-1 rounded bg-[#0A4D2E] text-white font-semibold"
          >
            Verify Email
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`${compact ? 'space-y-4' : 'p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}`}
      >
        {/* Left: Ad Creative + Live Feed Preview */}
        <div className={compact ? 'space-y-3.5' : 'lg:col-span-6 space-y-4'}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              1. Ad Creative Details
            </p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#0A4D2E]/10 text-[#0A4D2E]">
              {isMember ? `Member: ${myBusiness?.name}` : 'Non-User Guest Mode (No Login Needed)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Advertiser / Brand Name *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={advertiserName}
                onChange={(e) => setAdvertiserName(e.target.value)}
                placeholder="e.g. Kilimani Solar Ltd"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Target Audience / Region *
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
                placeholder="e.g. Nairobi, East Africa, Global"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Ad Headline *
            </label>
            <input
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 25% Off Wholesale Solar Inverters This Week"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Ad Message / Description
            </label>
            <textarea
              rows={2}
              maxLength={600}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product, offer, pricing, or contact info..."
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none focus:outline-none focus:border-[#0A4D2E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Button Text (CTA)
              </label>
              <input
                type="text"
                maxLength={40}
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Visit Offer"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Destination Website or WhatsApp URL
              </label>
              <input
                type="text"
                maxLength={300}
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://yourstore.com"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Visual Theme Backdrop
              </label>
              <select
                value={mediaTheme}
                onChange={(e) => setMediaTheme(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-[#0A4D2E]"
              >
                {AD_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer px-3 py-2 rounded-lg border border-neutral-300 bg-[#F3F5F4] hover:bg-neutral-200 text-xs font-semibold text-neutral-800 inline-flex items-center justify-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#0A4D2E]" />
                {mediaDataUrl ? 'Change Ad Photo' : 'Upload Ad Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {mediaDataUrl && (
                <button
                  type="button"
                  onClick={() => setMediaDataUrl(undefined)}
                  aria-label="Remove uploaded ad photo"
                  className="p-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Live Player Preview */}
          {!compact && (
            <div className="rounded-xl border border-neutral-200 overflow-hidden bg-[#FAFBFB]">
              <div className="px-3.5 py-2 bg-[#111915] text-white flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#D4AF37]">
                  <Play className="w-3 h-3 fill-[#D4AF37]" />
                  Live Feed Player Preview
                </span>
                <span className="text-white/75">Sponsored · $12 Slot</span>
              </div>
              <MediaArtwork
                theme={mediaTheme}
                imageDataUrl={mediaDataUrl}
                title={title.trim() || 'Your Ad Headline Plays Here'}
                subtitle={`${advertiserName.trim() || 'Your Brand'} · ${targetRegion.trim() || 'Global'}`}
                aspectClass="aspect-[16/7]"
              />
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">
                    {title.trim() || 'Your Ad Headline Plays Here'}
                  </p>
                  <p className="text-[11px] text-neutral-600 line-clamp-1 mt-0.5">
                    {description.trim() || `${advertiserName.trim() || 'Advertiser'} — targeting ${targetRegion.trim() || 'Global'}`}
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-[11px] font-semibold shrink-0">
                  {ctaLabel.trim() || 'Visit Offer'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Mandatory $12 Ad Payment Gate */}
        <div className={compact ? 'space-y-3.5 pt-2 border-t border-neutral-200' : 'lg:col-span-6 space-y-4 bg-[#F3F5F4]/70 border border-neutral-200 rounded-xl p-4 sm:p-5'}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              2. Pay ${AD_PLAY_PRICE_USD} USD (KES {AD_PLAY_PRICE_KES.toLocaleString()}) to Play Ad
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A4D2E]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Instant Activation
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setPaymentMethod(method);
                  setCheckoutError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                  paymentMethod === method
                    ? 'bg-[#0A4D2E] text-white border-[#0A4D2E]'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {paymentMethod === 'M-Pesa' ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white border border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setMpesaFlow('stk_prompt');
                    setCheckoutError(null);
                  }}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                    mpesaFlow === 'stk_prompt'
                      ? 'bg-[#0A4D2E] text-white'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  1-Tap M-Pesa Prompt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMpesaFlow('manual_code');
                    setCheckoutError(null);
                  }}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                    mpesaFlow === 'manual_code'
                      ? 'bg-[#0A4D2E] text-white'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  Manual Paybill Code
                </button>
              </div>

              {mpesaFlow === 'stk_prompt' ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#0A4D2E]/25 bg-white p-3 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-[#0A4D2E]">
                        Paybill {PAYBILL_CONFIG.paybillNumber} · Acc {PAYBILL_CONFIG.accountNumber}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Ad Play Fee: ${AD_PLAY_PRICE_USD} USD
                      </p>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-neutral-900 tabular-nums">
                      KES {AD_PLAY_PRICE_KES.toLocaleString()}
                    </span>
                  </div>

                  {gatewayStatus && (
                    <div
                      className={`rounded-lg px-3 py-2 text-[11px] border flex items-start gap-2 ${
                        gatewayStatus.liveSimStkConnected
                          ? 'bg-[#0A4D2E]/10 border-[#0A4D2E]/25 text-[#0A4D2E]'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      {gatewayStatus.liveSimStkConnected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0A4D2E]" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                      )}
                      <span>
                        {gatewayStatus.liveSimStkConnected
                          ? `Live Safaricom SIM STK (${gatewayStatus.env}) ready to settle KES ${AD_PLAY_PRICE_KES.toLocaleString()} to Paybill ${gatewayStatus.partyB}.`
                          : `SIM STK Gateway awaits Daraja secrets (${gatewayStatus.missingKeys.join(', ')}). Use Manual Paybill Code (${gatewayStatus.partyB} / ${gatewayStatus.accountNumber}) or UI Sandbox Test.`}
                      </span>
                    </div>
                  )}

                  {!stkSession ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Safaricom M-Pesa Phone Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                          placeholder="0712 345 678 or +254712345678"
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                        />
                      </div>

                      {requiresDarajaSecrets && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2 text-xs text-amber-950">
                          <p className="font-bold">
                            Real SIM STK requires Daraja Credentials ({requiresDarajaSecrets.join(', ')})
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMpesaFlow('manual_code');
                                setRequiresDarajaSecrets(null);
                                setCheckoutError(null);
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-[#0A4D2E] text-white text-[11px] font-bold"
                            >
                              Use Manual Paybill ({PAYBILL_CONFIG.paybillNumber})
                            </button>
                            <button
                              type="button"
                              disabled={requestingStk || paying}
                              onClick={() => void handleSendStkPrompt(true)}
                              className="py-2 px-3 rounded-lg border border-amber-400 bg-white hover:bg-amber-100 text-amber-950 text-[11px] font-semibold"
                            >
                              UI Sandbox Test ($12)
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={requestingStk || paying}
                        className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                      >
                        {requestingStk ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending SIM Prompt…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-[#D4AF37]" />
                            Pay $12 (KES {AD_PLAY_PRICE_KES.toLocaleString()}) &amp; Play Ad
                          </>
                        )}
                      </button>
                    </>
                  ) : stkSession.mode === 'daraja_stk' ? (
                    <div className="rounded-lg border border-[#0A4D2E]/30 bg-white p-3.5 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <Loader2 className="w-5 h-5 text-[#0A4D2E] animate-spin shrink-0" />
                        <div className="min-w-0 text-xs">
                          <p className="font-bold text-neutral-900">
                            SIM STK Prompt Sent to {stkSession.normalizedPhone}
                          </p>
                          <p className="text-neutral-600 mt-0.5">{stkSession.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={paying}
                          onClick={() => void checkStkStatusOnce()}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {paying ? 'Publishing Ad…' : 'Check Confirmation'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStkSession(null)}
                          className="py-2 px-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700"
                        >
                          Change Phone
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-amber-400 bg-[#111915] text-white p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold uppercase tracking-wider text-[#D4AF37] inline-flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" />
                          UI Sandbox Prompt ($12 Ad Slot)
                        </span>
                        <span className="font-mono text-white/70">{stkSession.normalizedPhone}</span>
                      </div>
                      <p className="text-xs text-white/85">
                        Confirm test payment of <strong>KES {stkSession.amountKes.toLocaleString()}</strong> to publish <strong>{title || 'your ad'}</strong>.
                      </p>
                      <div>
                        <label className="block text-[11px] font-semibold text-white/85 mb-1 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-[#D4AF37]" />
                          Enter 4-Digit Test PIN
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={stkPin}
                          onChange={(e) => setStkPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="••••"
                          className="w-full px-3 py-2 rounded-lg bg-white text-neutral-900 font-mono text-center text-base tracking-[0.5em]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={confirmingStkPin || paying}
                          onClick={() => void handleRespondToInteractivePrompt('cancel')}
                          className="py-2 rounded-lg border border-white/25 text-white text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={confirmingStkPin || paying}
                          className="py-2 rounded-lg bg-[#D4AF37] text-[#111915] text-xs font-bold inline-flex items-center justify-center gap-1.5"
                        >
                          {confirmingStkPin || paying ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Confirm &amp; Play Ad
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#0A4D2E]/25 bg-white p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0A4D2E]">
                        Lipa na M-Pesa Paybill
                      </span>
                      <span className="font-mono font-bold">KES {AD_PLAY_PRICE_KES.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopyPaybill('paybill', PAYBILL_CONFIG.paybillNumber)}
                        className="p-2 rounded border border-neutral-200 text-left flex items-center justify-between hover:bg-[#F3F5F4]"
                      >
                        <div>
                          <p className="text-[10px] text-neutral-500">Paybill</p>
                          <p className="font-mono font-bold text-neutral-900">{PAYBILL_CONFIG.paybillNumber}</p>
                        </div>
                        {copiedKey === 'paybill' ? <Check className="w-3.5 h-3.5 text-[#0A4D2E]" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyPaybill('account', PAYBILL_CONFIG.accountNumber)}
                        className="p-2 rounded border border-neutral-200 text-left flex items-center justify-between hover:bg-[#F3F5F4]"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] text-neutral-500">Account No.</p>
                          <p className="font-mono font-bold text-neutral-900 truncate">{PAYBILL_CONFIG.accountNumber}</p>
                        </div>
                        {copiedKey === 'account' ? <Check className="w-3.5 h-3.5 text-[#0A4D2E]" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      M-Pesa Confirmation Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={14}
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                      placeholder="e.g. UA82XYZ910"
                      className="w-full px-3 py-2 text-sm font-mono uppercase bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-bold disabled:opacity-60"
                  >
                    {paying ? 'Verifying Payment & Launching Ad…' : `Verify $12 Paybill & Play Ad Live`}
                  </button>
                </div>
              )}
            </div>
          ) : paymentMethod === 'Card' || paymentMethod === 'Stripe' ? (
            <div className="bg-white rounded-xl p-3.5 border border-neutral-200">
              <CardPaymentForm
                purpose="ad_slot"
                plan="ad_slot"
                amountUsd={AD_PLAY_PRICE_USD}
                description={`SwayPalm Ad Playing Slot: ${title.trim() || advertiserName.trim() || 'Sponsored Ad'}`}
                methodLabel={paymentMethod}
                defaultName={advertiserName || userProfile?.displayName || ''}
                defaultEmail={firebaseUser?.email || ''}
                submittingExternal={paying}
                onBeforeStripeRedirect={() => {
                  saveDraftForStripeRedirect();
                }}
                onAuthorized={async (result) => {
                  setCheckoutError(null);
                  if (!validateAdDetails()) return;
                  await publishAfterPayment(result.method, result.reference, {
                    cardSandboxToken: result.cardSandboxToken,
                  });
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {paymentMethod === 'Airtel Money'
                    ? 'Airtel Money Phone / Transaction Reference'
                    : `${paymentMethod} Transaction Reference`}
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Enter transaction ID or reference"
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>
              <button
                type="submit"
                disabled={paying}
                className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-bold disabled:opacity-60"
              >
                {paying
                  ? 'Verifying $12 Payment…'
                  : `Pay $${AD_PLAY_PRICE_USD} via ${paymentMethod} & Play Ad`}
              </button>
            </div>
          )}

          {checkoutError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{checkoutError}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export const PaidAdModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-2xl overflow-hidden my-auto shadow-2xl">
        <div className="px-5 py-4 bg-[#111915] text-white flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              $12 USD (KES {AD_PLAY_PRICE_KES.toLocaleString()}) Per Ad Playing
            </p>
            <h3 className="font-display font-bold text-base sm:text-lg">
              Post Live Ad — Open to Members &amp; Non-Users
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ad composer"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[82vh] overflow-y-auto">
          <PaidAdComposer compact onSuccess={() => onClose()} />
        </div>
      </div>
    </div>
  );
};
