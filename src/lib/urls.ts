import { AppPage } from '../types';

export const BRAND_SLUG = 'swaypalm26';

export const PUBLIC_PRODUCTION_ORIGIN = 'https://galvanized-ether-gk4jk.web.app';

export const PUBLIC_PRODUCTION_WEBSITE_URL = `${PUBLIC_PRODUCTION_ORIGIN}/${BRAND_SLUG}`;

export const APP_PAGES: AppPage[] = [
  'home',
  'explore',
  'profile',
  'marketplace',
  'chat',
  'groups',
  'friends',
  'saved',
  'dashboard',
  'advertise',
  'notifications',
  'admin',
  'settings',
];

const ROUTE_ALIASES: Record<string, AppPage> = {
  shop: 'marketplace',
  store: 'marketplace',
  market: 'marketplace',
  products: 'marketplace',
  ads: 'advertise',
  advert: 'advertise',
  ad: 'advertise',
  feed: 'home',
  register: 'home',
  signup: 'home',
  login: 'home',
  inbox: 'chat',
  messages: 'chat',
  alerts: 'notifications',
};

export function isValidAppPage(value: string | null | undefined): value is AppPage {
  if (!value) return false;
  return (APP_PAGES as string[]).includes(value);
}

function resolveAliasOrPage(segment: string | null | undefined): AppPage | null {
  if (!segment) return null;
  const clean = segment.trim().toLowerCase();
  if (isValidAppPage(clean)) return clean;
  return ROUTE_ALIASES[clean] ?? null;
}

export function isPublicProductionOrigin(originOrHost: string | null | undefined): boolean {
  if (!originOrHost) return false;
  const cleaned = originOrHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
  if (!cleaned || !cleaned.includes('.')) return false;
  if (/^ais-(?:dev|pre)-/i.test(cleaned)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(cleaned)) return false;
  return true;
}

export function getLiveAppUrl(): string {
  const configuredPublic = (import.meta.env?.VITE_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (configuredPublic && /^https:\/\//i.test(configuredPublic) && isPublicProductionOrigin(configuredPublic)) {
    return configuredPublic;
  }
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    window.location.protocol === 'https:' &&
    isPublicProductionOrigin(window.location.origin)
  ) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return PUBLIC_PRODUCTION_ORIGIN;
}

export function isBrandedDomainHost(): boolean {
  if (typeof window === 'undefined' || !window.location?.hostname) return false;
  return window.location.hostname.toLowerCase().includes(BRAND_SLUG);
}

export function getWebsiteBaseUrl(): string {
  const base = getLiveAppUrl();
  return isBrandedDomainHost() ? base : `${base}/${BRAND_SLUG}`;
}

export function getPagePath(page: AppPage): string {
  if (isBrandedDomainHost()) {
    return page === 'home' ? '/' : `/${page}`;
  }
  return page === 'home' ? `/${BRAND_SLUG}` : `/${BRAND_SLUG}/${page}`;
}

export function getPageUrl(page: AppPage): string {
  return `${getLiveAppUrl()}${getPagePath(page)}`;
}

export function resolvePageFromLocation(loc?: Pick<Location, 'pathname' | 'search'>): AppPage {
  const target = loc ?? (typeof window !== 'undefined' ? window.location : null);
  if (!target) return 'home';

  const queryPage = resolveAliasOrPage(new URLSearchParams(target.search || '').get('page'));
  if (queryPage) {
    return queryPage;
  }

  const segments = (target.pathname || '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (segments[0] === BRAND_SLUG) {
    if (segments.length === 1) return 'home';
    return resolveAliasOrPage(segments[1]) ?? 'home';
  }

  return resolveAliasOrPage(segments[0]) ?? 'home';
}

export function normalizeExternalUrl(raw?: string | null): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  if (/^(javascript|data|vbscript|file|about):/i.test(trimmed)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith('//')
      ? `https:${trimmed}`
      : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return parsed.toString().slice(0, 300);
  } catch {
    return null;
  }
}
