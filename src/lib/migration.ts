import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  BUSINESS_CATEGORIES,
  AdvertCampaign,
  AppNotification,
  Business,
  BusinessCategory,
  BusinessGroup,
  BusinessReview,
  BusinessStory,
  CallSession,
  ChatMessage,
  ChatThread,
  FeedPost,
  FollowRecord,
  Friendship,
  GroupMember,
  GroupPost,
  Order,
  OrderItem,
  PAYMENT_METHODS,
  PaymentMethod,
  PaymentRecord,
  PlanTier,
  PostComment,
  Product,
  ProfileViewRecord,
  UserProfile,
  calculateOrderSplit,
} from '../types';
import {
  GUEST_BUSINESS_ID,
  GUEST_USER_ID,
  LEGACY_SAMPLE_ID_MAP,
  deterministicUuid,
  isUuid,
  resolveLegacyOrUuid,
} from './ids';

export interface UuidMigrationReport {
  migratedUsers: number;
  migratedAuthLinks: number;
  migratedBusinesses: number;
  migratedProducts: number;
  migratedPosts: number;
  migratedStories: number;
  migratedOrders: number;
  migratedFollows: number;
  migratedFriendships: number;
  migratedProfileViews: number;
  migratedGroups: number;
  migratedChats: number;
  migratedMessages: number;
  migratedCalls: number;
  migratedAdverts: number;
  migratedPayments: number;
  migratedNotifications: number;
  migratedSubdocs: number;
  deletedLegacyDocs: number;
  completedAt: string;
}

const VALID_PLANS: PlanTier[] = ['free', 'basic', 'pro', 'premium'];

function asValidPlan(raw: unknown): PlanTier {
  return typeof raw === 'string' && VALID_PLANS.includes(raw as PlanTier)
    ? (raw as PlanTier)
    : 'free';
}

function asValidCategory(raw: unknown): BusinessCategory {
  return typeof raw === 'string' && BUSINESS_CATEGORIES.includes(raw as BusinessCategory)
    ? (raw as BusinessCategory)
    : 'Services';
}

function asValidPaymentMethod(raw: unknown): PaymentMethod {
  return typeof raw === 'string' && PAYMENT_METHODS.includes(raw as PaymentMethod)
    ? (raw as PaymentMethod)
    : 'M-Pesa';
}

function asFirestoreTimestamp(raw: unknown): any {
  if (raw instanceof Timestamp) return raw;
  if (raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    return raw;
  }
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return Timestamp.fromDate(d);
    }
  }
  return serverTimestamp();
}

function asInt(raw: unknown, fallback = 0): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function asNonEmptyString(raw: unknown, fallback: string, minLen = 1, maxLen = 120): string {
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (str.length >= minLen) return str.slice(0, maxLen);
  return fallback.slice(0, maxLen);
}

export function resolveUserUuidFromAuthUid(
  rawIdOrAuthUid: string | undefined | null,
  authUidToUserUuid?: Record<string, string>
): string {
  const raw = (rawIdOrAuthUid || '').trim();
  if (!raw || raw === 'guest') return GUEST_USER_ID;
  if (isUuid(raw)) return raw;
  if (authUidToUserUuid && authUidToUserUuid[raw]) return authUidToUserUuid[raw];
  if (LEGACY_SAMPLE_ID_MAP[raw]) return LEGACY_SAMPLE_ID_MAP[raw];
  return deterministicUuid(`legacy_user:${raw}`);
}

export function resolveBusinessUuidFromRaw(
  rawBizId: string | undefined | null,
  oldBizIdToUuid?: Record<string, string>
): string {
  const raw = (rawBizId || '').trim();
  if (!raw || raw === 'guest_ad') return GUEST_BUSINESS_ID;
  if (isUuid(raw)) return raw;
  if (oldBizIdToUuid && oldBizIdToUuid[raw]) return oldBizIdToUuid[raw];
  if (LEGACY_SAMPLE_ID_MAP[raw]) return LEGACY_SAMPLE_ID_MAP[raw];
  return deterministicUuid(`legacy_biz:${raw}`);
}

// ------------------------------------------------------------------
// Runtime In-Memory Document Normalizers (Safe Pre & Post Migration)
// ------------------------------------------------------------------

export function normalizeUserDoc(docId: string, raw: DocumentData): UserProfile {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.uid === 'string' && raw.uid) ||
    docId;
  const id = isUuid(raw.id)
    ? raw.id
    : isUuid(docId)
      ? docId
      : resolveUserUuidFromAuthUid(authUid);
  const rawBizId = raw.business_id || raw.businessId || `biz_${authUid}`;
  const business_id = resolveBusinessUuidFromRaw(rawBizId);
  const savedRaw = Array.isArray(raw.savedPostIds) ? raw.savedPostIds : [];
  const savedPostIds = savedRaw
    .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
    .map((x: string) => resolveLegacyOrUuid(x, 'legacy_post'))
    .slice(0, 50);

  return {
    id,
    auth_uid: authUid,
    business_id,
    displayName: asNonEmptyString(raw.displayName, 'Business Owner', 1, 100),
    email: asNonEmptyString(raw.email, 'member@swaypalm.com', 3, 160),
    emailCodeVerified: Boolean(raw.emailCodeVerified),
    phone: typeof raw.phone === 'string' ? raw.phone.slice(0, 32) : '',
    phoneVerified: Boolean(raw.phoneVerified),
    country: typeof raw.country === 'string' ? raw.country.slice(0, 80) : 'Kenya',
    city: typeof raw.city === 'string' ? raw.city.slice(0, 80) : 'Nairobi',
    businessType: typeof raw.businessType === 'string' ? raw.businessType.slice(0, 80) : 'Services',
    plan: asValidPlan(raw.plan),
    verified: Boolean(raw.verified),
    role: raw.role === 'admin' ? 'admin' : 'member',
    status: raw.status === 'blocked' ? 'blocked' : 'active',
    savedPostIds,
    ...(typeof raw.lastPaymentId === 'string' && raw.lastPaymentId
      ? { lastPaymentId: raw.lastPaymentId }
      : {}),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeBusinessDoc(docId: string, raw: DocumentData): Business {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.ownerId === 'string' && raw.ownerId) ||
    (docId.startsWith('biz_') ? docId.slice(4) : docId);
  const business_id = isUuid(raw.business_id) ? raw.business_id : resolveBusinessUuidFromRaw(docId);
  const user_id = isUuid(raw.user_id)
    ? raw.user_id
    : resolveUserUuidFromAuthUid(raw.ownerId || authUid);

  return {
    business_id,
    user_id,
    auth_uid: authUid,
    ...(typeof raw.ownerName === 'string' && raw.ownerName.trim()
      ? { ownerName: raw.ownerName.trim().slice(0, 100) }
      : {}),
    name: asNonEmptyString(raw.name, 'SwayPalm Business', 2, 120),
    category: asValidCategory(raw.category),
    country: asNonEmptyString(raw.country, 'Kenya', 2, 80),
    city: asNonEmptyString(raw.city, 'Nairobi', 1, 80),
    tagline: typeof raw.tagline === 'string' ? raw.tagline.slice(0, 180) : '',
    about: typeof raw.about === 'string' ? raw.about.slice(0, 2000) : '',
    whatsapp: typeof raw.whatsapp === 'string' ? raw.whatsapp.slice(0, 32) : '',
    rating: typeof raw.rating === 'number' && raw.rating >= 0 && raw.rating <= 5 ? raw.rating : 5,
    reviewCount: asInt(raw.reviewCount, 0),
    plan: asValidPlan(raw.plan),
    verified: Boolean(raw.verified),
    logoInitials: typeof raw.logoInitials === 'string' ? raw.logoInitials.slice(0, 4) : 'SP',
    logoColor: typeof raw.logoColor === 'string' ? raw.logoColor.slice(0, 24) : '#0A4D2E',
    ...(typeof raw.logoDataUrl === 'string' && raw.logoDataUrl ? { logoDataUrl: raw.logoDataUrl } : {}),
    coverTheme: typeof raw.coverTheme === 'string' ? raw.coverTheme.slice(0, 40) : 'hero_trade',
    followersCount: asInt(raw.followersCount, 0),
    viewsCount: asInt(raw.viewsCount, 0),
    isOnline: Boolean(raw.isOnline),
    ...(raw.lastSeenAt ? { lastSeenAt: raw.lastSeenAt } : {}),
    showOnlineStatus: raw.showOnlineStatus !== false,
    status: raw.status === 'blocked' ? 'blocked' : 'active',
    ...(typeof raw.lastPaymentId === 'string' && raw.lastPaymentId
      ? { lastPaymentId: raw.lastPaymentId }
      : {}),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeProductDoc(docId: string, raw: DocumentData): Product {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.sellerId === 'string' && raw.sellerId) ||
    'unknown';
  const product_id = isUuid(raw.product_id)
    ? raw.product_id
    : resolveLegacyOrUuid(docId, 'legacy_prod');
  const business_id = isUuid(raw.business_id)
    ? raw.business_id
    : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`);
  const user_id = isUuid(raw.user_id) ? raw.user_id : resolveUserUuidFromAuthUid(authUid);

  return {
    product_id,
    business_id,
    user_id,
    auth_uid: authUid,
    title: asNonEmptyString(raw.title, 'Marketplace Product', 2, 140),
    description: asNonEmptyString(raw.description, 'Global SwayPalm listing', 2, 2000),
    price: typeof raw.price === 'number' && raw.price > 0 ? raw.price : 1,
    stock: asInt(raw.stock, 0),
    category: asValidCategory(raw.category),
    ...(typeof raw.imageTheme === 'string' ? { imageTheme: raw.imageTheme } : {}),
    ...(typeof raw.imageDataUrl === 'string' && raw.imageDataUrl ? { imageDataUrl: raw.imageDataUrl } : {}),
    boosted: Boolean(raw.boosted),
    status: raw.status === 'hidden' ? 'hidden' : 'active',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizePostDoc(docId: string, raw: DocumentData): FeedPost {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.authorId === 'string' && raw.authorId) ||
    'unknown';
  const post_id = isUuid(raw.post_id) ? raw.post_id : resolveLegacyOrUuid(docId, 'legacy_post');
  const user_id = isUuid(raw.user_id) ? raw.user_id : resolveUserUuidFromAuthUid(authUid);
  const business_id = isUuid(raw.business_id)
    ? raw.business_id
    : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`);
  const postType =
    raw.postType === 'photo' || raw.postType === 'video' || raw.postType === 'offer'
      ? raw.postType
      : 'update';

  return {
    post_id,
    user_id,
    business_id,
    auth_uid: authUid,
    postType,
    content: asNonEmptyString(raw.content, 'Business update', 1, 3000),
    ...(typeof raw.mediaDataUrl === 'string' && raw.mediaDataUrl ? { mediaDataUrl: raw.mediaDataUrl } : {}),
    ...(typeof raw.mediaTheme === 'string' ? { mediaTheme: raw.mediaTheme } : {}),
    ...(typeof raw.offerPrice === 'number' ? { offerPrice: raw.offerPrice } : {}),
    ...(typeof raw.offerProductTitle === 'string' && raw.offerProductTitle
      ? { offerProductTitle: raw.offerProductTitle }
      : {}),
    likesCount: asInt(raw.likesCount, 0),
    commentsCount: asInt(raw.commentsCount, 0),
    sharesCount: asInt(raw.sharesCount, 0),
    status: raw.status === 'hidden' ? 'hidden' : 'active',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeStoryDoc(docId: string, raw: DocumentData): BusinessStory {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.authorId === 'string' && raw.authorId) ||
    'unknown';
  const story_id = isUuid(raw.story_id) ? raw.story_id : resolveLegacyOrUuid(docId, 'legacy_story');
  const user_id = isUuid(raw.user_id) ? raw.user_id : resolveUserUuidFromAuthUid(authUid);
  const business_id = isUuid(raw.business_id)
    ? raw.business_id
    : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`);

  return {
    story_id,
    user_id,
    business_id,
    auth_uid: authUid,
    headline: asNonEmptyString(raw.headline, 'Business Highlight', 2, 140),
    ...(typeof raw.caption === 'string' && raw.caption ? { caption: raw.caption } : {}),
    ...(typeof raw.mediaDataUrl === 'string' && raw.mediaDataUrl ? { mediaDataUrl: raw.mediaDataUrl } : {}),
    ...(typeof raw.mediaTheme === 'string' ? { mediaTheme: raw.mediaTheme } : {}),
    ...(typeof raw.ctaLabel === 'string' && raw.ctaLabel ? { ctaLabel: raw.ctaLabel } : {}),
    viewsCount: asInt(raw.viewsCount, 0),
    status: raw.status === 'expired' ? 'expired' : 'active',
    createdAt: raw.createdAt || new Date().toISOString(),
    expiresAt: raw.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function normalizeGroupDoc(docId: string, raw: DocumentData): BusinessGroup {
  const authUid =
    (typeof raw.creator_auth_uid === 'string' && raw.creator_auth_uid) ||
    (typeof raw.creatorId === 'string' && raw.creatorId) ||
    'unknown';
  const group_id = isUuid(raw.group_id) ? raw.group_id : resolveLegacyOrUuid(docId, 'legacy_grp');
  const creator_user_id = isUuid(raw.creator_user_id)
    ? raw.creator_user_id
    : resolveUserUuidFromAuthUid(authUid);

  return {
    group_id,
    creator_user_id,
    creator_auth_uid: authUid,
    name: asNonEmptyString(raw.name, 'Business Group', 2, 120),
    description: typeof raw.description === 'string' ? raw.description.slice(0, 800) : '',
    category: asNonEmptyString(raw.category, 'Trade', 1, 80),
    ...(typeof raw.location === 'string' ? { location: raw.location.slice(0, 80) } : {}),
    ...(typeof raw.coverTheme === 'string' ? { coverTheme: raw.coverTheme.slice(0, 40) } : {}),
    membersCount: asInt(raw.membersCount, 1),
    status: 'active',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeOrderDoc(docId: string, raw: DocumentData): Order {
  const buyerAuthUid =
    (typeof raw.buyer_auth_uid === 'string' && raw.buyer_auth_uid) ||
    (typeof raw.buyerId === 'string' && raw.buyerId) ||
    'unknown';
  const sellerAuthUid =
    (typeof raw.seller_auth_uid === 'string' && raw.seller_auth_uid) ||
    (typeof raw.sellerId === 'string' && raw.sellerId) ||
    'unknown';
  const order_id = isUuid(raw.order_id) ? raw.order_id : resolveLegacyOrUuid(docId, 'legacy_order');
  const buyer_id = isUuid(raw.buyer_id) ? raw.buyer_id : resolveUserUuidFromAuthUid(buyerAuthUid);
  const seller_id = isUuid(raw.seller_id) ? raw.seller_id : resolveUserUuidFromAuthUid(sellerAuthUid);
  const business_id = isUuid(raw.business_id)
    ? raw.business_id
    : resolveBusinessUuidFromRaw(raw.businessId || `biz_${sellerAuthUid}`);

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: OrderItem[] = rawItems.slice(0, 20).map((item: any) => ({
    product_id: isUuid(item?.product_id)
      ? item.product_id
      : resolveLegacyOrUuid(item?.productId || 'item', 'legacy_prod'),
    title: asNonEmptyString(item?.title, 'Item', 1, 140),
    price: typeof item?.price === 'number' && item.price >= 0 ? item.price : 1,
    quantity: Math.max(1, asInt(item?.quantity, 1)),
  }));

  const status =
    raw.status === 'confirmed' || raw.status === 'shipped' || raw.status === 'delivered'
      ? raw.status
      : 'pending';

  return {
    order_id,
    buyer_id,
    seller_id,
    business_id,
    buyer_auth_uid: buyerAuthUid,
    seller_auth_uid: sellerAuthUid,
    ...(typeof raw.buyerPhone === 'string' ? { buyerPhone: raw.buyerPhone } : {}),
    ...(typeof raw.shippingAddress === 'string' ? { shippingAddress: raw.shippingAddress } : {}),
    items,
    totalAmount: typeof raw.totalAmount === 'number' && raw.totalAmount > 0 ? raw.totalAmount : 1,
    platformFeeRate: typeof raw.platformFeeRate === 'number' ? raw.platformFeeRate : 0.1,
    ...(typeof raw.platformFeeAmount === 'number' ? { platformFeeAmount: raw.platformFeeAmount } : {}),
    ...(typeof raw.sellerNetAmount === 'number' ? { sellerNetAmount: raw.sellerNetAmount } : {}),
    feeStatus: raw.feeStatus === 'settled' ? 'settled' : 'deducted',
    paymentMethod: asValidPaymentMethod(raw.paymentMethod),
    status,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeFollowDoc(docId: string, raw: DocumentData): FollowRecord {
  const followerAuthUid =
    (typeof raw.follower_auth_uid === 'string' && raw.follower_auth_uid) ||
    (typeof raw.followerId === 'string' && raw.followerId) ||
    'unknown';
  const businessAuthUid =
    (typeof raw.business_auth_uid === 'string' && raw.business_auth_uid) ||
    (typeof raw.businessOwnerId === 'string' && raw.businessOwnerId) ||
    'unknown';
  const follower_user_id = isUuid(raw.follower_user_id)
    ? raw.follower_user_id
    : resolveUserUuidFromAuthUid(followerAuthUid);
  const business_id = isUuid(raw.business_id)
    ? raw.business_id
    : resolveBusinessUuidFromRaw(raw.businessId || `biz_${businessAuthUid}`);
  const business_user_id = isUuid(raw.business_user_id)
    ? raw.business_user_id
    : resolveUserUuidFromAuthUid(businessAuthUid);
  const follow_id = isUuid(raw.follow_id)
    ? raw.follow_id
    : isUuid(docId)
      ? docId
      : deterministicUuid(`follow:${follower_user_id}:${business_id}`);

  return {
    follow_id,
    follower_user_id,
    business_id,
    business_user_id,
    follower_auth_uid: followerAuthUid,
    business_auth_uid: businessAuthUid,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeFriendshipDoc(docId: string, raw: DocumentData): Friendship {
  const requesterAuthUid =
    (typeof raw.requester_auth_uid === 'string' && raw.requester_auth_uid) ||
    (typeof raw.requesterId === 'string' && raw.requesterId) ||
    'unknown';
  const recipientAuthUid =
    (typeof raw.recipient_auth_uid === 'string' && raw.recipient_auth_uid) ||
    (typeof raw.recipientId === 'string' && raw.recipientId) ||
    'unknown';
  const requester_id = isUuid(raw.requester_id)
    ? raw.requester_id
    : resolveUserUuidFromAuthUid(requesterAuthUid);
  const recipient_id = isUuid(raw.recipient_id)
    ? raw.recipient_id
    : resolveUserUuidFromAuthUid(recipientAuthUid);
  const participant_user_ids = Array.isArray(raw.participant_user_ids)
    ? raw.participant_user_ids.map((id: string) => resolveUserUuidFromAuthUid(id))
    : [requester_id, recipient_id].sort();
  const participant_auth_uids = Array.isArray(raw.participant_auth_uids)
    ? raw.participant_auth_uids
    : Array.isArray(raw.participants)
      ? raw.participants
      : [requesterAuthUid, recipientAuthUid].sort();
  const friendship_id = isUuid(raw.friendship_id)
    ? raw.friendship_id
    : isUuid(docId)
      ? docId
      : deterministicUuid(`friendship:${[requester_id, recipient_id].sort().join('_')}`);

  return {
    friendship_id,
    requester_id,
    recipient_id,
    participant_user_ids,
    participant_auth_uids,
    requester_auth_uid: requesterAuthUid,
    recipient_auth_uid: recipientAuthUid,
    status: raw.status === 'accepted' || raw.status === 'declined' ? raw.status : 'pending',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeProfileViewDoc(docId: string, raw: DocumentData): ProfileViewRecord {
  const targetAuthUid =
    (typeof raw.target_auth_uid === 'string' && raw.target_auth_uid) ||
    (typeof raw.targetOwnerId === 'string' && raw.targetOwnerId) ||
    'unknown';
  const viewerAuthUid =
    (typeof raw.viewer_auth_uid === 'string' && raw.viewer_auth_uid) ||
    (typeof raw.viewerId === 'string' && raw.viewerId) ||
    'unknown';

  return {
    view_id: isUuid(raw.view_id) ? raw.view_id : resolveLegacyOrUuid(docId, 'legacy_view'),
    business_id: isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${targetAuthUid}`),
    target_user_id: isUuid(raw.target_user_id)
      ? raw.target_user_id
      : resolveUserUuidFromAuthUid(targetAuthUid),
    viewer_user_id: isUuid(raw.viewer_user_id)
      ? raw.viewer_user_id
      : resolveUserUuidFromAuthUid(viewerAuthUid),
    target_auth_uid: targetAuthUid,
    viewer_auth_uid: viewerAuthUid,
    viewedAt: raw.viewedAt || new Date().toISOString(),
  };
}

export function normalizeChatDoc(docId: string, raw: DocumentData): ChatThread {
  const participantAuthUids: string[] = Array.isArray(raw.participant_auth_uids)
    ? raw.participant_auth_uids
    : Array.isArray(raw.participantIds)
      ? raw.participantIds
      : [];
  const participantUserIds: string[] = Array.isArray(raw.participant_user_ids)
    ? raw.participant_user_ids.map((id: string) => resolveUserUuidFromAuthUid(id))
    : participantAuthUids.map((uid) => resolveUserUuidFromAuthUid(uid));
  const type: 'direct' | 'group' = raw.type === 'group' ? 'group' : 'direct';
  const chat_id = isUuid(raw.chat_id)
    ? raw.chat_id
    : isUuid(docId)
      ? docId
      : type === 'direct' && participantUserIds.length >= 2
        ? deterministicUuid(`direct_chat:${[...participantUserIds].sort().slice(0, 2).join('_')}`)
        : resolveLegacyOrUuid(docId, 'legacy_chat');
  const createdByRaw = raw.created_by || raw.createdBy || participantAuthUids[0] || 'unknown';
  const lastSenderRaw = raw.last_sender_id || raw.lastSenderId;
  const unreadRaw: string[] = Array.isArray(raw.unread_by)
    ? raw.unread_by
    : Array.isArray(raw.unreadBy)
      ? raw.unreadBy
      : [];

  return {
    chat_id,
    type,
    ...(type === 'group' && typeof raw.name === 'string' ? { name: raw.name.slice(0, 120) } : {}),
    participant_user_ids: participantUserIds,
    participant_auth_uids: participantAuthUids,
    ...(typeof raw.lastMessage === 'string' ? { lastMessage: raw.lastMessage } : {}),
    ...(lastSenderRaw ? { last_sender_id: resolveUserUuidFromAuthUid(lastSenderRaw) } : {}),
    unread_by: unreadRaw.map((id) => resolveUserUuidFromAuthUid(id)),
    created_by: resolveUserUuidFromAuthUid(createdByRaw),
    ...(raw.lastMessageAt ? { lastMessageAt: raw.lastMessageAt } : {}),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeChatMessageDoc(docId: string, raw: DocumentData): ChatMessage {
  const senderAuthUid =
    (typeof raw.sender_auth_uid === 'string' && raw.sender_auth_uid) ||
    (typeof raw.senderId === 'string' && raw.senderId) ||
    'unknown';
  const participantAuthUids: string[] = Array.isArray(raw.participant_auth_uids)
    ? raw.participant_auth_uids
    : Array.isArray(raw.participantIds)
      ? raw.participantIds
      : [senderAuthUid];
  const participantUserIds: string[] = Array.isArray(raw.participant_user_ids)
    ? raw.participant_user_ids.map((id: string) => resolveUserUuidFromAuthUid(id))
    : participantAuthUids.map((uid) => resolveUserUuidFromAuthUid(uid));

  return {
    message_id: isUuid(raw.message_id) ? raw.message_id : resolveLegacyOrUuid(docId, 'legacy_msg'),
    chat_id: isUuid(raw.chat_id) ? raw.chat_id : resolveLegacyOrUuid(raw.chatId, 'legacy_chat'),
    sender_id: isUuid(raw.sender_id) ? raw.sender_id : resolveUserUuidFromAuthUid(senderAuthUid),
    sender_auth_uid: senderAuthUid,
    participant_user_ids: participantUserIds,
    participant_auth_uids: participantAuthUids,
    type: raw.type === 'photo' || raw.type === 'voice' ? raw.type : 'text',
    ...(typeof raw.text === 'string' ? { text: raw.text } : {}),
    ...(typeof raw.mediaDataUrl === 'string' ? { mediaDataUrl: raw.mediaDataUrl } : {}),
    ...(typeof raw.voiceDurationSec === 'number' ? { voiceDurationSec: raw.voiceDurationSec } : {}),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeCallDoc(docId: string, raw: DocumentData): CallSession {
  const callerAuthUid =
    (typeof raw.caller_auth_uid === 'string' && raw.caller_auth_uid) ||
    (typeof raw.callerId === 'string' && raw.callerId) ||
    'unknown';
  const calleeAuthUid =
    (typeof raw.callee_auth_uid === 'string' && raw.callee_auth_uid) ||
    (typeof raw.calleeId === 'string' && raw.calleeId) ||
    'unknown';
  const caller_user_id = isUuid(raw.caller_user_id)
    ? raw.caller_user_id
    : resolveUserUuidFromAuthUid(callerAuthUid);
  const callee_user_id = isUuid(raw.callee_user_id)
    ? raw.callee_user_id
    : resolveUserUuidFromAuthUid(calleeAuthUid);
  const participant_user_ids = Array.isArray(raw.participant_user_ids)
    ? raw.participant_user_ids.map((id: string) => resolveUserUuidFromAuthUid(id))
    : [caller_user_id, callee_user_id].sort();
  const participant_auth_uids = Array.isArray(raw.participant_auth_uids)
    ? raw.participant_auth_uids
    : Array.isArray(raw.participants)
      ? raw.participants
      : [callerAuthUid, calleeAuthUid].sort();

  const status =
    raw.status === 'active' ||
    raw.status === 'ended' ||
    raw.status === 'declined' ||
    raw.status === 'missed'
      ? raw.status
      : 'ringing';

  return {
    call_id: isUuid(raw.call_id) ? raw.call_id : resolveLegacyOrUuid(docId, 'legacy_call'),
    ...(raw.chat_id || raw.chatId
      ? { chat_id: resolveLegacyOrUuid(raw.chat_id || raw.chatId, 'legacy_chat') }
      : {}),
    callType: raw.callType === 'video' ? 'video' : 'audio',
    caller_user_id,
    callee_user_id,
    ...(raw.caller_business_id || raw.callerBusinessId
      ? {
          caller_business_id: resolveBusinessUuidFromRaw(
            raw.caller_business_id || raw.callerBusinessId
          ),
        }
      : {}),
    ...(raw.callee_business_id || raw.calleeBusinessId
      ? {
          callee_business_id: resolveBusinessUuidFromRaw(
            raw.callee_business_id || raw.calleeBusinessId
          ),
        }
      : {}),
    participant_user_ids,
    participant_auth_uids,
    caller_auth_uid: callerAuthUid,
    callee_auth_uid: calleeAuthUid,
    status,
    offerSdp: typeof raw.offerSdp === 'string' ? raw.offerSdp : '',
    ...(typeof raw.answerSdp === 'string' ? { answerSdp: raw.answerSdp } : {}),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeAdvertDoc(docId: string, raw: DocumentData): AdvertCampaign {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.ownerId === 'string' && raw.ownerId) ||
    'guest';
  const isGuest = authUid === 'guest' || raw.advertiserType === 'guest';
  const user_id = isGuest
    ? GUEST_USER_ID
    : isUuid(raw.user_id)
      ? raw.user_id
      : resolveUserUuidFromAuthUid(authUid);
  const business_id = isGuest
    ? GUEST_BUSINESS_ID
    : isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`);
  const advertiser_name =
    typeof raw.advertiser_name === 'string' && raw.advertiser_name.trim()
      ? raw.advertiser_name.trim().slice(0, 120)
      : typeof raw.businessName === 'string' && raw.businessName.trim()
        ? raw.businessName.trim().slice(0, 120)
        : undefined;

  return {
    advert_id: isUuid(raw.advert_id) ? raw.advert_id : resolveLegacyOrUuid(docId, 'legacy_adv'),
    user_id,
    business_id,
    auth_uid: authUid,
    advertiserType: isGuest ? 'guest' : 'user',
    ...(advertiser_name ? { advertiser_name } : {}),
    title: asNonEmptyString(raw.title, 'Sponsored Spotlight', 2, 140),
    ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
    targetRegion: asNonEmptyString(raw.targetRegion, 'Global', 1, 80),
    ...(typeof raw.ctaLabel === 'string' ? { ctaLabel: raw.ctaLabel } : {}),
    ...(typeof raw.ctaUrl === 'string' ? { ctaUrl: raw.ctaUrl } : {}),
    ...(typeof raw.mediaDataUrl === 'string' ? { mediaDataUrl: raw.mediaDataUrl } : {}),
    ...(typeof raw.mediaTheme === 'string' ? { mediaTheme: raw.mediaTheme } : {}),
    budgetTier:
      raw.budgetTier === 'basic' || raw.budgetTier === 'pro' || raw.budgetTier === 'premium'
        ? raw.budgetTier
        : 'ad_slot',
    ...(typeof raw.priceUsd === 'number' ? { priceUsd: raw.priceUsd } : {}),
    ...(raw.paymentStatus === 'paid' || raw.paymentStatus === 'pending'
      ? { paymentStatus: raw.paymentStatus }
      : {}),
    ...(raw.payment_id || raw.paymentId
      ? { payment_id: resolveLegacyOrUuid(raw.payment_id || raw.paymentId, 'legacy_pay') }
      : {}),
    ...(raw.paymentMethod ? { paymentMethod: asValidPaymentMethod(raw.paymentMethod) } : {}),
    ...(typeof raw.paymentReference === 'string' ? { paymentReference: raw.paymentReference } : {}),
    status: raw.status === 'approved' || raw.status === 'paused' ? raw.status : 'pending',
    impressions: asInt(raw.impressions, 0),
    clicks: asInt(raw.clicks, 0),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizePaymentDoc(docId: string, raw: DocumentData): PaymentRecord {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.userId === 'string' && raw.userId) ||
    'guest';
  const isGuest = authUid === 'guest';
  const user_id = isGuest
    ? GUEST_USER_ID
    : isUuid(raw.user_id)
      ? raw.user_id
      : resolveUserUuidFromAuthUid(authUid);
  const business_id = isGuest
    ? GUEST_BUSINESS_ID
    : isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`);

  return {
    payment_id: isUuid(raw.payment_id) ? raw.payment_id : resolveLegacyOrUuid(docId, 'legacy_pay'),
    user_id,
    business_id,
    auth_uid: authUid,
    ...(raw.advert_id || raw.advertId
      ? { advert_id: resolveLegacyOrUuid(raw.advert_id || raw.advertId, 'legacy_adv') }
      : {}),
    plan:
      raw.plan === 'basic' || raw.plan === 'pro' || raw.plan === 'premium'
        ? raw.plan
        : 'ad_slot',
    amount: typeof raw.amount === 'number' && raw.amount > 0 ? raw.amount : 12,
    method: asValidPaymentMethod(raw.method),
    reference: asNonEmptyString(raw.reference, 'SWP-REF', 2, 100),
    ...(typeof raw.paybillNumber === 'string' ? { paybillNumber: raw.paybillNumber } : {}),
    ...(typeof raw.accountNumber === 'string' ? { accountNumber: raw.accountNumber } : {}),
    ...(typeof raw.payerPhone === 'string' ? { payerPhone: raw.payerPhone } : {}),
    ...(typeof raw.amountKes === 'number' ? { amountKes: raw.amountKes } : {}),
    status: raw.status === 'refunded' ? 'refunded' : 'completed',
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeNotificationDoc(docId: string, raw: DocumentData): AppNotification {
  const recipientAuthUid =
    (typeof raw.recipient_auth_uid === 'string' && raw.recipient_auth_uid) ||
    (typeof raw.recipientId === 'string' && raw.recipientId) ||
    'unknown';
  const type =
    raw.type === 'follower' ||
    raw.type === 'message' ||
    raw.type === 'order' ||
    raw.type === 'comment' ||
    raw.type === 'advert' ||
    raw.type === 'friend'
      ? raw.type
      : 'advert';

  return {
    notification_id: isUuid(raw.notification_id)
      ? raw.notification_id
      : resolveLegacyOrUuid(docId, 'legacy_notif'),
    recipient_user_id: isUuid(raw.recipient_user_id)
      ? raw.recipient_user_id
      : resolveUserUuidFromAuthUid(recipientAuthUid),
    recipient_auth_uid: recipientAuthUid,
    ...(raw.actor_user_id ? { actor_user_id: resolveUserUuidFromAuthUid(raw.actor_user_id) } : {}),
    ...(raw.actor_business_id
      ? { actor_business_id: resolveBusinessUuidFromRaw(raw.actor_business_id) }
      : {}),
    type,
    title: asNonEmptyString(raw.title, 'Notification', 1, 140),
    body: asNonEmptyString(raw.body, 'Activity update', 1, 300),
    read: Boolean(raw.read),
    ...(typeof raw.targetTab === 'string' ? { targetTab: raw.targetTab as any } : {}),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeBusinessReviewDoc(
  docId: string,
  businessUuid: string,
  raw: DocumentData
): BusinessReview {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.authorId === 'string' && raw.authorId) ||
    'unknown';
  return {
    review_id: isUuid(raw.review_id) ? raw.review_id : resolveLegacyOrUuid(docId, 'legacy_rev'),
    business_id: businessUuid,
    user_id: isUuid(raw.user_id) ? raw.user_id : resolveUserUuidFromAuthUid(authUid),
    auth_uid: authUid,
    rating: typeof raw.rating === 'number' ? Math.max(1, Math.min(5, Math.round(raw.rating))) : 5,
    comment: asNonEmptyString(raw.comment, 'Verified review', 2, 800),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function normalizePostCommentDoc(
  docId: string,
  postUuid: string,
  raw: DocumentData
): PostComment {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.authorId === 'string' && raw.authorId) ||
    'unknown';
  return {
    comment_id: isUuid(raw.comment_id) ? raw.comment_id : resolveLegacyOrUuid(docId, 'legacy_cmt'),
    post_id: postUuid,
    user_id: isUuid(raw.user_id) ? raw.user_id : resolveUserUuidFromAuthUid(authUid),
    auth_uid: authUid,
    text: asNonEmptyString(raw.text, 'Comment', 1, 1000),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeGroupMemberDoc(docId: string, raw: DocumentData): GroupMember {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.userId === 'string' && raw.userId) ||
    docId;
  return {
    user_id: isUuid(raw.user_id) ? raw.user_id : resolveUserUuidFromAuthUid(authUid),
    auth_uid: authUid,
    role: raw.role === 'admin' ? 'admin' : 'member',
    joinedAt: raw.joinedAt || new Date().toISOString(),
  };
}

export function normalizeGroupPostDoc(
  docId: string,
  groupUuid: string,
  raw: DocumentData
): GroupPost {
  const authUid =
    (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
    (typeof raw.authorId === 'string' && raw.authorId) ||
    'unknown';
  return {
    group_post_id: isUuid(raw.group_post_id)
      ? raw.group_post_id
      : resolveLegacyOrUuid(docId, 'legacy_gp'),
    group_id: groupUuid,
    user_id: isUuid(raw.user_id) ? raw.user_id : resolveUserUuidFromAuthUid(authUid),
    auth_uid: authUid,
    content: asNonEmptyString(raw.content, 'Group update', 1, 2000),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

// ------------------------------------------------------------------
// Batch Commit Helpers (Respecting 500-op Firestore Batch Limit)
// ------------------------------------------------------------------

interface BatchSetOp {
  type: 'set';
  ref: DocumentReference;
  data: Record<string, any>;
}

interface BatchDeleteOp {
  type: 'delete';
  ref: DocumentReference;
}

async function commitOpsInChunks(db: Firestore, ops: (BatchSetOp | BatchDeleteOp)[]) {
  const CHUNK_SIZE = 350;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

function cleanFirestoreWriteObj(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// ------------------------------------------------------------------
// Full Admin Database UUID Migration
// ------------------------------------------------------------------

export async function runFullUuidMigration(db: Firestore): Promise<UuidMigrationReport> {
  const [
    authLinksSnap,
    usersSnap,
    bizSnap,
    prodSnap,
    postSnap,
    storySnap,
    orderSnap,
    followSnap,
    friendSnap,
    viewSnap,
    groupSnap,
    chatSnap,
    callSnap,
    advertSnap,
    paymentSnap,
    notifSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'userAuthLinks')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'businesses')),
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'posts')),
    getDocs(collection(db, 'stories')),
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'follows')),
    getDocs(collection(db, 'friendships')),
    getDocs(collection(db, 'profileViews')),
    getDocs(collection(db, 'groups')),
    getDocs(collection(db, 'chats')),
    getDocs(collection(db, 'calls')),
    getDocs(collection(db, 'adverts')),
    getDocs(collection(db, 'payments')),
    getDocs(collection(db, 'notifications')),
  ]);

  const authUidToUserUuid: Record<string, string> = {};
  const oldUserIdToUuid: Record<string, string> = {};
  const oldBizIdToUuid: Record<string, string> = {};
  const userUuidToOwnerName: Record<string, string> = {};

  for (const d of authLinksSnap.docs) {
    const data = d.data();
    if (typeof data.auth_uid === 'string' && isUuid(data.user_id)) {
      authUidToUserUuid[data.auth_uid] = data.user_id;
    }
  }

  for (const d of usersSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.uid === 'string' && raw.uid) ||
      d.id;
    const canonicalUuid = isUuid(raw.id)
      ? raw.id
      : isUuid(d.id)
        ? d.id
        : authUidToUserUuid[authUid] || resolveUserUuidFromAuthUid(authUid);
    authUidToUserUuid[authUid] = canonicalUuid;
    oldUserIdToUuid[d.id] = canonicalUuid;
    oldUserIdToUuid[authUid] = canonicalUuid;
    if (typeof raw.displayName === 'string' && raw.displayName.trim()) {
      userUuidToOwnerName[canonicalUuid] = raw.displayName.trim().slice(0, 100);
    }
  }

  for (const d of bizSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.ownerId === 'string' && raw.ownerId) ||
      (d.id.startsWith('biz_') ? d.id.slice(4) : '');
    const canonicalBizUuid = isUuid(raw.business_id)
      ? raw.business_id
      : isUuid(d.id)
        ? d.id
        : resolveBusinessUuidFromRaw(d.id);
    oldBizIdToUuid[d.id] = canonicalBizUuid;
    if (authUid) {
      oldBizIdToUuid[`biz_${authUid}`] = canonicalBizUuid;
      if (!authUidToUserUuid[authUid]) {
        authUidToUserUuid[authUid] = isUuid(raw.user_id)
          ? raw.user_id
          : resolveUserUuidFromAuthUid(authUid);
      }
    }
  }

  const oldProdIdToUuid: Record<string, string> = {};
  for (const d of prodSnap.docs) {
    const raw = d.data();
    oldProdIdToUuid[d.id] = isUuid(raw.product_id)
      ? raw.product_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_prod');
  }

  const oldPostIdToUuid: Record<string, string> = {};
  for (const d of postSnap.docs) {
    const raw = d.data();
    oldPostIdToUuid[d.id] = isUuid(raw.post_id)
      ? raw.post_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_post');
  }

  const oldStoryIdToUuid: Record<string, string> = {};
  for (const d of storySnap.docs) {
    const raw = d.data();
    oldStoryIdToUuid[d.id] = isUuid(raw.story_id)
      ? raw.story_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_story');
  }

  const oldGroupIdToUuid: Record<string, string> = {};
  for (const d of groupSnap.docs) {
    const raw = d.data();
    oldGroupIdToUuid[d.id] = isUuid(raw.group_id)
      ? raw.group_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_grp');
  }

  const oldAdvIdToUuid: Record<string, string> = {};
  for (const d of advertSnap.docs) {
    const raw = d.data();
    oldAdvIdToUuid[d.id] = isUuid(raw.advert_id)
      ? raw.advert_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_adv');
  }

  const oldPayIdToUuid: Record<string, string> = {};
  for (const d of paymentSnap.docs) {
    const raw = d.data();
    oldPayIdToUuid[d.id] = isUuid(raw.payment_id)
      ? raw.payment_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_pay');
  }

  const phase1Ops: BatchSetOp[] = [];
  const phase2Ops: BatchSetOp[] = [];
  const phase3Ops: BatchSetOp[] = [];
  const deleteSubOps: BatchDeleteOp[] = [];
  const deleteParentOps: BatchDeleteOp[] = [];

  const report: UuidMigrationReport = {
    migratedUsers: 0,
    migratedAuthLinks: 0,
    migratedBusinesses: 0,
    migratedProducts: 0,
    migratedPosts: 0,
    migratedStories: 0,
    migratedOrders: 0,
    migratedFollows: 0,
    migratedFriendships: 0,
    migratedProfileViews: 0,
    migratedGroups: 0,
    migratedChats: 0,
    migratedMessages: 0,
    migratedCalls: 0,
    migratedAdverts: 0,
    migratedPayments: 0,
    migratedNotifications: 0,
    migratedSubdocs: 0,
    deletedLegacyDocs: 0,
    completedAt: new Date().toISOString(),
  };

  const existingAuthLinks = new Set(authLinksSnap.docs.map((d) => d.id));

  // Phase 1: userAuthLinks, users, businesses
  for (const d of usersSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.uid === 'string' && raw.uid) ||
      d.id;
    const userUuid = authUidToUserUuid[authUid] || resolveUserUuidFromAuthUid(authUid);
    const rawBizId = raw.business_id || raw.businessId || `biz_${authUid}`;
    const bizUuid = oldBizIdToUuid[rawBizId] || resolveBusinessUuidFromRaw(rawBizId, oldBizIdToUuid);
    const savedRaw = Array.isArray(raw.savedPostIds) ? raw.savedPostIds : [];
    const savedPostIds = savedRaw
      .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
      .map((x: string) => oldPostIdToUuid[x] || resolveLegacyOrUuid(x, 'legacy_post'))
      .slice(0, 50);

    const userPayload = cleanFirestoreWriteObj({
      id: userUuid,
      auth_uid: authUid,
      business_id: bizUuid,
      displayName: asNonEmptyString(raw.displayName, 'Business Owner', 1, 100),
      email: asNonEmptyString(raw.email, 'member@swaypalm.com', 3, 160),
      emailCodeVerified: Boolean(raw.emailCodeVerified),
      phone: typeof raw.phone === 'string' ? raw.phone.slice(0, 32) : '',
      phoneVerified: Boolean(raw.phoneVerified),
      country: typeof raw.country === 'string' ? raw.country.slice(0, 80) : 'Kenya',
      city: typeof raw.city === 'string' ? raw.city.slice(0, 80) : 'Nairobi',
      businessType: typeof raw.businessType === 'string' ? raw.businessType.slice(0, 80) : 'Services',
      plan: asValidPlan(raw.plan),
      verified: Boolean(raw.verified),
      role: raw.role === 'admin' ? 'admin' : 'member',
      status: raw.status === 'blocked' ? 'blocked' : 'active',
      savedPostIds,
      lastPaymentId:
        typeof raw.lastPaymentId === 'string' && /^[a-zA-Z0-9_-]+$/.test(raw.lastPaymentId)
          ? oldPayIdToUuid[raw.lastPaymentId] || raw.lastPaymentId
          : undefined,
      createdAt: asFirestoreTimestamp(raw.createdAt),
      updatedAt: serverTimestamp(),
    });

    phase1Ops.push({
      type: 'set',
      ref: doc(db, 'users', userUuid),
      data: userPayload,
    });
    report.migratedUsers += 1;

    if (authUid && !authUid.startsWith('sample_') && authUid !== 'guest') {
      if (!existingAuthLinks.has(authUid) || authLinksSnap.docs.find((l) => l.id === authUid)?.data().user_id !== userUuid) {
        phase1Ops.push({
          type: 'set',
          ref: doc(db, 'userAuthLinks', authUid),
          data: {
            auth_uid: authUid,
            user_id: userUuid,
            createdAt: asFirestoreTimestamp(raw.createdAt),
          },
        });
        report.migratedAuthLinks += 1;
      }
    }

    if (d.id !== userUuid) {
      deleteParentOps.push({ type: 'delete', ref: d.ref });
    }
  }

  for (const d of bizSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.ownerId === 'string' && raw.ownerId) ||
      (d.id.startsWith('biz_') ? d.id.slice(4) : d.id);
    const bizUuid = oldBizIdToUuid[d.id] || resolveBusinessUuidFromRaw(d.id, oldBizIdToUuid);
    const userUuid =
      (isUuid(raw.user_id) ? raw.user_id : undefined) ||
      authUidToUserUuid[authUid] ||
      resolveUserUuidFromAuthUid(authUid, authUidToUserUuid);
    const ownerName =
      (typeof raw.ownerName === 'string' && raw.ownerName.trim()) ||
      userUuidToOwnerName[userUuid] ||
      undefined;

    const bizPayload = cleanFirestoreWriteObj({
      business_id: bizUuid,
      user_id: userUuid,
      auth_uid: authUid,
      ownerName: ownerName ? ownerName.slice(0, 100) : undefined,
      name: asNonEmptyString(raw.name, 'SwayPalm Business', 2, 120),
      category: asValidCategory(raw.category),
      country: asNonEmptyString(raw.country, 'Kenya', 2, 80),
      city: asNonEmptyString(raw.city, 'Nairobi', 1, 80),
      tagline: typeof raw.tagline === 'string' ? raw.tagline.slice(0, 180) : '',
      about: typeof raw.about === 'string' ? raw.about.slice(0, 2000) : '',
      whatsapp: typeof raw.whatsapp === 'string' ? raw.whatsapp.slice(0, 32) : '',
      rating: typeof raw.rating === 'number' && raw.rating >= 0 && raw.rating <= 5 ? raw.rating : 5,
      reviewCount: asInt(raw.reviewCount, 0),
      plan: asValidPlan(raw.plan),
      verified: Boolean(raw.verified),
      logoInitials: typeof raw.logoInitials === 'string' ? raw.logoInitials.slice(0, 4) : 'SP',
      logoColor: typeof raw.logoColor === 'string' ? raw.logoColor.slice(0, 24) : '#0A4D2E',
      logoDataUrl:
        typeof raw.logoDataUrl === 'string' && raw.logoDataUrl.length <= 400000
          ? raw.logoDataUrl
          : undefined,
      coverTheme: typeof raw.coverTheme === 'string' ? raw.coverTheme.slice(0, 40) : 'hero_trade',
      followersCount: asInt(raw.followersCount, 0),
      viewsCount: asInt(raw.viewsCount, 0),
      isOnline: Boolean(raw.isOnline),
      lastSeenAt: raw.lastSeenAt ? asFirestoreTimestamp(raw.lastSeenAt) : serverTimestamp(),
      showOnlineStatus: raw.showOnlineStatus !== false,
      status: raw.status === 'blocked' ? 'blocked' : 'active',
      lastPaymentId:
        typeof raw.lastPaymentId === 'string' && /^[a-zA-Z0-9_-]+$/.test(raw.lastPaymentId)
          ? oldPayIdToUuid[raw.lastPaymentId] || raw.lastPaymentId
          : undefined,
      createdAt: asFirestoreTimestamp(raw.createdAt),
      updatedAt: serverTimestamp(),
    });

    phase1Ops.push({
      type: 'set',
      ref: doc(db, 'businesses', bizUuid),
      data: bizPayload,
    });
    report.migratedBusinesses += 1;

    // Migrate business reviews subcollection
    const reviewsSnap = await getDocs(collection(db, 'businesses', d.id, 'reviews'));
    for (const rDoc of reviewsSnap.docs) {
      const rRaw = rDoc.data();
      const revAuthUid =
        (typeof rRaw.auth_uid === 'string' && rRaw.auth_uid) ||
        (typeof rRaw.authorId === 'string' && rRaw.authorId) ||
        'unknown';
      const reviewUuid = isUuid(rRaw.review_id)
        ? rRaw.review_id
        : isUuid(rDoc.id)
          ? rDoc.id
          : resolveLegacyOrUuid(rDoc.id, 'legacy_rev');
      const revUserUuid = isUuid(rRaw.user_id)
        ? rRaw.user_id
        : resolveUserUuidFromAuthUid(revAuthUid, authUidToUserUuid);

      phase3Ops.push({
        type: 'set',
        ref: doc(db, 'businesses', bizUuid, 'reviews', reviewUuid),
        data: {
          review_id: reviewUuid,
          business_id: bizUuid,
          user_id: revUserUuid,
          auth_uid: revAuthUid,
          rating: typeof rRaw.rating === 'number' ? Math.max(1, Math.min(5, Math.round(rRaw.rating))) : 5,
          comment: asNonEmptyString(rRaw.comment, 'Verified review', 2, 800),
          createdAt: asFirestoreTimestamp(rRaw.createdAt),
        },
      });
      report.migratedSubdocs += 1;

      if (d.id !== bizUuid || rDoc.id !== reviewUuid) {
        deleteSubOps.push({ type: 'delete', ref: rDoc.ref });
      }
    }

    if (d.id !== bizUuid) {
      deleteParentOps.push({ type: 'delete', ref: d.ref });
    }
  }

  // Phase 2: Products
  for (const d of prodSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.sellerId === 'string' && raw.sellerId) ||
      'unknown';
    const prodUuid = oldProdIdToUuid[d.id];
    const bizUuid = isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`, oldBizIdToUuid);
    const userUuid = isUuid(raw.user_id)
      ? raw.user_id
      : resolveUserUuidFromAuthUid(authUid, authUidToUserUuid);

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'products', prodUuid),
      data: cleanFirestoreWriteObj({
        product_id: prodUuid,
        business_id: bizUuid,
        user_id: userUuid,
        auth_uid: authUid,
        title: asNonEmptyString(raw.title, 'Marketplace Product', 2, 140),
        description: asNonEmptyString(raw.description, 'Global product listing', 2, 2000),
        price: typeof raw.price === 'number' && raw.price > 0 ? raw.price : 1,
        stock: asInt(raw.stock, 0),
        category: asValidCategory(raw.category),
        imageTheme: typeof raw.imageTheme === 'string' ? raw.imageTheme.slice(0, 60) : undefined,
        imageDataUrl:
          typeof raw.imageDataUrl === 'string' && raw.imageDataUrl.length <= 400000
            ? raw.imageDataUrl
            : undefined,
        boosted: Boolean(raw.boosted),
        status: raw.status === 'hidden' ? 'hidden' : 'active',
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      }),
    });
    report.migratedProducts += 1;
    if (d.id !== prodUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2 & 3: Posts, Likes & Comments
  for (const d of postSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.authorId === 'string' && raw.authorId) ||
      'unknown';
    const postUuid = oldPostIdToUuid[d.id];
    const userUuid = isUuid(raw.user_id)
      ? raw.user_id
      : resolveUserUuidFromAuthUid(authUid, authUidToUserUuid);
    const bizUuid = isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`, oldBizIdToUuid);
    const postType =
      raw.postType === 'photo' || raw.postType === 'video' || raw.postType === 'offer'
        ? raw.postType
        : 'update';

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'posts', postUuid),
      data: cleanFirestoreWriteObj({
        post_id: postUuid,
        user_id: userUuid,
        business_id: bizUuid,
        auth_uid: authUid,
        postType,
        content: asNonEmptyString(raw.content, 'Business update', 1, 3000),
        mediaDataUrl:
          typeof raw.mediaDataUrl === 'string' && raw.mediaDataUrl.length <= 400000
            ? raw.mediaDataUrl
            : undefined,
        mediaTheme: typeof raw.mediaTheme === 'string' ? raw.mediaTheme.slice(0, 60) : undefined,
        offerPrice: typeof raw.offerPrice === 'number' && raw.offerPrice >= 0 ? raw.offerPrice : undefined,
        offerProductTitle:
          typeof raw.offerProductTitle === 'string' && raw.offerProductTitle.trim()
            ? raw.offerProductTitle.trim().slice(0, 140)
            : undefined,
        likesCount: asInt(raw.likesCount, 0),
        commentsCount: asInt(raw.commentsCount, 0),
        sharesCount: asInt(raw.sharesCount, 0),
        status: raw.status === 'hidden' ? 'hidden' : 'active',
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      }),
    });
    report.migratedPosts += 1;

    const [likesSnap, commentsSnap] = await Promise.all([
      getDocs(collection(db, 'posts', d.id, 'likes')),
      getDocs(collection(db, 'posts', d.id, 'comments')),
    ]);

    for (const lDoc of likesSnap.docs) {
      const lRaw = lDoc.data();
      const likeAuthUid =
        (typeof lRaw.auth_uid === 'string' && lRaw.auth_uid) ||
        (typeof lRaw.userId === 'string' && lRaw.userId) ||
        lDoc.id;
      const likeUserUuid = isUuid(lRaw.user_id)
        ? lRaw.user_id
        : resolveUserUuidFromAuthUid(likeAuthUid, authUidToUserUuid);
      phase3Ops.push({
        type: 'set',
        ref: doc(db, 'posts', postUuid, 'likes', likeUserUuid),
        data: {
          user_id: likeUserUuid,
          auth_uid: likeAuthUid,
          createdAt: asFirestoreTimestamp(lRaw.createdAt),
        },
      });
      report.migratedSubdocs += 1;
      if (d.id !== postUuid || lDoc.id !== likeUserUuid) {
        deleteSubOps.push({ type: 'delete', ref: lDoc.ref });
      }
    }

    for (const cDoc of commentsSnap.docs) {
      const cRaw = cDoc.data();
      const cAuthUid =
        (typeof cRaw.auth_uid === 'string' && cRaw.auth_uid) ||
        (typeof cRaw.authorId === 'string' && cRaw.authorId) ||
        'unknown';
      const commentUuid = isUuid(cRaw.comment_id)
        ? cRaw.comment_id
        : isUuid(cDoc.id)
          ? cDoc.id
          : resolveLegacyOrUuid(cDoc.id, 'legacy_cmt');
      const cUserUuid = isUuid(cRaw.user_id)
        ? cRaw.user_id
        : resolveUserUuidFromAuthUid(cAuthUid, authUidToUserUuid);
      phase3Ops.push({
        type: 'set',
        ref: doc(db, 'posts', postUuid, 'comments', commentUuid),
        data: {
          comment_id: commentUuid,
          post_id: postUuid,
          user_id: cUserUuid,
          auth_uid: cAuthUid,
          text: asNonEmptyString(cRaw.text, 'Comment', 1, 1000),
          createdAt: asFirestoreTimestamp(cRaw.createdAt),
        },
      });
      report.migratedSubdocs += 1;
      if (d.id !== postUuid || cDoc.id !== commentUuid) {
        deleteSubOps.push({ type: 'delete', ref: cDoc.ref });
      }
    }

    if (d.id !== postUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Stories
  for (const d of storySnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.authorId === 'string' && raw.authorId) ||
      'unknown';
    const storyUuid = oldStoryIdToUuid[d.id];
    const userUuid = isUuid(raw.user_id)
      ? raw.user_id
      : resolveUserUuidFromAuthUid(authUid, authUidToUserUuid);
    const bizUuid = isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`, oldBizIdToUuid);

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'stories', storyUuid),
      data: cleanFirestoreWriteObj({
        story_id: storyUuid,
        user_id: userUuid,
        business_id: bizUuid,
        auth_uid: authUid,
        headline: asNonEmptyString(raw.headline, 'Business Story', 2, 140),
        caption: typeof raw.caption === 'string' && raw.caption ? raw.caption.slice(0, 400) : undefined,
        mediaDataUrl:
          typeof raw.mediaDataUrl === 'string' && raw.mediaDataUrl.length <= 400000
            ? raw.mediaDataUrl
            : undefined,
        mediaTheme: typeof raw.mediaTheme === 'string' ? raw.mediaTheme.slice(0, 60) : undefined,
        ctaLabel: typeof raw.ctaLabel === 'string' && raw.ctaLabel ? raw.ctaLabel.slice(0, 60) : undefined,
        viewsCount: asInt(raw.viewsCount, 0),
        status: raw.status === 'expired' ? 'expired' : 'active',
        createdAt: asFirestoreTimestamp(raw.createdAt),
        expiresAt: asFirestoreTimestamp(raw.expiresAt),
      }),
    });
    report.migratedStories += 1;
    if (d.id !== storyUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Orders
  for (const d of orderSnap.docs) {
    const raw = d.data();
    const buyerAuthUid =
      (typeof raw.buyer_auth_uid === 'string' && raw.buyer_auth_uid) ||
      (typeof raw.buyerId === 'string' && raw.buyerId) ||
      'unknown';
    const sellerAuthUid =
      (typeof raw.seller_auth_uid === 'string' && raw.seller_auth_uid) ||
      (typeof raw.sellerId === 'string' && raw.sellerId) ||
      'unknown';
    const orderUuid = isUuid(raw.order_id)
      ? raw.order_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_order');
    const buyerUuid = isUuid(raw.buyer_id)
      ? raw.buyer_id
      : resolveUserUuidFromAuthUid(buyerAuthUid, authUidToUserUuid);
    const sellerUuid = isUuid(raw.seller_id)
      ? raw.seller_id
      : resolveUserUuidFromAuthUid(sellerAuthUid, authUidToUserUuid);
    const bizUuid = isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${sellerAuthUid}`, oldBizIdToUuid);
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items: OrderItem[] = (rawItems.length > 0 ? rawItems : [{ title: 'Order Item', price: 1, quantity: 1 }])
      .slice(0, 20)
      .map((item: any) => ({
        product_id: isUuid(item?.product_id)
          ? item.product_id
          : oldProdIdToUuid[item?.productId] || resolveLegacyOrUuid(item?.productId || 'item', 'legacy_prod'),
        title: asNonEmptyString(item?.title, 'Item', 1, 140),
        price: typeof item?.price === 'number' && item.price >= 0 ? item.price : 1,
        quantity: Math.max(1, asInt(item?.quantity, 1)),
      }));
    const totalAmount = typeof raw.totalAmount === 'number' && raw.totalAmount > 0 ? raw.totalAmount : 1;
    const split = calculateOrderSplit(totalAmount);

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'orders', orderUuid),
      data: cleanFirestoreWriteObj({
        order_id: orderUuid,
        buyer_id: buyerUuid,
        seller_id: sellerUuid,
        business_id: bizUuid,
        buyer_auth_uid: buyerAuthUid,
        seller_auth_uid: sellerAuthUid,
        buyerPhone: typeof raw.buyerPhone === 'string' ? raw.buyerPhone.slice(0, 32) : undefined,
        shippingAddress:
          typeof raw.shippingAddress === 'string' ? raw.shippingAddress.slice(0, 240) : undefined,
        items,
        totalAmount: split.grossAmount,
        platformFeeRate: split.platformFeeRate,
        platformFeeAmount: split.platformFeeAmount,
        sellerNetAmount: split.sellerNetAmount,
        feeStatus: raw.feeStatus === 'settled' ? 'settled' : 'deducted',
        paymentMethod: asValidPaymentMethod(raw.paymentMethod),
        status:
          raw.status === 'confirmed' || raw.status === 'shipped' || raw.status === 'delivered'
            ? raw.status
            : 'pending',
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      }),
    });
    report.migratedOrders += 1;
    if (d.id !== orderUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Follows
  for (const d of followSnap.docs) {
    const raw = d.data();
    const followerAuthUid =
      (typeof raw.follower_auth_uid === 'string' && raw.follower_auth_uid) ||
      (typeof raw.followerId === 'string' && raw.followerId) ||
      'unknown';
    const businessAuthUid =
      (typeof raw.business_auth_uid === 'string' && raw.business_auth_uid) ||
      (typeof raw.businessOwnerId === 'string' && raw.businessOwnerId) ||
      'unknown';
    const followerUuid = isUuid(raw.follower_user_id)
      ? raw.follower_user_id
      : resolveUserUuidFromAuthUid(followerAuthUid, authUidToUserUuid);
    const bizUuid = isUuid(raw.business_id)
      ? raw.business_id
      : resolveBusinessUuidFromRaw(raw.businessId || `biz_${businessAuthUid}`, oldBizIdToUuid);
    const bizUserUuid = isUuid(raw.business_user_id)
      ? raw.business_user_id
      : resolveUserUuidFromAuthUid(businessAuthUid, authUidToUserUuid);
    const followUuid = isUuid(raw.follow_id)
      ? raw.follow_id
      : isUuid(d.id)
        ? d.id
        : deterministicUuid(`follow:${followerUuid}:${bizUuid}`);

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'follows', followUuid),
      data: {
        follow_id: followUuid,
        follower_user_id: followerUuid,
        business_id: bizUuid,
        business_user_id: bizUserUuid,
        follower_auth_uid: followerAuthUid,
        business_auth_uid: businessAuthUid,
        createdAt: asFirestoreTimestamp(raw.createdAt),
      },
    });
    report.migratedFollows += 1;
    if (d.id !== followUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Friendships
  for (const d of friendSnap.docs) {
    const raw = d.data();
    const reqAuthUid =
      (typeof raw.requester_auth_uid === 'string' && raw.requester_auth_uid) ||
      (typeof raw.requesterId === 'string' && raw.requesterId) ||
      'unknown';
    const recAuthUid =
      (typeof raw.recipient_auth_uid === 'string' && raw.recipient_auth_uid) ||
      (typeof raw.recipientId === 'string' && raw.recipientId) ||
      'unknown';
    const reqUuid = isUuid(raw.requester_id)
      ? raw.requester_id
      : resolveUserUuidFromAuthUid(reqAuthUid, authUidToUserUuid);
    const recUuid = isUuid(raw.recipient_id)
      ? raw.recipient_id
      : resolveUserUuidFromAuthUid(recAuthUid, authUidToUserUuid);
    const pairUserIds = [reqUuid, recUuid].sort();
    const pairAuthUids = [reqAuthUid, recAuthUid].sort();
    const friendUuid = isUuid(raw.friendship_id)
      ? raw.friendship_id
      : isUuid(d.id)
        ? d.id
        : deterministicUuid(`friendship:${pairUserIds[0]}_${pairUserIds[1]}`);

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'friendships', friendUuid),
      data: {
        friendship_id: friendUuid,
        requester_id: reqUuid,
        recipient_id: recUuid,
        participant_user_ids: pairUserIds,
        participant_auth_uids: pairAuthUids,
        requester_auth_uid: reqAuthUid,
        recipient_auth_uid: recAuthUid,
        status: raw.status === 'accepted' || raw.status === 'declined' ? raw.status : 'pending',
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      },
    });
    report.migratedFriendships += 1;
    if (d.id !== friendUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Profile Views
  for (const d of viewSnap.docs) {
    const raw = d.data();
    const targetAuthUid =
      (typeof raw.target_auth_uid === 'string' && raw.target_auth_uid) ||
      (typeof raw.targetOwnerId === 'string' && raw.targetOwnerId) ||
      'unknown';
    const viewerAuthUid =
      (typeof raw.viewer_auth_uid === 'string' && raw.viewer_auth_uid) ||
      (typeof raw.viewerId === 'string' && raw.viewerId) ||
      'unknown';
    const viewUuid = isUuid(raw.view_id)
      ? raw.view_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_view');

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'profileViews', viewUuid),
      data: {
        view_id: viewUuid,
        business_id: isUuid(raw.business_id)
          ? raw.business_id
          : resolveBusinessUuidFromRaw(raw.businessId || `biz_${targetAuthUid}`, oldBizIdToUuid),
        target_user_id: isUuid(raw.target_user_id)
          ? raw.target_user_id
          : resolveUserUuidFromAuthUid(targetAuthUid, authUidToUserUuid),
        viewer_user_id: isUuid(raw.viewer_user_id)
          ? raw.viewer_user_id
          : resolveUserUuidFromAuthUid(viewerAuthUid, authUidToUserUuid),
        target_auth_uid: targetAuthUid,
        viewer_auth_uid: viewerAuthUid,
        viewedAt: asFirestoreTimestamp(raw.viewedAt),
      },
    });
    report.migratedProfileViews += 1;
    if (d.id !== viewUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2 & 3: Groups, Members, Posts
  for (const d of groupSnap.docs) {
    const raw = d.data();
    const creatorAuthUid =
      (typeof raw.creator_auth_uid === 'string' && raw.creator_auth_uid) ||
      (typeof raw.creatorId === 'string' && raw.creatorId) ||
      'unknown';
    const groupUuid = oldGroupIdToUuid[d.id];
    const creatorUuid = isUuid(raw.creator_user_id)
      ? raw.creator_user_id
      : resolveUserUuidFromAuthUid(creatorAuthUid, authUidToUserUuid);

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'groups', groupUuid),
      data: cleanFirestoreWriteObj({
        group_id: groupUuid,
        creator_user_id: creatorUuid,
        creator_auth_uid: creatorAuthUid,
        name: asNonEmptyString(raw.name, 'Business Group', 2, 120),
        description: typeof raw.description === 'string' ? raw.description.slice(0, 800) : '',
        category: asNonEmptyString(raw.category, 'Trade', 1, 80),
        location: typeof raw.location === 'string' ? raw.location.slice(0, 80) : undefined,
        coverTheme: typeof raw.coverTheme === 'string' ? raw.coverTheme.slice(0, 40) : undefined,
        membersCount: asInt(raw.membersCount, 1),
        status: 'active',
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      }),
    });
    report.migratedGroups += 1;

    const [membersSnap, gPostsSnap] = await Promise.all([
      getDocs(collection(db, 'groups', d.id, 'members')),
      getDocs(collection(db, 'groups', d.id, 'posts')),
    ]);

    for (const mDoc of membersSnap.docs) {
      const mRaw = mDoc.data();
      const mAuthUid =
        (typeof mRaw.auth_uid === 'string' && mRaw.auth_uid) ||
        (typeof mRaw.userId === 'string' && mRaw.userId) ||
        mDoc.id;
      const mUserUuid = isUuid(mRaw.user_id)
        ? mRaw.user_id
        : resolveUserUuidFromAuthUid(mAuthUid, authUidToUserUuid);
      phase3Ops.push({
        type: 'set',
        ref: doc(db, 'groups', groupUuid, 'members', mUserUuid),
        data: {
          user_id: mUserUuid,
          auth_uid: mAuthUid,
          role: mRaw.role === 'admin' ? 'admin' : 'member',
          joinedAt: asFirestoreTimestamp(mRaw.joinedAt),
        },
      });
      report.migratedSubdocs += 1;
      if (d.id !== groupUuid || mDoc.id !== mUserUuid) {
        deleteSubOps.push({ type: 'delete', ref: mDoc.ref });
      }
    }

    for (const gpDoc of gPostsSnap.docs) {
      const gpRaw = gpDoc.data();
      const gpAuthUid =
        (typeof gpRaw.auth_uid === 'string' && gpRaw.auth_uid) ||
        (typeof gpRaw.authorId === 'string' && gpRaw.authorId) ||
        'unknown';
      const gpUuid = isUuid(gpRaw.group_post_id)
        ? gpRaw.group_post_id
        : isUuid(gpDoc.id)
          ? gpDoc.id
          : resolveLegacyOrUuid(gpDoc.id, 'legacy_gp');
      const gpUserUuid = isUuid(gpRaw.user_id)
        ? gpRaw.user_id
        : resolveUserUuidFromAuthUid(gpAuthUid, authUidToUserUuid);
      phase3Ops.push({
        type: 'set',
        ref: doc(db, 'groups', groupUuid, 'posts', gpUuid),
        data: {
          group_post_id: gpUuid,
          group_id: groupUuid,
          user_id: gpUserUuid,
          auth_uid: gpAuthUid,
          content: asNonEmptyString(gpRaw.content, 'Group update', 1, 2000),
          createdAt: asFirestoreTimestamp(gpRaw.createdAt),
        },
      });
      report.migratedSubdocs += 1;
      if (d.id !== groupUuid || gpDoc.id !== gpUuid) {
        deleteSubOps.push({ type: 'delete', ref: gpDoc.ref });
      }
    }

    if (d.id !== groupUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2 & 3: Chats & Messages
  for (const d of chatSnap.docs) {
    const raw = d.data();
    const type: 'direct' | 'group' = raw.type === 'group' ? 'group' : 'direct';
    const participantAuthUids: string[] = Array.isArray(raw.participant_auth_uids)
      ? raw.participant_auth_uids
      : Array.isArray(raw.participantIds)
        ? raw.participantIds
        : [];
    const paddedAuthUids =
      participantAuthUids.length >= 2
        ? participantAuthUids.slice(0, 25)
        : [participantAuthUids[0] || 'unknown', 'unknown_peer'];
    const participantUserIds = (
      Array.isArray(raw.participant_user_ids)
        ? raw.participant_user_ids.map((id: string) =>
            resolveUserUuidFromAuthUid(id, authUidToUserUuid)
          )
        : paddedAuthUids.map((uid) => resolveUserUuidFromAuthUid(uid, authUidToUserUuid))
    ).slice(0, 25);

    const chatUuid = isUuid(raw.chat_id)
      ? raw.chat_id
      : isUuid(d.id)
        ? d.id
        : type === 'direct'
          ? deterministicUuid(`direct_chat:${[...participantUserIds].sort().slice(0, 2).join('_')}`)
          : resolveLegacyOrUuid(d.id, 'legacy_chat');

    const createdByRaw = raw.created_by || raw.createdBy || paddedAuthUids[0];
    const createdByUuid = isUuid(raw.created_by)
      ? raw.created_by
      : resolveUserUuidFromAuthUid(createdByRaw, authUidToUserUuid);
    const lastSenderRaw = raw.last_sender_id || raw.lastSenderId;
    const unreadRaw: string[] = Array.isArray(raw.unread_by)
      ? raw.unread_by
      : Array.isArray(raw.unreadBy)
        ? raw.unreadBy
        : [];

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'chats', chatUuid),
      data: cleanFirestoreWriteObj({
        chat_id: chatUuid,
        type,
        name:
          type === 'group' && typeof raw.name === 'string' && raw.name.trim()
            ? raw.name.trim().slice(0, 120)
            : undefined,
        participant_user_ids: participantUserIds,
        participant_auth_uids: paddedAuthUids,
        lastMessage:
          typeof raw.lastMessage === 'string' ? raw.lastMessage.slice(0, 500) : undefined,
        last_sender_id: lastSenderRaw
          ? resolveUserUuidFromAuthUid(lastSenderRaw, authUidToUserUuid)
          : undefined,
        unread_by: unreadRaw
          .map((id) => resolveUserUuidFromAuthUid(id, authUidToUserUuid))
          .slice(0, 25),
        created_by: createdByUuid,
        lastMessageAt: raw.lastMessageAt ? asFirestoreTimestamp(raw.lastMessageAt) : undefined,
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      }),
    });
    report.migratedChats += 1;

    const msgsSnap = await getDocs(collection(db, 'chats', d.id, 'messages'));
    for (const mDoc of msgsSnap.docs) {
      const mRaw = mDoc.data();
      const sAuthUid =
        (typeof mRaw.sender_auth_uid === 'string' && mRaw.sender_auth_uid) ||
        (typeof mRaw.senderId === 'string' && mRaw.senderId) ||
        paddedAuthUids[0];
      const msgUuid = isUuid(mRaw.message_id)
        ? mRaw.message_id
        : isUuid(mDoc.id)
          ? mDoc.id
          : resolveLegacyOrUuid(mDoc.id, 'legacy_msg');
      const sUserUuid = isUuid(mRaw.sender_id)
        ? mRaw.sender_id
        : resolveUserUuidFromAuthUid(sAuthUid, authUidToUserUuid);

      phase3Ops.push({
        type: 'set',
        ref: doc(db, 'chats', chatUuid, 'messages', msgUuid),
        data: cleanFirestoreWriteObj({
          message_id: msgUuid,
          chat_id: chatUuid,
          sender_id: sUserUuid,
          sender_auth_uid: sAuthUid,
          participant_user_ids: participantUserIds,
          participant_auth_uids: paddedAuthUids,
          type: mRaw.type === 'photo' || mRaw.type === 'voice' ? mRaw.type : 'text',
          text: typeof mRaw.text === 'string' ? mRaw.text.slice(0, 2000) : undefined,
          mediaDataUrl:
            typeof mRaw.mediaDataUrl === 'string' && mRaw.mediaDataUrl.length <= 400000
              ? mRaw.mediaDataUrl
              : undefined,
          voiceDurationSec:
            typeof mRaw.voiceDurationSec === 'number'
              ? Math.max(1, Math.min(300, Math.round(mRaw.voiceDurationSec)))
              : undefined,
          createdAt: asFirestoreTimestamp(mRaw.createdAt),
        }),
      });
      report.migratedMessages += 1;
      if (d.id !== chatUuid || mDoc.id !== msgUuid) {
        deleteSubOps.push({ type: 'delete', ref: mDoc.ref });
      }
    }

    if (d.id !== chatUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2 & 3: Calls & Candidates
  for (const d of callSnap.docs) {
    const raw = d.data();
    const callerAuthUid =
      (typeof raw.caller_auth_uid === 'string' && raw.caller_auth_uid) ||
      (typeof raw.callerId === 'string' && raw.callerId) ||
      'unknown';
    const calleeAuthUid =
      (typeof raw.callee_auth_uid === 'string' && raw.callee_auth_uid) ||
      (typeof raw.calleeId === 'string' && raw.calleeId) ||
      'unknown_peer';
    const callerUserUuid = isUuid(raw.caller_user_id)
      ? raw.caller_user_id
      : resolveUserUuidFromAuthUid(callerAuthUid, authUidToUserUuid);
    const calleeUserUuid = isUuid(raw.callee_user_id)
      ? raw.callee_user_id
      : resolveUserUuidFromAuthUid(calleeAuthUid, authUidToUserUuid);
    const pairUsers = [callerUserUuid, calleeUserUuid].sort();
    const pairAuths = [callerAuthUid, calleeAuthUid].sort();
    const callUuid = isUuid(raw.call_id)
      ? raw.call_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_call');
    const rawSdp = typeof raw.offerSdp === 'string' && raw.offerSdp.length >= 10 ? raw.offerSdp : 'migrated-call-sdp';

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'calls', callUuid),
      data: cleanFirestoreWriteObj({
        call_id: callUuid,
        chat_id:
          raw.chat_id || raw.chatId
            ? resolveLegacyOrUuid(raw.chat_id || raw.chatId, 'legacy_chat')
            : undefined,
        callType: raw.callType === 'video' ? 'video' : 'audio',
        caller_user_id: callerUserUuid,
        callee_user_id: calleeUserUuid,
        caller_business_id:
          raw.caller_business_id || raw.callerBusinessId
            ? resolveBusinessUuidFromRaw(
                raw.caller_business_id || raw.callerBusinessId,
                oldBizIdToUuid
              )
            : undefined,
        callee_business_id:
          raw.callee_business_id || raw.calleeBusinessId
            ? resolveBusinessUuidFromRaw(
                raw.callee_business_id || raw.calleeBusinessId,
                oldBizIdToUuid
              )
            : undefined,
        participant_user_ids: pairUsers,
        participant_auth_uids: pairAuths,
        caller_auth_uid: callerAuthUid,
        callee_auth_uid: calleeAuthUid,
        status:
          raw.status === 'active' ||
          raw.status === 'ended' ||
          raw.status === 'declined' ||
          raw.status === 'missed'
            ? raw.status
            : 'ended',
        offerSdp: rawSdp.slice(0, 20000),
        answerSdp:
          typeof raw.answerSdp === 'string' ? raw.answerSdp.slice(0, 20000) : undefined,
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      }),
    });
    report.migratedCalls += 1;

    const candSnap = await getDocs(collection(db, 'calls', d.id, 'candidates'));
    for (const cDoc of candSnap.docs) {
      const cRaw = cDoc.data();
      const sAuthUid =
        (typeof cRaw.sender_auth_uid === 'string' && cRaw.sender_auth_uid) ||
        (typeof cRaw.senderId === 'string' && cRaw.senderId) ||
        callerAuthUid;
      const candUuid = isUuid(cRaw.candidate_id)
        ? cRaw.candidate_id
        : isUuid(cDoc.id)
          ? cDoc.id
          : resolveLegacyOrUuid(cDoc.id, 'legacy_cand');
      const sUserUuid = isUuid(cRaw.sender_user_id)
        ? cRaw.sender_user_id
        : resolveUserUuidFromAuthUid(sAuthUid, authUidToUserUuid);

      phase3Ops.push({
        type: 'set',
        ref: doc(db, 'calls', callUuid, 'candidates', candUuid),
        data: {
          candidate_id: candUuid,
          call_id: callUuid,
          sender_user_id: sUserUuid,
          sender_auth_uid: sAuthUid,
          role: cRaw.role === 'callee' ? 'callee' : 'caller',
          participant_user_ids: pairUsers,
          participant_auth_uids: pairAuths,
          candidateJson:
            typeof cRaw.candidateJson === 'string' && cRaw.candidateJson.length >= 2
              ? cRaw.candidateJson.slice(0, 2000)
              : '{}',
          createdAt: asFirestoreTimestamp(cRaw.createdAt),
        },
      });
      report.migratedSubdocs += 1;
      if (d.id !== callUuid || cDoc.id !== candUuid) {
        deleteSubOps.push({ type: 'delete', ref: cDoc.ref });
      }
    }

    if (d.id !== callUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Payments
  for (const d of paymentSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.userId === 'string' && raw.userId) ||
      'guest';
    const isGuest = authUid === 'guest';
    const payUuid = oldPayIdToUuid[d.id];
    const userUuid = isGuest
      ? GUEST_USER_ID
      : isUuid(raw.user_id)
        ? raw.user_id
        : resolveUserUuidFromAuthUid(authUid, authUidToUserUuid);
    const bizUuid = isGuest
      ? GUEST_BUSINESS_ID
      : isUuid(raw.business_id)
        ? raw.business_id
        : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`, oldBizIdToUuid);
    const plan =
      raw.plan === 'basic' || raw.plan === 'pro' || raw.plan === 'premium'
        ? raw.plan
        : 'ad_slot';
    const amount = plan === 'ad_slot' ? 12 : typeof raw.amount === 'number' && raw.amount > 0 ? raw.amount : 5;

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'payments', payUuid),
      data: cleanFirestoreWriteObj({
        payment_id: payUuid,
        user_id: userUuid,
        business_id: bizUuid,
        auth_uid: authUid,
        plan,
        advert_id:
          raw.advert_id || raw.advertId
            ? oldAdvIdToUuid[raw.advert_id || raw.advertId] ||
              resolveLegacyOrUuid(raw.advert_id || raw.advertId, 'legacy_adv')
            : undefined,
        amount,
        method: asValidPaymentMethod(raw.method),
        reference: asNonEmptyString(raw.reference, 'SWP-MIGRATED', 2, 100),
        paybillNumber:
          typeof raw.paybillNumber === 'string' ? raw.paybillNumber.slice(0, 20) : undefined,
        accountNumber:
          typeof raw.accountNumber === 'string' ? raw.accountNumber.slice(0, 32) : undefined,
        payerPhone: typeof raw.payerPhone === 'string' ? raw.payerPhone.slice(0, 32) : undefined,
        amountKes: typeof raw.amountKes === 'number' && raw.amountKes >= 0 ? raw.amountKes : undefined,
        status: raw.status === 'refunded' ? 'refunded' : 'completed',
        createdAt: asFirestoreTimestamp(raw.createdAt),
      }),
    });
    report.migratedPayments += 1;
    if (d.id !== payUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Adverts
  for (const d of advertSnap.docs) {
    const raw = d.data();
    const authUid =
      (typeof raw.auth_uid === 'string' && raw.auth_uid) ||
      (typeof raw.ownerId === 'string' && raw.ownerId) ||
      'guest';
    const isGuest = authUid === 'guest' || raw.advertiserType === 'guest';
    const advUuid = oldAdvIdToUuid[d.id];
    const userUuid = isGuest
      ? GUEST_USER_ID
      : isUuid(raw.user_id)
        ? raw.user_id
        : resolveUserUuidFromAuthUid(authUid, authUidToUserUuid);
    const bizUuid = isGuest
      ? GUEST_BUSINESS_ID
      : isUuid(raw.business_id)
        ? raw.business_id
        : resolveBusinessUuidFromRaw(raw.businessId || `biz_${authUid}`, oldBizIdToUuid);
    const advertiserName =
      (typeof raw.advertiser_name === 'string' && raw.advertiser_name.trim()) ||
      (typeof raw.businessName === 'string' && raw.businessName.trim()) ||
      undefined;

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'adverts', advUuid),
      data: cleanFirestoreWriteObj({
        advert_id: advUuid,
        user_id: userUuid,
        business_id: bizUuid,
        auth_uid: authUid,
        advertiserType: isGuest ? 'guest' : 'user',
        advertiser_name: advertiserName ? advertiserName.slice(0, 120) : undefined,
        title: asNonEmptyString(raw.title, 'Sponsored Spotlight', 2, 140),
        description:
          typeof raw.description === 'string' ? raw.description.slice(0, 600) : undefined,
        targetRegion: asNonEmptyString(raw.targetRegion, 'Global', 1, 80),
        ctaLabel: typeof raw.ctaLabel === 'string' ? raw.ctaLabel.slice(0, 40) : undefined,
        ctaUrl: typeof raw.ctaUrl === 'string' ? raw.ctaUrl.slice(0, 300) : undefined,
        mediaDataUrl:
          typeof raw.mediaDataUrl === 'string' && raw.mediaDataUrl.length <= 400000
            ? raw.mediaDataUrl
            : undefined,
        mediaTheme: typeof raw.mediaTheme === 'string' ? raw.mediaTheme.slice(0, 60) : undefined,
        budgetTier:
          raw.budgetTier === 'basic' || raw.budgetTier === 'pro' || raw.budgetTier === 'premium'
            ? raw.budgetTier
            : 'ad_slot',
        priceUsd: raw.priceUsd === 12 ? 12 : undefined,
        paymentStatus:
          raw.paymentStatus === 'paid' || raw.paymentStatus === 'pending'
            ? raw.paymentStatus
            : undefined,
        payment_id:
          raw.payment_id || raw.paymentId
            ? oldPayIdToUuid[raw.payment_id || raw.paymentId] ||
              resolveLegacyOrUuid(raw.payment_id || raw.paymentId, 'legacy_pay')
            : undefined,
        paymentMethod: raw.paymentMethod ? asValidPaymentMethod(raw.paymentMethod) : undefined,
        paymentReference:
          typeof raw.paymentReference === 'string' && raw.paymentReference.trim().length >= 2
            ? raw.paymentReference.trim().slice(0, 100)
            : undefined,
        status: raw.status === 'approved' || raw.status === 'paused' ? raw.status : 'pending',
        impressions: asInt(raw.impressions, 0),
        clicks: asInt(raw.clicks, 0),
        createdAt: asFirestoreTimestamp(raw.createdAt),
        updatedAt: serverTimestamp(),
      }),
    });
    report.migratedAdverts += 1;
    if (d.id !== advUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Phase 2: Notifications
  for (const d of notifSnap.docs) {
    const raw = d.data();
    const recAuthUid =
      (typeof raw.recipient_auth_uid === 'string' && raw.recipient_auth_uid) ||
      (typeof raw.recipientId === 'string' && raw.recipientId) ||
      'unknown';
    const notifUuid = isUuid(raw.notification_id)
      ? raw.notification_id
      : isUuid(d.id)
        ? d.id
        : resolveLegacyOrUuid(d.id, 'legacy_notif');
    const recUserUuid = isUuid(raw.recipient_user_id)
      ? raw.recipient_user_id
      : resolveUserUuidFromAuthUid(recAuthUid, authUidToUserUuid);

    phase2Ops.push({
      type: 'set',
      ref: doc(db, 'notifications', notifUuid),
      data: cleanFirestoreWriteObj({
        notification_id: notifUuid,
        recipient_user_id: recUserUuid,
        recipient_auth_uid: recAuthUid,
        actor_user_id: raw.actor_user_id
          ? resolveUserUuidFromAuthUid(raw.actor_user_id, authUidToUserUuid)
          : undefined,
        actor_business_id: raw.actor_business_id
          ? resolveBusinessUuidFromRaw(raw.actor_business_id, oldBizIdToUuid)
          : undefined,
        type:
          raw.type === 'follower' ||
          raw.type === 'message' ||
          raw.type === 'order' ||
          raw.type === 'comment' ||
          raw.type === 'advert' ||
          raw.type === 'friend'
            ? raw.type
            : 'advert',
        title: asNonEmptyString(raw.title, 'Notification', 1, 140),
        body: asNonEmptyString(raw.body, 'Activity update', 1, 300),
        read: Boolean(raw.read),
        targetTab: typeof raw.targetTab === 'string' ? raw.targetTab.slice(0, 40) : undefined,
        createdAt: asFirestoreTimestamp(raw.createdAt),
      }),
    });
    report.migratedNotifications += 1;
    if (d.id !== notifUuid) deleteParentOps.push({ type: 'delete', ref: d.ref });
  }

  // Commit in strict dependency order so every Firestore rule check (exists/get) passes
  await commitOpsInChunks(db, phase1Ops);
  await commitOpsInChunks(db, phase2Ops);
  await commitOpsInChunks(db, phase3Ops);

  // Only delete legacy non-UUID records AFTER all canonical UUID writes succeeded
  await commitOpsInChunks(db, deleteSubOps);
  await commitOpsInChunks(db, deleteParentOps);

  report.deletedLegacyDocs = deleteSubOps.length + deleteParentOps.length;
  report.completedAt = new Date().toISOString();
  return report;
}
