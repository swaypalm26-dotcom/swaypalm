export type PlanTier = 'free' | 'basic' | 'pro' | 'premium';

export type BusinessCategory =
  | 'Beauty'
  | 'Fashion'
  | 'Food'
  | 'Tourism'
  | 'Electronics'
  | 'Agriculture'
  | 'Services'
  | 'Real Estate'
  | 'Health';

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  'Beauty',
  'Fashion',
  'Food',
  'Tourism',
  'Electronics',
  'Agriculture',
  'Services',
  'Real Estate',
  'Health',
];

export type PaymentMethod = 'M-Pesa' | 'Airtel Money' | 'Card' | 'PayPal' | 'Stripe';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'M-Pesa',
  'Airtel Money',
  'Card',
  'PayPal',
  'Stripe',
];

export const PAYBILL_CONFIG = {
  paybillNumber: '247247',
  accountNumber: '0460180118328',
  providerLabel: 'M-Pesa Paybill (Equity Bank)',
  kesPerUsd: 130,
} as const;

export const AD_PLAY_PRICE_USD = 12;
export const AD_PLAY_PRICE_KES = AD_PLAY_PRICE_USD * PAYBILL_CONFIG.kesPerUsd;

export const VALIDATION_LIMITS = {
  NAME_MAX: 120,
  TAGLINE_MAX: 180,
  ABOUT_MAX: 2000,
  POST_CONTENT_MAX: 3000,
  COMMENT_MAX: 1000,
  PRODUCT_TITLE_MAX: 140,
  PRODUCT_DESC_MAX: 2000,
  GROUP_NAME_MAX: 120,
  GROUP_DESC_MAX: 800,
  MESSAGE_MAX: 2000,
  STORY_HEADLINE_MAX: 140,
  STORY_CAPTION_MAX: 400,
  PHONE_MAX: 32,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  UUID_PATTERN: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
} as const;

export type AppPage =
  | 'home'
  | 'explore'
  | 'marketplace'
  | 'chat'
  | 'groups'
  | 'friends'
  | 'profile'
  | 'saved'
  | 'dashboard'
  | 'advertise'
  | 'notifications'
  | 'admin'
  | 'settings';

export interface UserAuthLink {
  auth_uid: string;
  user_id: string;
  createdAt: any;
}

export interface UserProfile {
  /** Immutable UUID primary key (never changes even if email/phone/name changes). */
  id: string;
  /** Firebase Auth UID link used strictly for authentication & security rules scoping. */
  auth_uid: string;
  /** Immutable UUID foreign key referencing businesses.business_id. */
  business_id: string;
  displayName: string;
  email: string;
  emailCodeVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  country?: string;
  city?: string;
  businessType?: string;
  plan: PlanTier;
  verified: boolean;
  role: 'member' | 'admin';
  status: 'active' | 'blocked';
  savedPostIds?: string[];
  lastPaymentId?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Business {
  /** Immutable UUID primary key. */
  business_id: string;
  /** Immutable UUID foreign key referencing users.id. */
  user_id: string;
  /** Firebase Auth UID for security rules ownership verification. */
  auth_uid: string;
  /** Public personal name of the owner (synced live on account displayName update). */
  ownerName?: string;
  name: string;
  category: BusinessCategory;
  country: string;
  city: string;
  tagline?: string;
  about?: string;
  whatsapp?: string;
  rating: number;
  reviewCount: number;
  plan: PlanTier;
  verified: boolean;
  logoInitials: string;
  logoColor: string;
  logoDataUrl?: string;
  coverTheme: string;
  followersCount: number;
  viewsCount: number;
  isOnline?: boolean;
  lastSeenAt?: any;
  showOnlineStatus?: boolean;
  status: 'active' | 'blocked';
  lastPaymentId?: string;
  createdAt: any;
  updatedAt: any;
  isSample?: boolean;
}

export interface BusinessReview {
  review_id: string;
  business_id: string;
  user_id: string;
  auth_uid: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface FeedPost {
  post_id: string;
  user_id: string;
  business_id: string;
  auth_uid: string;
  postType: 'update' | 'photo' | 'video' | 'offer';
  content: string;
  mediaDataUrl?: string;
  mediaTheme?: string;
  offerPrice?: number;
  offerProductTitle?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  status: 'active' | 'hidden';
  createdAt: any;
  updatedAt: any;
}

export interface PostComment {
  comment_id: string;
  post_id: string;
  user_id: string;
  auth_uid: string;
  text: string;
  createdAt: any;
}

export interface BusinessStory {
  story_id: string;
  user_id: string;
  business_id: string;
  auth_uid: string;
  headline: string;
  caption?: string;
  mediaDataUrl?: string;
  mediaTheme?: string;
  ctaLabel?: string;
  viewsCount: number;
  status: 'active' | 'expired';
  createdAt: any;
  expiresAt: any;
}

export interface Product {
  product_id: string;
  business_id: string;
  user_id: string;
  auth_uid: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: BusinessCategory;
  imageTheme?: string;
  imageDataUrl?: string;
  boosted: boolean;
  status: 'active' | 'hidden';
  createdAt: any;
  updatedAt: any;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
}

export const PLATFORM_COMMISSION_RATE = 0.1;

export interface OrderCommissionSplit {
  grossAmount: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  sellerNetAmount: number;
}

export function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateOrderSplit(grossAmount: number): OrderCommissionSplit {
  const gross = Math.max(0, roundCurrency(grossAmount));
  const platformFeeAmount = roundCurrency(gross * PLATFORM_COMMISSION_RATE);
  const sellerNetAmount = roundCurrency(gross - platformFeeAmount);
  return {
    grossAmount: gross,
    platformFeeRate: PLATFORM_COMMISSION_RATE,
    platformFeeAmount,
    sellerNetAmount,
  };
}

export function getOrderCommissionBreakdown(
  order: Pick<Order, 'totalAmount' | 'platformFeeRate' | 'platformFeeAmount' | 'sellerNetAmount'>
): OrderCommissionSplit {
  if (
    typeof order.platformFeeAmount === 'number' &&
    typeof order.sellerNetAmount === 'number'
  ) {
    return {
      grossAmount: roundCurrency(order.totalAmount),
      platformFeeRate:
        typeof order.platformFeeRate === 'number'
          ? order.platformFeeRate
          : PLATFORM_COMMISSION_RATE,
      platformFeeAmount: roundCurrency(order.platformFeeAmount),
      sellerNetAmount: roundCurrency(order.sellerNetAmount),
    };
  }
  return calculateOrderSplit(order.totalAmount);
}

export interface Order {
  order_id: string;
  buyer_id: string;
  seller_id: string;
  business_id: string;
  buyer_auth_uid: string;
  seller_auth_uid: string;
  buyerPhone?: string;
  shippingAddress?: string;
  items: OrderItem[];
  totalAmount: number;
  platformFeeRate?: number;
  platformFeeAmount?: number;
  sellerNetAmount?: number;
  feeStatus?: 'deducted' | 'settled';
  paymentMethod: PaymentMethod;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: any;
  updatedAt: any;
}

export interface FollowRecord {
  follow_id: string;
  follower_user_id: string;
  business_id: string;
  business_user_id: string;
  follower_auth_uid: string;
  business_auth_uid: string;
  createdAt: any;
}

export interface Friendship {
  friendship_id: string;
  requester_id: string;
  recipient_id: string;
  participant_user_ids: string[];
  participant_auth_uids: string[];
  requester_auth_uid: string;
  recipient_auth_uid: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  updatedAt: any;
}

export interface ProfileViewRecord {
  view_id: string;
  business_id: string;
  target_user_id: string;
  viewer_user_id: string;
  target_auth_uid: string;
  viewer_auth_uid: string;
  viewedAt: any;
}

export interface BusinessGroup {
  group_id: string;
  creator_user_id: string;
  creator_auth_uid: string;
  name: string;
  description: string;
  category: string;
  location?: string;
  coverTheme?: string;
  membersCount: number;
  status: 'active';
  createdAt: any;
  updatedAt: any;
}

export interface GroupMember {
  user_id: string;
  auth_uid: string;
  role: 'member' | 'admin';
  joinedAt: any;
}

export interface GroupPost {
  group_post_id: string;
  group_id: string;
  user_id: string;
  auth_uid: string;
  content: string;
  createdAt: any;
}

export interface ChatThread {
  chat_id: string;
  type: 'direct' | 'group';
  /** Only populated for named group chats; never stores personal/business names for direct chats. */
  name?: string;
  participant_user_ids: string[];
  participant_auth_uids: string[];
  lastMessage?: string;
  last_sender_id?: string;
  unread_by?: string[];
  created_by: string;
  lastMessageAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  sender_auth_uid: string;
  participant_user_ids: string[];
  participant_auth_uids: string[];
  type: 'text' | 'photo' | 'voice';
  text?: string;
  mediaDataUrl?: string;
  voiceDurationSec?: number;
  createdAt: any;
}

export type CallType = 'audio' | 'video';

export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed';

export interface CallSession {
  call_id: string;
  chat_id?: string;
  callType: CallType;
  caller_user_id: string;
  callee_user_id: string;
  caller_business_id?: string;
  callee_business_id?: string;
  participant_user_ids: string[];
  participant_auth_uids: string[];
  caller_auth_uid: string;
  callee_auth_uid: string;
  status: CallStatus;
  offerSdp: string;
  answerSdp?: string;
  createdAt: any;
  updatedAt: any;
  isPreviewOnly?: boolean;
}

export interface AdvertCampaign {
  advert_id: string;
  user_id: string;
  business_id: string;
  auth_uid: string;
  advertiserType?: 'user' | 'guest';
  /** Display label reserved for anonymous non-user guest advertisers without a Business doc. */
  advertiser_name?: string;
  title: string;
  description?: string;
  targetRegion: string;
  ctaLabel?: string;
  ctaUrl?: string;
  mediaDataUrl?: string;
  mediaTheme?: string;
  budgetTier: 'ad_slot' | 'basic' | 'pro' | 'premium';
  priceUsd?: number;
  paymentStatus?: 'paid' | 'pending';
  payment_id?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  status: 'pending' | 'approved' | 'paused';
  impressions: number;
  clicks: number;
  createdAt: any;
  updatedAt: any;
}

export interface PaymentRecord {
  payment_id: string;
  user_id: string;
  business_id: string;
  auth_uid: string;
  advert_id?: string;
  plan: 'ad_slot' | 'basic' | 'pro' | 'premium';
  amount: number;
  method: PaymentMethod;
  reference: string;
  paybillNumber?: string;
  accountNumber?: string;
  payerPhone?: string;
  amountKes?: number;
  status: 'completed' | 'refunded';
  createdAt: any;
}

export interface AppNotification {
  notification_id: string;
  recipient_user_id: string;
  recipient_auth_uid: string;
  actor_user_id?: string;
  actor_business_id?: string;
  type: 'follower' | 'message' | 'order' | 'comment' | 'advert' | 'friend';
  title: string;
  body: string;
  read: boolean;
  targetTab?: AppPage;
  createdAt: any;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  price: number;
  cadence: string;
  audience: string;
  badgeText?: string;
  productLimitLabel: string;
  groupLimitLabel: string;
  boostsLabel: string;
  features: string[];
}

export interface SettingKitPreferences {
  ringtoneEnabled: boolean;
  startCallsMuted: boolean;
  preferHdVideo: boolean;
  desktopCallAlerts: boolean;
}
