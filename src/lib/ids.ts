export const UUID_PATTERN_SOURCE =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

export const UUID_REGEX = new RegExp(UUID_PATTERN_SOURCE);

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && UUID_REGEX.test(value);
}

/**
 * Generates an RFC-4122 v4 UUID using the Web Crypto API when available,
 * falling back to getRandomValues / Math.random if needed.
 */
export function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generates a deterministic RFC-4122-shaped UUID from an opaque seed string.
 * Used exclusively to assign stable UUIDs to built-in catalog items and
 * idempotently migrate legacy non-UUID document IDs without creating duplicates.
 */
export function deterministicUuid(seed: string): string {
  const bytes = new Uint8Array(16);
  // Four independent 32-bit FNV-1a-style passes with different prime seeds
  for (let pass = 0; pass < 4; pass += 1) {
    let h = (0x811c9dc5 ^ (pass * 0x9e3779b1)) >>> 0;
    const input = `${pass}:${seed}`;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    // Final avalanche mix
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;

    const offset = pass * 4;
    bytes[offset] = (h >>> 24) & 0xff;
    bytes[offset + 1] = (h >>> 16) & 0xff;
    bytes[offset + 2] = (h >>> 8) & 0xff;
    bytes[offset + 3] = h & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Fixed reserved UUIDs for unauthenticated guest adverts & their payments.
 */
export const GUEST_USER_ID = '00000000-0000-4000-8000-000000000000';
export const GUEST_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';

/**
 * Deterministic UUIDs for built-in catalog businesses, owners, products, posts,
 * groups, stories, and reviews so legacy references migrate seamlessly.
 */
export const SAMPLE_OWNER_UUIDS = Array.from({ length: 12 }, (_, idx) =>
  deterministicUuid(`swaypalm:sample_owner:${String(idx + 1).padStart(2, '0')}`)
);

export const SAMPLE_BUSINESS_UUIDS = Array.from({ length: 12 }, (_, idx) =>
  deterministicUuid(`swaypalm:sample_biz:${String(idx + 1).padStart(2, '0')}`)
);

export const SAMPLE_PRODUCT_UUIDS = Array.from({ length: 12 }, (_, idx) =>
  deterministicUuid(`swaypalm:sample_prod:${String(idx + 1).padStart(2, '0')}`)
);

export const SAMPLE_POST_UUIDS = Array.from({ length: 5 }, (_, idx) =>
  deterministicUuid(`swaypalm:sample_post:${String(idx + 1).padStart(2, '0')}`)
);

export const SAMPLE_GROUP_UUIDS = Array.from({ length: 4 }, (_, idx) =>
  deterministicUuid(`swaypalm:sample_grp:${String(idx + 1).padStart(2, '0')}`)
);

export const SAMPLE_STORY_UUIDS = Array.from({ length: 5 }, (_, idx) =>
  deterministicUuid(`swaypalm:sample_story:${String(idx + 1).padStart(2, '0')}`)
);

export const SAMPLE_REVIEW_UUIDS = Array.from({ length: 3 }, (_, idx) =>
  deterministicUuid(`swaypalm:sample_rev:${String(idx + 1).padStart(2, '0')}`)
);

export const LEGACY_SAMPLE_ID_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {
    guest: GUEST_USER_ID,
    guest_ad: GUEST_BUSINESS_ID,
  };
  for (let i = 0; i < 12; i += 1) {
    const pad = String(i + 1).padStart(2, '0');
    map[`sample_owner_${pad}`] = SAMPLE_OWNER_UUIDS[i];
    map[`sample_biz_${pad}`] = SAMPLE_BUSINESS_UUIDS[i];
    map[`sample_prod_${pad}`] = SAMPLE_PRODUCT_UUIDS[i];
  }
  for (let i = 0; i < 5; i += 1) {
    const pad = String(i + 1).padStart(2, '0');
    map[`sample_post_${pad}`] = SAMPLE_POST_UUIDS[i];
    map[`sample_story_${pad}`] = SAMPLE_STORY_UUIDS[i];
  }
  for (let i = 0; i < 4; i += 1) {
    const pad = String(i + 1).padStart(2, '0');
    map[`sample_grp_${pad}`] = SAMPLE_GROUP_UUIDS[i];
  }
  for (let i = 0; i < 3; i += 1) {
    const pad = String(i + 1).padStart(2, '0');
    map[`rev_${pad}`] = SAMPLE_REVIEW_UUIDS[i];
  }
  return map;
})();

export function resolveLegacyOrUuid(
  rawId: string | undefined | null,
  prefixForNewSeed: string,
  extraMap?: Record<string, string>
): string {
  const trimmed = (rawId || '').trim();
  if (!trimmed) return generateUuid();
  if (isUuid(trimmed)) return trimmed;
  if (extraMap && extraMap[trimmed]) return extraMap[trimmed];
  if (LEGACY_SAMPLE_ID_MAP[trimmed]) return LEGACY_SAMPLE_ID_MAP[trimmed];
  return deterministicUuid(`${prefixForNewSeed}:${trimmed}`);
}
