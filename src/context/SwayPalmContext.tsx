import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  checkFirestoreConnection,
  db,
  googleProvider,
  handleFirestoreActionError,
  OperationType,
} from '../lib/firebase';
import {
  GUEST_BUSINESS_ID,
  GUEST_USER_ID,
  SAMPLE_OWNER_UUIDS,
  deterministicUuid,
  generateUuid,
  isUuid,
  resolveLegacyOrUuid,
} from '../lib/ids';
import {
  UuidMigrationReport,
  normalizeAdvertDoc,
  normalizeBusinessDoc,
  normalizeBusinessReviewDoc,
  normalizeCallDoc,
  normalizeChatDoc,
  normalizeChatMessageDoc,
  normalizeFollowDoc,
  normalizeFriendshipDoc,
  normalizeGroupDoc,
  normalizeGroupMemberDoc,
  normalizeGroupPostDoc,
  normalizeNotificationDoc,
  normalizeOrderDoc,
  normalizePaymentDoc,
  normalizePostCommentDoc,
  normalizePostDoc,
  normalizeProductDoc,
  normalizeProfileViewDoc,
  normalizeStoryDoc,
  normalizeUserDoc,
  runFullUuidMigration,
} from '../lib/migration';
import {
  clearNetworkErrorBanner,
  getFriendlyNetworkErrorMessage,
  getNetworkState,
  isNetworkError,
  NetworkHealthStatus,
  reportNetworkHealthy,
  reportNetworkIssue,
  reportNetworkOffline,
  safeFetchJson,
  subscribeNetworkState,
} from '../lib/network';
import {
  getPagePath,
  getPageUrl,
  normalizeExternalUrl,
  resolvePageFromLocation,
} from '../lib/urls';
import {
  AD_PLAY_PRICE_KES,
  AD_PLAY_PRICE_USD,
  AdvertCampaign,
  AppNotification,
  AppPage,
  Business,
  BusinessCategory,
  BusinessGroup,
  BusinessReview,
  BusinessStory,
  CallSession,
  CallType,
  CartItem,
  ChatMessage,
  ChatThread,
  FeedPost,
  FollowRecord,
  Friendship,
  GroupMember,
  GroupPost,
  Order,
  PaymentMethod,
  PaymentRecord,
  PostComment,
  Product,
  ProfileViewRecord,
  SettingKitPreferences,
  UserProfile,
  calculateOrderSplit,
} from '../types';
import {
  createLogoInitials,
  SAMPLE_BUSINESSES,
  SAMPLE_GROUPS,
  SAMPLE_POSTS,
  SAMPLE_PRODUCTS,
  SAMPLE_REVIEWS,
  SAMPLE_STORIES,
} from '../data/sampleCatalog';

export interface RegistrationDetails {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  password?: string;
  country: string;
  city: string;
  businessType: BusinessCategory;
}

export interface PaidAdvertInput {
  advertiserName: string;
  title: string;
  description?: string;
  targetRegion: string;
  ctaLabel?: string;
  ctaUrl?: string;
  mediaDataUrl?: string;
  mediaTheme?: string;
  method: PaymentMethod;
  reference: string;
  paybillNumber?: string;
  accountNumber?: string;
  payerPhone?: string;
  amountKes?: number;
  mpesaCode?: string;
  checkoutRequestId?: string;
  cardSandboxToken?: string;
  stripeSessionId?: string;
}

interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'error';
}

interface SwayPalmContextValue {
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  userUuid: string | null;
  userProfile: UserProfile | null;
  myBusiness: Business | null;
  isAdmin: boolean;
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  selectedBusinessId: string | null;
  openBusinessProfile: (businessId: string) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
  authMode: 'register' | 'login' | 'email_otp' | 'otp';
  setAuthMode: (mode: 'register' | 'login' | 'email_otp' | 'otp') => void;
  pendingEmailTarget: string;
  emailCodeDelivery: 'email' | 'sandbox_preview' | null;
  emailCodePreview: string | null;
  emailCodeVerifiedInSession: boolean;
  sendEmailVerificationCode: (email?: string, name?: string) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  refreshFirebaseEmailStatus: () => Promise<boolean>;
  pendingOtpCode: string | null;
  sendPhoneOtp: (phone: string) => string;
  verifyPhoneOtp: (code: string) => Promise<boolean>;

  businesses: Business[];
  posts: FeedPost[];
  stories: BusinessStory[];
  viewedStoryIds: Set<string>;
  products: Product[];
  groups: BusinessGroup[];
  follows: FollowRecord[];
  friendships: Friendship[];
  profileViews: ProfileViewRecord[];
  orders: Order[];
  chats: ChatThread[];
  adverts: AdvertCampaign[];
  playingAdverts: AdvertCampaign[];
  guestAdIds: string[];
  payments: PaymentRecord[];
  notifications: AppNotification[];
  likedPostIds: Set<string>;
  joinedGroupIds: Set<string>;
  cart: CartItem[];
  showCartDrawer: boolean;
  setShowCartDrawer: (open: boolean) => void;
  toasts: ToastMessage[];
  notifyToast: (text: string, tone?: 'success' | 'info' | 'error') => void;
  networkStatus: NetworkHealthStatus;
  networkError: string | null;
  isRetryingNetwork: boolean;
  retryNetworkConnection: () => Promise<boolean>;
  dismissNetworkError: () => void;

  // Dynamic UUID Name/Entity Resolution Helpers
  getBusinessById: (businessId?: string | null) => Business | undefined;
  getBusinessByUserId: (userId?: string | null) => Business | undefined;
  getDisplayBusinessName: (businessId?: string | null, userId?: string | null, fallback?: string) => string;
  getDisplayOwnerName: (userId?: string | null, businessId?: string | null, fallback?: string) => string;

  // Auth actions
  signInWithGoogle: (prefill?: Partial<RegistrationDetails>) => Promise<void>;
  registerWithEmailForm: (details: RegistrationDetails) => Promise<{ needsGoogleFallback?: boolean; message?: string }>;
  loginWithEmailForm: (emailOrPhone: string, password: string) => Promise<{ needsGoogleFallback?: boolean; message?: string }>;
  logout: () => Promise<void>;

  // Feed, Posts & Stories actions
  createPost: (input: {
    postType: 'update' | 'photo' | 'video' | 'offer';
    content: string;
    mediaDataUrl?: string;
    mediaTheme?: string;
    offerPrice?: number;
    offerProductTitle?: string;
  }) => Promise<void>;
  updatePost: (
    post: FeedPost,
    updates: { content: string; offerProductTitle?: string; offerPrice?: number }
  ) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  createStory: (input: {
    headline: string;
    caption?: string;
    mediaDataUrl?: string;
    mediaTheme?: string;
    ctaLabel?: string;
  }) => Promise<void>;
  markStoryViewed: (story: BusinessStory) => void;
  deleteStory: (storyId: string) => Promise<void>;
  toggleLikePost: (post: FeedPost) => Promise<void>;
  loadPostComments: (postId: string) => Promise<PostComment[]>;
  addPostComment: (post: FeedPost, text: string) => Promise<void>;
  sharePost: (post: FeedPost) => Promise<void>;
  toggleSavePost: (postId: string) => Promise<void>;
  toggleFollowBusiness: (business: Business) => Promise<void>;
  updateMyBusiness: (updates: Partial<Business>) => Promise<void>;
  loadBusinessReviews: (businessId: string) => Promise<BusinessReview[]>;
  submitBusinessReview: (business: Business, rating: number, comment: string) => Promise<void>;

  // Friends & Presence
  nowMs: number;
  toggleOnlineStatusVisibility: () => Promise<void>;
  sendFriendRequest: (targetBusiness: Business) => Promise<void>;
  respondFriendRequest: (friendship: Friendship, accept: boolean) => Promise<void>;

  // Marketplace & Cart
  addProduct: (input: {
    title: string;
    description: string;
    price: number;
    stock: number;
    category: BusinessCategory;
    imageDataUrl?: string;
  }) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  checkoutCart: (details: {
    buyerName: string;
    buyerPhone: string;
    shippingAddress: string;
    paymentMethod: PaymentMethod;
  }) => Promise<void>;
  updateOrderStatus: (order: Order, nextStatus: Order['status']) => Promise<void>;

  // Chat & Calls
  startDirectChat: (targetBusiness: Business, initialMessage?: string) => Promise<void>;
  createGroupChat: (name: string, participantBusinesses: Business[]) => Promise<void>;
  subscribeToChatMessages: (chatId: string, cb: (msgs: ChatMessage[]) => void) => () => void;
  sendChatMessage: (chat: ChatThread, payload: { type: 'text' | 'photo' | 'voice'; text?: string; mediaDataUrl?: string; voiceDurationSec?: number }) => Promise<void>;
  markChatRead: (chat: ChatThread) => Promise<void>;
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callConnectionState: 'idle' | 'ringing' | 'connecting' | 'connected' | 'preview';
  isMicMuted: boolean;
  isCameraEnabled: boolean;
  callElapsedSec: number;
  callMediaNotice: string | null;
  startCall: (targetBusiness: Business, callType: CallType, chatId?: string) => Promise<void>;
  acceptIncomingCall: (withVideo?: boolean) => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  endCurrentCall: () => Promise<void>;
  toggleMicMute: () => void;
  toggleCameraVideo: () => Promise<void>;

  // Groups
  createGroup: (input: { name: string; description: string; category: string; location: string }) => Promise<void>;
  toggleJoinGroup: (group: BusinessGroup) => Promise<void>;
  loadGroupDetails: (groupId: string) => Promise<{ members: GroupMember[]; posts: GroupPost[] }>;
  postInGroup: (groupId: string, content: string) => Promise<void>;

  // Subscriptions & Adverts
  subscribeToPlan: (
    plan: 'basic' | 'pro' | 'premium',
    method: PaymentMethod,
    reference: string,
    details?: {
      paybillNumber?: string;
      accountNumber?: string;
      payerPhone?: string;
      amountKes?: number;
      mpesaCode?: string;
      checkoutRequestId?: string;
      cardSandboxToken?: string;
      stripeSessionId?: string;
    }
  ) => Promise<boolean>;
  createPaidAdvert: (input: PaidAdvertInput) => Promise<AdvertCampaign | null>;
  recordAdvertImpression: (advertId: string) => void;
  recordAdvertClick: (advertId: string) => void;
  createAdvertCampaign: (input: { title: string; targetRegion: string }) => Promise<void>;

  // Notifications
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Admin & Migration
  adminUsers: UserProfile[];
  adminBusinesses: Business[];
  adminProducts: Product[];
  adminAdverts: AdvertCampaign[];
  adminPayments: PaymentRecord[];
  adminOrders: Order[];
  migrationStatus: {
    running: boolean;
    lastReport: UuidMigrationReport | null;
    error: string | null;
  };
  adminMigrateDatabaseToUuids: () => Promise<UuidMigrationReport | null>;
  adminSetBusinessStatus: (business: Business, status: 'active' | 'blocked') => Promise<void>;
  adminToggleVerifyBusiness: (business: Business) => Promise<void>;
  adminSetProductStatus: (product: Product, status: 'active' | 'hidden') => Promise<void>;
  adminSetAdvertStatus: (advert: AdvertCampaign, status: 'approved' | 'paused') => Promise<void>;
  adminMarkOrderFeeSettled: (order: Order) => Promise<void>;
  adminSeedSampleCatalog: () => Promise<void>;

  // Settings Kit
  settingPrefs: SettingKitPreferences;
  updateSettingPrefs: (patch: Partial<SettingKitPreferences>) => void;
  updateAccountSettings: (updates: {
    displayName: string;
    email?: string;
    phone: string;
    country: string;
    city: string;
    businessType: string;
  }) => Promise<void>;
  sendAccountPasswordReset: () => Promise<void>;
}

const SwayPalmContext = createContext<SwayPalmContextValue | null>(null);

const ADMIN_EMAIL = 'mbwanabadi001@gmail.com';

function toEpochMs(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  const parsed = new Date(val).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isSampleAuthUid(authUid?: string | null): boolean {
  return Boolean(authUid && authUid.startsWith('sample_auth_'));
}

export const SwayPalmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myBusiness, setMyBusiness] = useState<Business | null>(null);

  const [activePage, setActivePage] = useState<AppPage>(() => {
    if (typeof window === 'undefined') return 'home';
    return resolvePageFromLocation(window.location);
  });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q')?.trim() || '';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      setActivePage(resolvePageFromLocation(window.location));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const titles: Record<AppPage, string> = {
      home: 'SwayPalm26 (SwayPalm) — Global Business Network & Marketplace',
      explore: 'Explore Global Verified Businesses — SwayPalm26',
      profile: 'Business Profile — SwayPalm26',
      marketplace: 'B2B Marketplace & Global Trade — SwayPalm26',
      chat: 'Real-Time Business Chat & Calls — SwayPalm26',
      groups: 'Global Trade Groups — SwayPalm26',
      friends: 'Business Friends & Partner Network — SwayPalm26',
      saved: 'Saved Posts — SwayPalm26',
      dashboard: 'Business Owner Dashboard — SwayPalm26',
      advertise: 'Post Sponsored Ads ($12) & Plans — SwayPalm26',
      notifications: 'Notifications — SwayPalm26',
      admin: 'Admin & Google Search Console — SwayPalm26',
      settings: 'Settings Kit — SwayPalm26',
    };
    const descriptions: Record<AppPage, string> = {
      home: 'Search SwayPalm26 to connect with verified global businesses, showcase products, trade in the B2B marketplace, and launch $12 sponsored ads.',
      explore: 'Discover verified companies, wholesalers, exporters, and service providers worldwide on SwayPalm26.',
      profile: 'View verified business storefronts, product catalogs, reviews, and direct contact channels on SwayPalm26.',
      marketplace: 'Shop wholesale and retail products directly from verified SwayPalm26 businesses with M-Pesa Paybill and card checkout.',
      chat: 'Message connected business friends, see live online statuses, and host audio or video calls directly on SwayPalm26.',
      groups: 'Join regional and industry trade communities on SwayPalm26 to share leads, import/export insights, and partner globally.',
      friends: 'Connect with verified entrepreneurs, track online partner availability, and grow your global B2B network on SwayPalm26.',
      saved: 'Access your saved products, business posts, and trade opportunities on SwayPalm26.',
      dashboard: 'Manage your SwayPalm26 storefront, track sales and 10% platform settlements, view analytics, and monitor active ads.',
      advertise: 'Promote your brand to global buyers on SwayPalm26 for $12 per ad slot (open to members and guests) or choose a verified storefront plan.',
      notifications: 'Stay up to date with orders, friend requests, messages, and marketplace alerts on SwayPalm26.',
      admin: 'Administer SwayPalm26 platform operations, verify payments, and inspect Google Search Console indexing.',
      settings: 'Configure your SwayPalm26 business profile, preferences, data exports, and notification settings.',
    };
    const pageTitle = titles[activePage] || titles.home;
    const pageDescription = descriptions[activePage] || descriptions.home;
    document.title = pageTitle;

    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('card_checkout')) {
        params.delete('page');
        const targetPath = getPagePath(activePage);
        const queryString = params.toString();
        const nextUrl = queryString ? `${targetPath}?${queryString}` : targetPath;
        if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
          window.history.replaceState({}, '', nextUrl);
        }
      }
    } catch {
      // Ignore history restrictions in sandboxed/opaque contexts
    }

    const canonicalHref = getPageUrl(activePage);
    const setMetaContent = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) canonicalEl.setAttribute('href', canonicalHref);
    setMetaContent('meta[name="description"]', pageDescription);
    setMetaContent('meta[property="og:url"]', canonicalHref);
    setMetaContent('meta[property="og:title"]', pageTitle);
    setMetaContent('meta[property="og:description"]', pageDescription);
    setMetaContent('meta[name="twitter:title"]', pageTitle);
    setMetaContent('meta[name="twitter:description"]', pageDescription);
  }, [activePage]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'email_otp' | 'otp'>('register');
  const [pendingEmailTarget, setPendingEmailTarget] = useState<string>('');
  const [emailCodeDelivery, setEmailCodeDelivery] = useState<'email' | 'sandbox_preview' | null>(null);
  const [emailCodePreview, setEmailCodePreview] = useState<string | null>(null);
  const [emailCodeVerifiedInSession, setEmailCodeVerifiedInSession] = useState(false);
  const [pendingOtpCode, setPendingOtpCode] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string>('');
  const [pendingPrefill, setPendingPrefill] = useState<Partial<RegistrationDetails> | null>(null);

  // Live Firestore states
  const [liveBusinesses, setLiveBusinesses] = useState<Business[]>([]);
  const [livePosts, setLivePosts] = useState<FeedPost[]>([]);
  const [liveStories, setLiveStories] = useState<BusinessStory[]>([]);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [liveGroups, setLiveGroups] = useState<BusinessGroup[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [follows, setFollows] = useState<FollowRecord[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profileViews, setProfileViews] = useState<ProfileViewRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [adverts, setAdverts] = useState<AdvertCampaign[]>([]);
  const [playingAdverts, setPlayingAdverts] = useState<AdvertCampaign[]>([]);
  const [guestAdIds, setGuestAdIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('swaypalm_guest_ad_ids');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed
            .filter((id): id is string => typeof id === 'string')
            .map((id) => resolveLegacyOrUuid(id, 'legacy_adv'))
        : [];
    } catch {
      return [];
    }
  });
  const viewedAdvertSessionRef = useRef<Set<string>>(new Set());
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Admin collections & migration status
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminAdverts, setAdminAdverts] = useState<AdvertCampaign[]>([]);
  const [adminPayments, setAdminPayments] = useState<PaymentRecord[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<{
    running: boolean;
    lastReport: UuidMigrationReport | null;
    error: string | null;
  }>({
    running: false,
    lastReport: null,
    error: null,
  });

  // Showcase fallback interactions & hydrated live likes/memberships
  const [localLikes, setLocalLikes] = useState<Set<string>>(new Set());
  const [localLikedDelta, setLocalLikedDelta] = useState<Record<string, number>>({});
  const [localJoinedGroups, setLocalJoinedGroups] = useState<Set<string>>(new Set());

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('swaypalm_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && item.product && typeof item.quantity === 'number')
        .map((item) => ({
          product: normalizeProductDoc(
            item.product.product_id || item.product.id || 'cart_item',
            item.product
          ),
          quantity: Math.max(1, Math.floor(item.quantity)),
        }));
    } catch {
      return [];
    }
  });
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [networkStatus, setNetworkStatus] = useState<NetworkHealthStatus>(
    () => getNetworkState().status
  );
  const [networkError, setNetworkError] = useState<string | null>(
    () => getNetworkState().errorMessage
  );
  const [isRetryingNetwork, setIsRetryingNetwork] = useState(false);

  const [settingPrefs, setSettingPrefs] = useState<SettingKitPreferences>(() => {
    const defaults: SettingKitPreferences = {
      ringtoneEnabled: true,
      startCallsMuted: false,
      preferHdVideo: true,
      desktopCallAlerts: false,
    };
    try {
      const saved = localStorage.getItem('swaypalm_settings_kit');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });
  const settingPrefsRef = useRef<SettingKitPreferences>(settingPrefs);
  useEffect(() => {
    settingPrefsRef.current = settingPrefs;
  }, [settingPrefs]);

  // WebRTC Video & Audio Call state & refs
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callConnectionState, setCallConnectionState] = useState<
    'idle' | 'ringing' | 'connecting' | 'connected' | 'preview'
  >('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [callElapsedSec, setCallElapsedSec] = useState(0);
  const [callMediaNotice, setCallMediaNotice] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callDocUnsubRef = useRef<(() => void) | null>(null);
  const candidatesUnsubRef = useRef<(() => void) | null>(null);
  const addedCandidateIdsRef = useRef<Set<string>>(new Set());
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef<boolean>(false);
  const activeCallRef = useRef<CallSession | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const isAdmin =
    Boolean(firebaseUser?.email === ADMIN_EMAIL && firebaseUser?.emailVerified) ||
    userProfile?.role === 'admin';

  const notifyToast = (text: string, tone: 'success' | 'info' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleActionFirestoreError = (
    err: unknown,
    operationType: OperationType,
    path: string | null
  ): false => {
    return handleFirestoreActionError(err, operationType, path, (friendlyMsg) => {
      notifyToast(friendlyMsg, 'error');
    });
  };

  const handleListenerError = (label: string, err: unknown) => {
    if (isNetworkError(err)) {
      const msg = getFriendlyNetworkErrorMessage(
        err,
        'Live sync interrupted due to network instability.'
      );
      console.warn(`${label}:`, msg);
      reportNetworkIssue(msg);
    } else {
      console.error(label, err);
    }
  };

  const retryNetworkConnection = async (silent = false): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      reportNetworkOffline();
      if (!silent) {
        notifyToast('Still offline — please enable Wi-Fi or mobile data and retry.', 'error');
      }
      return false;
    }

    setIsRetryingNetwork(true);
    try {
      const res = await checkFirestoreConnection(true);
      if (res.ok) {
        if (!silent) {
          notifyToast('Connection restored — live SwayPalm data synced.', 'success');
        }
        return true;
      }
      if (!silent) {
        notifyToast(
          res.error || 'Could not reach SwayPalm servers. Please try again.',
          'error'
        );
      }
      return false;
    } finally {
      setIsRetryingNetwork(false);
    }
  };

  const dismissNetworkError = () => {
    clearNetworkErrorBanner();
  };

  useEffect(() => {
    const unsub = subscribeNetworkState((snap) => {
      setNetworkStatus(snap.status);
      setNetworkError(snap.errorMessage);
    });

    const handleOffline = () => {
      reportNetworkOffline();
    };
    const handleOnline = () => {
      void retryNetworkConnection(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      unsub();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('swaypalm_cart', JSON.stringify(cart));
    } catch {
      // ignore storage quota
    }
  }, [cart]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserUuid(null);
        setUserProfile(null);
        setMyBusiness(null);
        setFollows([]);
        setFriendships([]);
        setProfileViews([]);
        setOrders([]);
        setChats([]);
        setAdverts([]);
        setPayments([]);
        setNotifications([]);
        setAdminUsers([]);
        setAdminAdverts([]);
        setAdminPayments([]);
        setAdminOrders([]);
      }
    });
    return () => unsub();
  }, []);

  // Ensure immutable UUID user profile, userAuthLinks mapping & business doc exist (and migrate legacy Auth-UID doc if returning user)
  const ensureUserAndBusinessDocs = async (
    user: FirebaseUser,
    prefill?: Partial<RegistrationDetails> | null,
    markEmailCodeVerified = false
  ): Promise<{ isNewUser: boolean; userId: string }> => {
    const linkRef = doc(db, 'userAuthLinks', user.uid);
    let linkSnap;
    try {
      linkSnap = await getDoc(linkRef);
    } catch (err) {
      handleActionFirestoreError(err, OperationType.GET, `userAuthLinks/${user.uid}`);
      throw err;
    }

    if (linkSnap.exists()) {
      const linkedUserId = String(linkSnap.data().user_id || '');
      if (isUuid(linkedUserId)) {
        setUserUuid(linkedUserId);
        return { isNewUser: false, userId: linkedUserId };
      }
    }

    // Check if returning legacy user exists keyed by Firebase Auth UID
    const legacyUserRef = doc(db, 'users', user.uid);
    const legacyBizRef = doc(db, 'businesses', `biz_${user.uid}`);
    let legacyUserSnap;
    let legacyBizSnap;
    try {
      [legacyUserSnap, legacyBizSnap] = await Promise.all([
        getDoc(legacyUserRef),
        getDoc(legacyBizRef),
      ]);
    } catch (err) {
      handleActionFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      throw err;
    }

    if (legacyUserSnap.exists()) {
      const oldUser = legacyUserSnap.data();
      const newUserUuid = deterministicUuid(`legacy_user:${user.uid}`);
      const newBizUuid = deterministicUuid(`legacy_biz:biz_${user.uid}`);
      const oldBiz = legacyBizSnap.exists() ? legacyBizSnap.data() : null;

      const safeDisplayName = (
        (typeof oldUser.displayName === 'string' && oldUser.displayName.trim()) ||
        prefill?.fullName?.trim() ||
        user.displayName ||
        'Business Owner'
      ).slice(0, 100);

      const safeEmail = (
        (typeof oldUser.email === 'string' && oldUser.email.trim().length >= 3
          ? oldUser.email.trim()
          : '') ||
        user.email ||
        prefill?.email ||
        'member@swaypalm.com'
      ).slice(0, 160);

      const savedRaw = Array.isArray(oldUser.savedPostIds) ? oldUser.savedPostIds : [];
      const savedPostIds = savedRaw
        .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
        .map((x: string) => resolveLegacyOrUuid(x, 'legacy_post'))
        .slice(0, 50);

      const migratedUserPayload: Record<string, any> = {
        id: newUserUuid,
        auth_uid: user.uid,
        business_id: newBizUuid,
        displayName: safeDisplayName,
        email: safeEmail,
        emailCodeVerified: Boolean(oldUser.emailCodeVerified || markEmailCodeVerified),
        phone: (typeof oldUser.phone === 'string' ? oldUser.phone : prefill?.phone || '').slice(0, 32),
        phoneVerified: Boolean(oldUser.phoneVerified),
        country: (typeof oldUser.country === 'string' && oldUser.country.trim()
          ? oldUser.country
          : prefill?.country || 'Kenya'
        ).slice(0, 80),
        city: (typeof oldUser.city === 'string' && oldUser.city.trim()
          ? oldUser.city
          : prefill?.city || 'Nairobi'
        ).slice(0, 80),
        businessType: (typeof oldUser.businessType === 'string' && oldUser.businessType.trim()
          ? oldUser.businessType
          : prefill?.businessType || 'Services'
        ).slice(0, 80),
        plan: oldUser.plan || 'free',
        verified: Boolean(oldUser.verified),
        role: oldUser.role === 'admin' ? 'admin' : 'member',
        status: oldUser.status === 'blocked' ? 'blocked' : 'active',
        savedPostIds,
        createdAt: oldUser.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (typeof oldUser.lastPaymentId === 'string' && /^[a-zA-Z0-9_-]+$/.test(oldUser.lastPaymentId)) {
        migratedUserPayload.lastPaymentId = oldUser.lastPaymentId;
      }

      const bizName = (
        (oldBiz && typeof oldBiz.name === 'string' && oldBiz.name.trim().length >= 2
          ? oldBiz.name.trim()
          : '') ||
        prefill?.businessName?.trim() ||
        `${safeDisplayName} Enterprise`
      ).slice(0, 120);

      const migratedBizPayload: Record<string, any> = {
        business_id: newBizUuid,
        user_id: newUserUuid,
        auth_uid: user.uid,
        ownerName: safeDisplayName,
        name: bizName,
        category: oldBiz?.category || (prefill?.businessType as BusinessCategory) || 'Services',
        country: ((oldBiz?.country as string) || migratedUserPayload.country || 'Kenya').slice(0, 80),
        city: ((oldBiz?.city as string) || migratedUserPayload.city || 'Nairobi').slice(0, 80),
        tagline: ((oldBiz?.tagline as string) || 'Global business member on SwayPalm.').slice(0, 180),
        about: (
          (oldBiz?.about as string) ||
          `${bizName} connects with international suppliers, partners, and buyers on SwayPalm.`
        ).slice(0, 2000),
        whatsapp: ((oldBiz?.whatsapp as string) || migratedUserPayload.phone || '').slice(0, 32),
        rating: typeof oldBiz?.rating === 'number' && oldBiz.rating >= 0 && oldBiz.rating <= 5 ? oldBiz.rating : 5.0,
        reviewCount: typeof oldBiz?.reviewCount === 'number' ? Math.max(0, Math.floor(oldBiz.reviewCount)) : 0,
        plan: oldBiz?.plan || 'free',
        verified: Boolean(oldBiz?.verified),
        logoInitials: ((oldBiz?.logoInitials as string) || createLogoInitials(bizName)).slice(0, 4),
        logoColor: ((oldBiz?.logoColor as string) || '#0A4D2E').slice(0, 24),
        coverTheme: ((oldBiz?.coverTheme as string) || 'hero_trade').slice(0, 40),
        followersCount: typeof oldBiz?.followersCount === 'number' ? Math.max(0, Math.floor(oldBiz.followersCount)) : 0,
        viewsCount: typeof oldBiz?.viewsCount === 'number' ? Math.max(0, Math.floor(oldBiz.viewsCount)) : 0,
        isOnline: true,
        lastSeenAt: serverTimestamp(),
        showOnlineStatus: oldBiz?.showOnlineStatus !== false,
        status: oldBiz?.status === 'blocked' ? 'blocked' : 'active',
        createdAt: oldBiz?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (typeof oldBiz?.logoDataUrl === 'string' && oldBiz.logoDataUrl.length <= 400000) {
        migratedBizPayload.logoDataUrl = oldBiz.logoDataUrl;
      }
      if (typeof oldBiz?.lastPaymentId === 'string' && /^[a-zA-Z0-9_-]+$/.test(oldBiz.lastPaymentId)) {
        migratedBizPayload.lastPaymentId = oldBiz.lastPaymentId;
      }

      const batch = writeBatch(db);
      batch.set(linkRef, {
        auth_uid: user.uid,
        user_id: newUserUuid,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', newUserUuid), migratedUserPayload);
      batch.set(doc(db, 'businesses', newBizUuid), migratedBizPayload);

      try {
        await batch.commit();
        // Clean up legacy non-UUID user & business documents once atomic batch succeeds
        await deleteDoc(legacyUserRef).catch(() => {});
        if (legacyBizSnap.exists()) {
          await deleteDoc(legacyBizRef).catch(() => {});
        }
      } catch (err) {
        handleActionFirestoreError(err, OperationType.WRITE, `users/${newUserUuid}`);
        throw err;
      }

      setUserUuid(newUserUuid);
      return { isNewUser: false, userId: newUserUuid };
    }

    // Brand new account: generate fresh immutable UUIDs for user & business
    const displayName = (prefill?.fullName?.trim() || user.displayName || 'Business Owner').slice(0, 100);
    const email = (user.email || prefill?.email || 'member@swaypalm.com').slice(0, 160);
    const newUserUuid = generateUuid();
    const newBizUuid = generateUuid();
    const bizName = (prefill?.businessName?.trim() || `${displayName} Enterprise`).slice(0, 120);

    const batch = writeBatch(db);
    batch.set(linkRef, {
      auth_uid: user.uid,
      user_id: newUserUuid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', newUserUuid), {
      id: newUserUuid,
      auth_uid: user.uid,
      business_id: newBizUuid,
      displayName,
      email,
      emailCodeVerified: markEmailCodeVerified,
      phone: (prefill?.phone || '').slice(0, 32),
      phoneVerified: false,
      country: (prefill?.country || 'Kenya').slice(0, 80),
      city: (prefill?.city || 'Nairobi').slice(0, 80),
      businessType: (prefill?.businessType || 'Services').slice(0, 80),
      plan: 'free',
      verified: false,
      role: 'member',
      status: 'active',
      savedPostIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'businesses', newBizUuid), {
      business_id: newBizUuid,
      user_id: newUserUuid,
      auth_uid: user.uid,
      ownerName: displayName,
      name: bizName,
      category: (prefill?.businessType as BusinessCategory) || 'Services',
      country: (prefill?.country || 'Kenya').slice(0, 80),
      city: (prefill?.city || 'Nairobi').slice(0, 80),
      tagline: 'Global business member on SwayPalm.',
      about: `${bizName} connects with international suppliers, partners, and buyers on SwayPalm.`,
      whatsapp: (prefill?.phone || '').slice(0, 32),
      rating: 5.0,
      reviewCount: 0,
      plan: 'free',
      verified: false,
      logoInitials: createLogoInitials(bizName),
      logoColor: '#0A4D2E',
      coverTheme: 'hero_trade',
      followersCount: 0,
      viewsCount: 0,
      isOnline: true,
      lastSeenAt: serverTimestamp(),
      showOnlineStatus: true,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleActionFirestoreError(err, OperationType.WRITE, `users/${newUserUuid}`);
      throw err;
    }

    setUserUuid(newUserUuid);
    return { isNewUser: true, userId: newUserUuid };
  };

  // Public Firestore listeners (businesses, posts, products, groups, stories, playing adverts)
  useEffect(() => {
    const unsubBiz = onSnapshot(
      query(collection(db, 'businesses'), where('status', '==', 'active')),
      (snap) => {
        if (!snap.metadata.fromCache) reportNetworkHealthy();
        setLiveBusinesses(snap.docs.map((d) => normalizeBusinessDoc(d.id, d.data())));
      },
      (err) => handleListenerError('Businesses listener error', err)
    );

    const unsubPosts = onSnapshot(
      query(collection(db, 'posts'), where('status', '==', 'active')),
      (snap) => {
        if (!snap.metadata.fromCache) reportNetworkHealthy();
        setLivePosts(snap.docs.map((d) => normalizePostDoc(d.id, d.data())));
      },
      (err) => handleListenerError('Posts listener error', err)
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('status', '==', 'active')),
      (snap) => {
        if (!snap.metadata.fromCache) reportNetworkHealthy();
        setLiveProducts(snap.docs.map((d) => normalizeProductDoc(d.id, d.data())));
      },
      (err) => handleListenerError('Products listener error', err)
    );

    const unsubGroups = onSnapshot(
      query(collection(db, 'groups'), where('status', '==', 'active')),
      (snap) => {
        setLiveGroups(snap.docs.map((d) => normalizeGroupDoc(d.id, d.data())));
      },
      (err) => handleListenerError('Groups listener error', err)
    );

    const unsubStories = onSnapshot(
      query(collection(db, 'stories'), where('status', '==', 'active')),
      (snap) => {
        setLiveStories(snap.docs.map((d) => normalizeStoryDoc(d.id, d.data())));
      },
      (err) => handleListenerError('Stories listener error', err)
    );

    const unsubPlayingAdverts = onSnapshot(
      query(collection(db, 'adverts'), where('status', '==', 'approved')),
      (snap) => {
        if (!snap.metadata.fromCache) reportNetworkHealthy();
        const list = snap.docs
          .map((d) => normalizeAdvertDoc(d.id, d.data()))
          .filter((ad) => !ad.paymentStatus || ad.paymentStatus === 'paid');
        list.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
        setPlayingAdverts(list);
      },
      (err) => handleListenerError('Playing adverts listener error', err)
    );

    return () => {
      unsubBiz();
      unsubPosts();
      unsubProducts();
      unsubGroups();
      unsubStories();
      unsubPlayingAdverts();
    };
  }, []);

  // Resolve userUuid & auto-migrate returning users on sign-in / reload
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;
    let active = true;

    const unsubLink = onSnapshot(
      doc(db, 'userAuthLinks', uid),
      (snap) => {
        if (!active) return;
        if (snap.exists()) {
          const linkedUuid = snap.data().user_id;
          if (isUuid(linkedUuid)) {
            setUserUuid(linkedUuid);
          }
        } else if (firebaseUser.emailVerified) {
          // Returning user from before UUID migration -> migrate transparently in background
          void getDoc(doc(db, 'users', uid)).then((legacySnap) => {
            if (!active) return;
            if (legacySnap.exists()) {
              void ensureUserAndBusinessDocs(firebaseUser).catch(() => {});
            }
          });
        }
      },
      (err) => handleListenerError('UserAuthLink listener error', err)
    );

    return () => {
      active = false;
      unsubLink();
    };
  }, [authReady, firebaseUser]);

  // Listen to canonical users/{userUuid} doc (falling back to auth_uid query if link hasn't resolved yet)
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    if (userUuid) {
      const unsubUser = onSnapshot(
        doc(db, 'users', userUuid),
        (snap) => {
          if (snap.exists()) {
            setUserProfile(normalizeUserDoc(snap.id, snap.data()));
          }
        },
        (err) => handleListenerError('User profile listener error', err)
      );
      return () => unsubUser();
    }

    const unsubLegacyUser = onSnapshot(
      query(collection(db, 'users'), where('auth_uid', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const norm = normalizeUserDoc(snap.docs[0].id, snap.docs[0].data());
          setUserProfile(norm);
          setUserUuid(norm.id);
        }
      },
      (err) => handleListenerError('User query listener error', err)
    );
    return () => unsubLegacyUser();
  }, [authReady, firebaseUser, userUuid]);

  // Authenticated user scoped listeners (all filtered by immutable Auth UID `*_auth_uid`)
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubMyBiz = onSnapshot(
      query(collection(db, 'businesses'), where('auth_uid', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          setMyBusiness(normalizeBusinessDoc(snap.docs[0].id, snap.docs[0].data()));
        }
      },
      (err) => handleListenerError('My business listener error', err)
    );

    const unsubFollows = onSnapshot(
      query(collection(db, 'follows'), where('follower_auth_uid', '==', uid)),
      (snap) => setFollows(snap.docs.map((d) => normalizeFollowDoc(d.id, d.data()))),
      (err) => handleListenerError('Follows listener error', err)
    );

    const unsubFriends = onSnapshot(
      query(collection(db, 'friendships'), where('participant_auth_uids', 'array-contains', uid)),
      (snap) => setFriendships(snap.docs.map((d) => normalizeFriendshipDoc(d.id, d.data()))),
      (err) => handleListenerError('Friendships listener error', err)
    );

    const unsubViews = onSnapshot(
      query(collection(db, 'profileViews'), where('target_auth_uid', '==', uid)),
      (snap) => setProfileViews(snap.docs.map((d) => normalizeProfileViewDoc(d.id, d.data()))),
      (err) => handleListenerError('Profile views listener error', err)
    );

    const unsubBuyerOrders = onSnapshot(
      query(collection(db, 'orders'), where('buyer_auth_uid', '==', uid)),
      (snap) => {
        const buyerList = snap.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        setOrders((prev) => {
          const sellerOnly = prev.filter((o) => o.seller_auth_uid === uid && o.buyer_auth_uid !== uid);
          const merged = [...buyerList];
          for (const s of sellerOnly) {
            if (!merged.some((m) => m.order_id === s.order_id)) merged.push(s);
          }
          return merged;
        });
      },
      (err) => handleListenerError('Buyer orders listener error', err)
    );

    const unsubSellerOrders = onSnapshot(
      query(collection(db, 'orders'), where('seller_auth_uid', '==', uid)),
      (snap) => {
        const sellerList = snap.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        setOrders((prev) => {
          const buyerOnly = prev.filter((o) => o.buyer_auth_uid === uid && o.seller_auth_uid !== uid);
          const merged = [...sellerList];
          for (const b of buyerOnly) {
            if (!merged.some((m) => m.order_id === b.order_id)) merged.push(b);
          }
          return merged;
        });
      },
      (err) => handleListenerError('Seller orders listener error', err)
    );

    const unsubChats = onSnapshot(
      query(collection(db, 'chats'), where('participant_auth_uids', 'array-contains', uid)),
      (snap) => {
        const list = snap.docs.map((d) => normalizeChatDoc(d.id, d.data()));
        list.sort((a, b) => toEpochMs(b.updatedAt) - toEpochMs(a.updatedAt));
        setChats(list);
      },
      (err) => handleListenerError('Chats listener error', err)
    );

    const unsubAdverts = onSnapshot(
      query(collection(db, 'adverts'), where('auth_uid', '==', uid)),
      (snap) => setAdverts(snap.docs.map((d) => normalizeAdvertDoc(d.id, d.data()))),
      (err) => handleListenerError('Adverts listener error', err)
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('auth_uid', '==', uid)),
      (snap) => setPayments(snap.docs.map((d) => normalizePaymentDoc(d.id, d.data()))),
      (err) => handleListenerError('Payments listener error', err)
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('recipient_auth_uid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => normalizeNotificationDoc(d.id, d.data()));
        list.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
        setNotifications(list);
      },
      (err) => handleListenerError('Notifications listener error', err)
    );

    return () => {
      unsubMyBiz();
      unsubFollows();
      unsubFriends();
      unsubViews();
      unsubBuyerOrders();
      unsubSellerOrders();
      unsubChats();
      unsubAdverts();
      unsubPayments();
      unsubNotifs();
    };
  }, [authReady, firebaseUser]);

  // Hydrate & migrate joined groups & liked posts keyed by immutable `userUuid`
  const storageIdentityKey = userUuid || (firebaseUser ? null : 'guest');

  useEffect(() => {
    if (!authReady || !storageIdentityKey) return;
    try {
      // One-time migration from legacy Auth-UID localStorage keys
      if (firebaseUser && userUuid && firebaseUser.uid !== userUuid) {
        const oldLikes = localStorage.getItem(`swaypalm_likes_${firebaseUser.uid}`);
        if (oldLikes) {
          const parsed = JSON.parse(oldLikes);
          if (Array.isArray(parsed)) {
            const migrated = parsed
              .filter((x): x is string => typeof x === 'string')
              .map((x) => resolveLegacyOrUuid(x, 'legacy_post'));
            localStorage.setItem(`swaypalm_likes_${userUuid}`, JSON.stringify(migrated));
          }
          localStorage.removeItem(`swaypalm_likes_${firebaseUser.uid}`);
        }
        const oldGroups = localStorage.getItem(`swaypalm_joined_groups_${firebaseUser.uid}`);
        if (oldGroups) {
          const parsed = JSON.parse(oldGroups);
          if (Array.isArray(parsed)) {
            const migrated = parsed
              .filter((x): x is string => typeof x === 'string')
              .map((x) => resolveLegacyOrUuid(x, 'legacy_grp'));
            localStorage.setItem(`swaypalm_joined_groups_${userUuid}`, JSON.stringify(migrated));
          }
          localStorage.removeItem(`swaypalm_joined_groups_${firebaseUser.uid}`);
        }
      }

      const savedLikes = localStorage.getItem(`swaypalm_likes_${storageIdentityKey}`);
      if (savedLikes) {
        const parsed = JSON.parse(savedLikes);
        if (Array.isArray(parsed)) {
          setLocalLikes(new Set(parsed.filter((x): x is string => typeof x === 'string')));
        }
      } else {
        setLocalLikes(new Set());
      }

      const savedGroups = localStorage.getItem(`swaypalm_joined_groups_${storageIdentityKey}`);
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        if (Array.isArray(parsed)) {
          setLocalJoinedGroups(new Set(parsed.filter((x): x is string => typeof x === 'string')));
        }
      } else {
        setLocalJoinedGroups(new Set());
      }
    } catch {
      // ignore storage errors
    }
  }, [authReady, storageIdentityKey, firebaseUser, userUuid]);

  useEffect(() => {
    if (!authReady || !storageIdentityKey) return;
    try {
      localStorage.setItem(`swaypalm_likes_${storageIdentityKey}`, JSON.stringify(Array.from(localLikes)));
    } catch {
      // ignore storage quota
    }
  }, [authReady, storageIdentityKey, localLikes]);

  useEffect(() => {
    if (!authReady || !storageIdentityKey) return;
    try {
      localStorage.setItem(
        `swaypalm_joined_groups_${storageIdentityKey}`,
        JSON.stringify(Array.from(localJoinedGroups))
      );
    } catch {
      // ignore storage quota
    }
  }, [authReady, storageIdentityKey, localJoinedGroups]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !userUuid || liveGroups.length === 0) return;
    let active = true;
    Promise.all(
      liveGroups.slice(0, 40).map(async (g) => {
        try {
          const snap = await getDoc(doc(db, 'groups', g.group_id, 'members', userUuid));
          return { id: g.group_id, joined: snap.exists() };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!active) return;
      setLocalJoinedGroups((prev) => {
        const next = new Set(prev);
        for (const r of results) {
          if (!r) continue;
          if (r.joined) next.add(r.id);
          else next.delete(r.id);
        }
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [authReady, firebaseUser?.uid, userUuid, liveGroups]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !userUuid || livePosts.length === 0) return;
    let active = true;
    Promise.all(
      livePosts.slice(0, 30).map(async (p) => {
        try {
          const snap = await getDoc(doc(db, 'posts', p.post_id, 'likes', userUuid));
          return { id: p.post_id, liked: snap.exists() };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!active) return;
      setLocalLikes((prev) => {
        const next = new Set(prev);
        for (const r of results) {
          if (!r) continue;
          if (r.liked) next.add(r.id);
          else next.delete(r.id);
        }
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [authReady, firebaseUser?.uid, userUuid, livePosts]);

  // Real-time online presence & lastSeenAt heartbeat
  const myBusinessId = myBusiness?.business_id;
  const myBusinessStatus = myBusiness?.status;
  const myShowOnlineStatus = myBusiness?.showOnlineStatus;

  useEffect(() => {
    if (
      !authReady ||
      !firebaseUser?.emailVerified ||
      !myBusinessId ||
      !isUuid(myBusinessId) ||
      myBusinessStatus !== 'active'
    ) {
      return;
    }

    const allowVisible = myShowOnlineStatus !== false;
    const bizRef = doc(db, 'businesses', myBusinessId);

    const pushPresence = (online: boolean) => {
      updateDoc(bizRef, {
        isOnline: allowVisible && online,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    };

    pushPresence(document.visibilityState === 'visible');

    const handleVisibility = () => {
      pushPresence(document.visibilityState === 'visible');
    };
    const handleFocus = () => pushPresence(true);
    const handlePageHide = () => pushPresence(false);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        pushPresence(true);
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.clearInterval(heartbeat);
    };
  }, [authReady, firebaseUser?.uid, firebaseUser?.emailVerified, myBusinessId, myBusinessStatus, myShowOnlineStatus]);

  // Admin extra listeners
  useEffect(() => {
    if (!authReady || !firebaseUser || !isAdmin) return;
    const unsubAllUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setAdminUsers(snap.docs.map((d) => normalizeUserDoc(d.id, d.data()))),
      (err) => handleListenerError('Admin users error', err)
    );
    const unsubAllAdverts = onSnapshot(
      collection(db, 'adverts'),
      (snap) => setAdminAdverts(snap.docs.map((d) => normalizeAdvertDoc(d.id, d.data()))),
      (err) => handleListenerError('Admin adverts error', err)
    );
    const unsubAllPayments = onSnapshot(
      collection(db, 'payments'),
      (snap) => setAdminPayments(snap.docs.map((d) => normalizePaymentDoc(d.id, d.data()))),
      (err) => handleListenerError('Admin payments error', err)
    );
    const unsubAllOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list = snap.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        list.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
        setAdminOrders(list);
      },
      (err) => handleListenerError('Admin orders error', err)
    );
    return () => {
      unsubAllUsers();
      unsubAllAdverts();
      unsubAllPayments();
      unsubAllOrders();
    };
  }, [authReady, firebaseUser, isAdmin]);

  // Merged public catalogs (Live Firestore docs override Sample Catalog entries)
  const businesses = useMemo(() => {
    const map = new Map<string, Business>();
    for (const b of SAMPLE_BUSINESSES) map.set(b.business_id, b);
    for (const b of liveBusinesses) map.set(b.business_id, b);
    return Array.from(map.values()).filter((b) => b.status === 'active');
  }, [liveBusinesses]);

  const adminBusinesses = useMemo(() => {
    const map = new Map<string, Business>();
    for (const b of SAMPLE_BUSINESSES) map.set(b.business_id, b);
    for (const b of liveBusinesses) map.set(b.business_id, b);
    return Array.from(map.values());
  }, [liveBusinesses]);

  const businessesById = useMemo(() => {
    const map = new Map<string, Business>();
    for (const b of adminBusinesses) map.set(b.business_id, b);
    if (myBusiness) map.set(myBusiness.business_id, myBusiness);
    return map;
  }, [adminBusinesses, myBusiness]);

  const businessesByUserId = useMemo(() => {
    const map = new Map<string, Business>();
    for (const b of adminBusinesses) map.set(b.user_id, b);
    if (myBusiness) map.set(myBusiness.user_id, myBusiness);
    return map;
  }, [adminBusinesses, myBusiness]);

  const usersById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const u of adminUsers) map.set(u.id, u);
    if (userProfile) map.set(userProfile.id, userProfile);
    return map;
  }, [adminUsers, userProfile]);

  const getBusinessById = (businessId?: string | null): Business | undefined => {
    if (!businessId) return undefined;
    return businessesById.get(businessId);
  };

  const getBusinessByUserId = (userId?: string | null): Business | undefined => {
    if (!userId) return undefined;
    return businessesByUserId.get(userId);
  };

  const getDisplayBusinessName = (
    businessId?: string | null,
    userId?: string | null,
    fallback = 'SwayPalm Business'
  ): string => {
    const biz =
      (businessId ? businessesById.get(businessId) : undefined) ??
      (userId ? businessesByUserId.get(userId) : undefined);
    if (biz?.name) return biz.name;
    const usr = userId ? usersById.get(userId) : undefined;
    return usr?.displayName || fallback;
  };

  const getDisplayOwnerName = (
    userId?: string | null,
    businessId?: string | null,
    fallback = 'Member'
  ): string => {
    const usr = userId ? usersById.get(userId) : undefined;
    if (usr?.displayName) return usr.displayName;
    const biz =
      (userId ? businessesByUserId.get(userId) : undefined) ??
      (businessId ? businessesById.get(businessId) : undefined);
    return biz?.ownerName || biz?.name || fallback;
  };

  const posts = useMemo(() => {
    const map = new Map<string, FeedPost>();
    for (const p of SAMPLE_POSTS) {
      const delta = localLikedDelta[p.post_id] || 0;
      map.set(p.post_id, { ...p, likesCount: Math.max(0, p.likesCount + delta) });
    }
    for (const p of livePosts) map.set(p.post_id, p);
    return Array.from(map.values()).sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
  }, [livePosts, localLikedDelta]);

  const stories = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, BusinessStory>();
    for (const s of SAMPLE_STORIES) map.set(s.story_id, s);
    for (const s of liveStories) map.set(s.story_id, s);
    return Array.from(map.values())
      .filter((s) => s.status === 'active' && toEpochMs(s.expiresAt) > now)
      .sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
  }, [liveStories]);

  const products = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of SAMPLE_PRODUCTS) map.set(p.product_id, p);
    for (const p of liveProducts) map.set(p.product_id, p);
    return Array.from(map.values()).filter((p) => p.status === 'active');
  }, [liveProducts]);

  const adminProducts = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of SAMPLE_PRODUCTS) map.set(p.product_id, p);
    for (const p of liveProducts) map.set(p.product_id, p);
    return Array.from(map.values());
  }, [liveProducts]);

  const groups = useMemo(() => {
    const map = new Map<string, BusinessGroup>();
    for (const g of SAMPLE_GROUPS) map.set(g.group_id, g);
    for (const g of liveGroups) map.set(g.group_id, g);
    return Array.from(map.values());
  }, [liveGroups]);

  const requireSignedIn = (): boolean => {
    if (!firebaseUser) {
      setAuthMode('register');
      setShowAuthModal(true);
      notifyToast('Sign in or register free to continue.', 'info');
      return false;
    }
    return true;
  };

  const requireVerifiedUser = (): boolean => {
    if (!requireSignedIn() || !firebaseUser) return false;
    if (!firebaseUser.emailVerified) {
      setPendingEmailTarget(firebaseUser.email || '');
      setAuthMode('email_otp');
      setShowAuthModal(true);
      notifyToast('Please verify your email address first to continue.', 'info');
      return false;
    }
    return true;
  };

  // Auth Actions
  const sendEmailVerificationCode = async (emailOverride?: string, nameOverride?: string) => {
    const targetEmail = (
      emailOverride ||
      pendingEmailTarget ||
      firebaseUser?.email ||
      pendingPrefill?.email ||
      ''
    ).trim();
    const targetName = (
      nameOverride ||
      pendingPrefill?.fullName ||
      firebaseUser?.displayName ||
      userProfile?.displayName ||
      'Business Owner'
    ).trim();

    if (!targetEmail) {
      notifyToast('No email address available for verification.', 'error');
      return;
    }

    setPendingEmailTarget(targetEmail);
    setEmailCodeVerifiedInSession(false);

    const res = await safeFetchJson<{
      sent?: boolean;
      previewCode?: string | null;
      error?: string;
    }>('/api/auth/send-email-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, name: targetName }),
    });
    if (!res.ok || !res.data) {
      notifyToast(res.error || 'Could not send email verification code.', 'error');
      return;
    }

    if (res.data.sent) {
      setEmailCodeDelivery('email');
      setEmailCodePreview(null);
      notifyToast(`Verification code sent to ${targetEmail}.`, 'success');
    } else {
      setEmailCodeDelivery('sandbox_preview');
      setEmailCodePreview(res.data.previewCode || null);
      notifyToast(`Email verification code ready for ${targetEmail}.`, 'info');
    }
  };

  const verifyEmailCode = async (code: string): Promise<boolean> => {
    const targetEmail = (
      pendingEmailTarget ||
      firebaseUser?.email ||
      pendingPrefill?.email ||
      ''
    ).trim();
    if (!targetEmail) return false;

    const res = await safeFetchJson<{ verified?: boolean; error?: string }>(
      '/api/auth/verify-email-code',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: code.trim() }),
      }
    );
    if (!res.ok || !res.data?.verified) {
      notifyToast(res.error || 'Invalid email verification code.', 'error');
      return false;
    }

    setEmailCodeVerifiedInSession(true);
    setEmailCodePreview(null);

    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        await auth.currentUser.getIdToken(true);
      } catch (err) {
        if (isNetworkError(err)) {
          const msg = getFriendlyNetworkErrorMessage(err);
          reportNetworkIssue(msg);
          notifyToast(msg, 'error');
          return false;
        }
        throw err;
      }

      if (auth.currentUser.emailVerified) {
        const { isNewUser, userId } = await ensureUserAndBusinessDocs(
          auth.currentUser,
          pendingPrefill,
          true
        );
        if (!isNewUser) {
          try {
            await updateDoc(doc(db, 'users', userId), {
              emailCodeVerified: true,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleActionFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
          }
        }
        const phoneToVerify = pendingPrefill?.phone || pendingPhone;
        setPendingPrefill(null);
        if (phoneToVerify && phoneToVerify.length > 4) {
          const phoneOtp = sendPhoneOtp(phoneToVerify);
          setAuthMode('otp');
          notifyToast(`Email verified! Enter phone OTP ${phoneOtp} to finish.`, 'success');
        } else {
          setShowAuthModal(false);
          notifyToast('Email verified! Your SwayPalm business account is active.', 'success');
        }
        return true;
      }

      notifyToast(
        'Email code confirmed! Please also click the verification link in your inbox, then click Refresh Status.',
        'info'
      );
      return true;
    }

    return true;
  };

  const refreshFirebaseEmailStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
    } catch (err) {
      if (isNetworkError(err)) {
        const msg = getFriendlyNetworkErrorMessage(err);
        reportNetworkIssue(msg);
        notifyToast(msg, 'error');
        return false;
      }
      throw err;
    }

    if (auth.currentUser.emailVerified) {
      const { isNewUser, userId } = await ensureUserAndBusinessDocs(
        auth.currentUser,
        pendingPrefill,
        emailCodeVerifiedInSession
      );
      if (!isNewUser && emailCodeVerifiedInSession) {
        try {
          await updateDoc(doc(db, 'users', userId), {
            emailCodeVerified: true,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleActionFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
        }
      }
      if (emailCodeVerifiedInSession) {
        const phoneToVerify = pendingPrefill?.phone || pendingPhone;
        setPendingPrefill(null);
        if (phoneToVerify && phoneToVerify.length > 4) {
          const phoneOtp = sendPhoneOtp(phoneToVerify);
          setAuthMode('otp');
          notifyToast(`Email verified! Enter phone OTP ${phoneOtp} to finish.`, 'success');
        } else {
          setShowAuthModal(false);
          notifyToast('Email verified! Welcome to SwayPalm.', 'success');
        }
      } else {
        setPendingPrefill(null);
        setShowAuthModal(false);
        notifyToast('Email verified! Welcome to SwayPalm.', 'success');
      }
      return true;
    }
    notifyToast('Email link not confirmed yet. Check your inbox or spam folder.', 'info');
    return false;
  };

  const signInWithGoogle = async (prefill?: Partial<RegistrationDetails>) => {
    const effectivePrefill = prefill || pendingPrefill;
    let cred;
    try {
      cred = await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (isNetworkError(err)) {
        const msg = getFriendlyNetworkErrorMessage(err);
        reportNetworkIssue(msg);
        throw new Error(msg);
      }
      throw err;
    }

    const { isNewUser } = await ensureUserAndBusinessDocs(cred.user, effectivePrefill, false);
    if (effectivePrefill?.phone) setPendingPhone(effectivePrefill.phone);

    if (isNewUser) {
      const emailToVerify = cred.user.email || effectivePrefill?.email || '';
      await sendEmailVerificationCode(
        emailToVerify,
        effectivePrefill?.fullName || cred.user.displayName || 'Business Owner'
      );
      setAuthMode('email_otp');
      setShowAuthModal(true);
    } else {
      setPendingPrefill(null);
      setShowAuthModal(false);
      notifyToast('Welcome back to SwayPalm!', 'success');
    }
  };

  const registerWithEmailForm = async (details: RegistrationDetails) => {
    setPendingPrefill(details);
    setPendingPhone(details.phone);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        details.email.trim(),
        details.password || 'SwayPalm!2026'
      );
      await updateProfile(cred.user, { displayName: details.fullName.trim() });
      await sendEmailVerification(cred.user).catch(() => {});
      await sendEmailVerificationCode(details.email.trim(), details.fullName.trim());
      setAuthMode('email_otp');
      return {};
    } catch (err: any) {
      if (isNetworkError(err)) {
        const msg = getFriendlyNetworkErrorMessage(err);
        reportNetworkIssue(msg);
        return { message: msg };
      }
      if (err?.code === 'auth/operation-not-allowed') {
        return {
          needsGoogleFallback: true,
          message:
            'Email/Password provider is not enabled in Firebase Console yet. Click "Continue with Google" below to register with your business details and receive your email verification code.',
        };
      }
      return { message: err?.message || 'Registration failed. Please check your details.' };
    }
  };

  const loginWithEmailForm = async (emailOrPhone: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, emailOrPhone.trim(), password);
      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user).catch(() => {});
        await sendEmailVerificationCode(
          cred.user.email || emailOrPhone.trim(),
          cred.user.displayName || 'Member'
        );
        setAuthMode('email_otp');
        return {};
      }
      await ensureUserAndBusinessDocs(cred.user);
      setShowAuthModal(false);
      notifyToast('Signed in to SwayPalm.', 'success');
      return {};
    } catch (err: any) {
      if (isNetworkError(err)) {
        const msg = getFriendlyNetworkErrorMessage(err);
        reportNetworkIssue(msg);
        return { message: msg };
      }
      if (err?.code === 'auth/operation-not-allowed') {
        return {
          needsGoogleFallback: true,
          message:
            'Email/Password sign-in is disabled in Firebase Console. Click "Continue with Google" below for instant verified access.',
        };
      }
      return { message: err?.message || 'Invalid credentials.' };
    }
  };

  const sendPhoneOtp = (phone: string): string => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setPendingOtpCode(code);
    setPendingPhone(phone);
    return code;
  };

  const verifyPhoneOtp = async (code: string): Promise<boolean> => {
    if (!pendingOtpCode || code.trim() !== pendingOtpCode) {
      notifyToast('Incorrect verification code. Please check and try again.', 'error');
      return false;
    }
    const targetUserUuid = userProfile?.id || userUuid;
    if (firebaseUser && targetUserUuid) {
      try {
        await updateDoc(doc(db, 'users', targetUserUuid), {
          phone: pendingPhone || userProfile?.phone || '',
          phoneVerified: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleActionFirestoreError(err, OperationType.UPDATE, `users/${targetUserUuid}`);
        return false;
      }
    }
    setPendingOtpCode(null);
    setShowAuthModal(false);
    notifyToast('Phone number verified! Your free SwayPalm profile is active.', 'success');
    return true;
  };

  const logout = async () => {
    await endCurrentCall();
    setIncomingCall(null);
    if (firebaseUser?.emailVerified && myBusiness && isUuid(myBusiness.business_id)) {
      await updateDoc(doc(db, 'businesses', myBusiness.business_id), {
        isOnline: false,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
    await signOut(auth);
    setActivePage('home');
    notifyToast('Signed out of SwayPalm.', 'info');
  };

  // Business Profile view + view counter
  const openBusinessProfile = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setActivePage('profile');
    const currentUserId = userProfile?.id || userUuid;
    if (
      firebaseUser?.emailVerified &&
      currentUserId &&
      myBusiness &&
      businessId !== myBusiness.business_id
    ) {
      const target = businesses.find((b) => b.business_id === businessId);
      if (target) {
        const viewId = generateUuid();
        setDoc(doc(db, 'profileViews', viewId), {
          view_id: viewId,
          business_id: target.business_id,
          target_user_id: target.user_id,
          viewer_user_id: currentUserId,
          target_auth_uid: target.auth_uid,
          viewer_auth_uid: firebaseUser.uid,
          viewedAt: serverTimestamp(),
        }).catch(() => {});

        if (liveBusinesses.some((b) => b.business_id === target.business_id)) {
          updateDoc(doc(db, 'businesses', target.business_id), {
            viewsCount: (target.viewsCount || 0) + 1,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      }
    }
  };

  // Feed Actions
  const createPost = async (input: {
    postType: 'update' | 'photo' | 'video' | 'offer';
    content: string;
    mediaDataUrl?: string;
    mediaTheme?: string;
    offerPrice?: number;
    offerProductTitle?: string;
  }) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness || !currentUserId) return;
    const postId = generateUuid();
    const payload: Record<string, any> = {
      post_id: postId,
      user_id: currentUserId,
      business_id: myBusiness.business_id,
      auth_uid: firebaseUser.uid,
      postType: input.postType,
      content: input.content.trim().slice(0, 3000),
      mediaTheme: input.mediaTheme || myBusiness.coverTheme || 'hero_trade',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.mediaDataUrl) payload.mediaDataUrl = input.mediaDataUrl;
    if (typeof input.offerPrice === 'number' && input.offerPrice > 0) {
      payload.offerPrice = input.offerPrice;
    }
    if (input.offerProductTitle?.trim()) {
      payload.offerProductTitle = input.offerProductTitle.trim().slice(0, 140);
    }

    try {
      await setDoc(doc(db, 'posts', postId), payload);
      notifyToast('Published to the global business feed.', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `posts/${postId}`);
    }
  };

  const updatePost = async (
    post: FeedPost,
    updates: { content: string; offerProductTitle?: string; offerPrice?: number }
  ) => {
    if (!requireVerifiedUser() || !firebaseUser) return;
    if (!livePosts.some((p) => p.post_id === post.post_id)) {
      notifyToast('Sample showcase posts cannot be modified.', 'info');
      return;
    }
    const payload: Record<string, any> = {
      content: updates.content.trim().slice(0, 3000),
      updatedAt: serverTimestamp(),
    };
    if (post.postType === 'offer') {
      if (updates.offerProductTitle?.trim()) {
        payload.offerProductTitle = updates.offerProductTitle.trim().slice(0, 140);
      }
      if (typeof updates.offerPrice === 'number' && updates.offerPrice > 0) {
        payload.offerPrice = updates.offerPrice;
      }
    }
    try {
      await updateDoc(doc(db, 'posts', post.post_id), payload);
      notifyToast('Post updated.', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `posts/${post.post_id}`);
    }
  };

  const deletePost = async (postId: string) => {
    if (!requireVerifiedUser() || !firebaseUser) return;
    if (!livePosts.some((p) => p.post_id === postId)) {
      notifyToast('Sample showcase posts cannot be deleted.', 'info');
      return;
    }
    try {
      await deleteDoc(doc(db, 'posts', postId));
      notifyToast('Post deleted.', 'info');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const createStory = async (input: {
    headline: string;
    caption?: string;
    mediaDataUrl?: string;
    mediaTheme?: string;
    ctaLabel?: string;
  }) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness || !currentUserId) return;
    const storyId = generateUuid();
    const payload: Record<string, any> = {
      story_id: storyId,
      user_id: currentUserId,
      business_id: myBusiness.business_id,
      auth_uid: firebaseUser.uid,
      headline: input.headline.trim().slice(0, 140),
      mediaTheme: input.mediaTheme || myBusiness.coverTheme || 'hero_trade',
      viewsCount: 0,
      status: 'active',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    };
    if (input.caption?.trim()) payload.caption = input.caption.trim().slice(0, 400);
    if (input.mediaDataUrl) payload.mediaDataUrl = input.mediaDataUrl;
    if (input.ctaLabel?.trim()) payload.ctaLabel = input.ctaLabel.trim().slice(0, 60);

    try {
      await setDoc(doc(db, 'stories', storyId), payload);
      notifyToast('Your 24-hour Business Story is live!', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `stories/${storyId}`);
    }
  };

  const markStoryViewed = (story: BusinessStory) => {
    const alreadyViewed = viewedStoryIds.has(story.story_id);
    if (!alreadyViewed) {
      setViewedStoryIds((prev) => new Set(prev).add(story.story_id));
      const currentUserId = userProfile?.id || userUuid;
      if (
        firebaseUser?.emailVerified &&
        liveStories.some((s) => s.story_id === story.story_id) &&
        story.user_id !== currentUserId
      ) {
        updateDoc(doc(db, 'stories', story.story_id), {
          viewsCount: (story.viewsCount || 0) + 1,
        }).catch(() => {});
      }
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!requireVerifiedUser() || !firebaseUser) return;
    if (!liveStories.some((s) => s.story_id === storyId)) {
      notifyToast('Sample showcase stories cannot be deleted.', 'info');
      return;
    }
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      notifyToast('Story removed.', 'info');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.DELETE, `stories/${storyId}`);
    }
  };

  const toggleLikePost = async (post: FeedPost) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    const isLive = livePosts.some((p) => p.post_id === post.post_id);
    if (!isLive) {
      const already = localLikes.has(post.post_id);
      setLocalLikes((prev) => {
        const next = new Set(prev);
        if (already) next.delete(post.post_id);
        else next.add(post.post_id);
        return next;
      });
      setLocalLikedDelta((prev) => ({
        ...prev,
        [post.post_id]: (prev[post.post_id] || 0) + (already ? -1 : 1),
      }));
      return;
    }

    const likeRef = doc(db, 'posts', post.post_id, 'likes', currentUserId);
    const postRef = doc(db, 'posts', post.post_id);
    try {
      const existingLike = await getDoc(likeRef);
      const batch = writeBatch(db);
      if (existingLike.exists()) {
        batch.delete(likeRef);
        batch.update(postRef, {
          likesCount: Math.max(0, post.likesCount - 1),
          updatedAt: serverTimestamp(),
        });
        setLocalLikes((prev) => {
          const next = new Set(prev);
          next.delete(post.post_id);
          return next;
        });
      } else {
        batch.set(likeRef, {
          user_id: currentUserId,
          auth_uid: firebaseUser.uid,
          createdAt: serverTimestamp(),
        });
        batch.update(postRef, {
          likesCount: post.likesCount + 1,
          updatedAt: serverTimestamp(),
        });
        setLocalLikes((prev) => new Set(prev).add(post.post_id));
      }
      await batch.commit();
    } catch (err) {
      handleActionFirestoreError(err, OperationType.WRITE, `posts/${post.post_id}/likes`);
    }
  };

  const loadPostComments = async (postId: string): Promise<PostComment[]> => {
    if (!livePosts.some((p) => p.post_id === postId)) {
      return [];
    }
    try {
      const snap = await getDocs(
        query(collection(db, 'posts', postId, 'comments'), where('post_id', '==', postId))
      );
      const list = snap.docs.map((d) => normalizePostCommentDoc(d.id, postId, d.data()));
      list.sort((a, b) => toEpochMs(a.createdAt) - toEpochMs(b.createdAt));
      return list;
    } catch (err) {
      handleActionFirestoreError(err, OperationType.LIST, `posts/${postId}/comments`);
      return [];
    }
  };

  const addPostComment = async (post: FeedPost, text: string) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    if (!livePosts.some((p) => p.post_id === post.post_id)) {
      notifyToast('Comment posted to showcase thread.', 'success');
      return;
    }
    const commentId = generateUuid();
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', post.post_id, 'comments', commentId), {
      comment_id: commentId,
      post_id: post.post_id,
      user_id: currentUserId,
      auth_uid: firebaseUser.uid,
      text: text.trim().slice(0, 1000),
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'posts', post.post_id), {
      commentsCount: post.commentsCount + 1,
      updatedAt: serverTimestamp(),
    });

    if (
      post.user_id !== currentUserId &&
      post.auth_uid &&
      !isSampleAuthUid(post.auth_uid) &&
      post.auth_uid !== 'unknown'
    ) {
      const notifId = generateUuid();
      const actorDisplay = myBusiness?.name || userProfile?.displayName || 'Member';
      batch.set(doc(db, 'notifications', notifId), {
        notification_id: notifId,
        recipient_user_id: post.user_id,
        recipient_auth_uid: post.auth_uid,
        actor_user_id: currentUserId,
        ...(myBusiness?.business_id ? { actor_business_id: myBusiness.business_id } : {}),
        type: 'comment',
        title: 'New comment on your post',
        body: `${actorDisplay} commented: "${text.trim().slice(0, 80)}"`,
        read: false,
        targetTab: 'home',
        createdAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleActionFirestoreError(
        err,
        OperationType.WRITE,
        `posts/${post.post_id}/comments/${commentId}`
      );
    }
  };

  const sharePost = async (post: FeedPost) => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      // ignore clipboard fallback
    }
    if (firebaseUser?.emailVerified && livePosts.some((p) => p.post_id === post.post_id)) {
      updateDoc(doc(db, 'posts', post.post_id), {
        sharesCount: post.sharesCount + 1,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
    const label = getDisplayBusinessName(post.business_id, post.user_id);
    notifyToast(`Shared ${label}'s update.`, 'success');
  };

  const toggleSavePost = async (postId: string) => {
    if (!requireVerifiedUser() || !firebaseUser || !userProfile) return;
    const current = userProfile.savedPostIds || [];
    const exists = current.includes(postId);
    const next = exists
      ? current.filter((id) => id !== postId)
      : [postId, ...current].slice(0, 50);
    try {
      await updateDoc(doc(db, 'users', userProfile.id), {
        savedPostIds: next,
        updatedAt: serverTimestamp(),
      });
      notifyToast(exists ? 'Removed from Saved items.' : 'Saved for later.', 'info');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `users/${userProfile.id}`);
    }
  };

  // Follow Business
  const toggleFollowBusiness = async (business: Business) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    const followId = deterministicUuid(`follow:${currentUserId}:${business.business_id}`);
    const followRef = doc(db, 'follows', followId);
    const existingFollow = follows.find((f) => f.business_id === business.business_id);
    const isLiveBiz = liveBusinesses.some((b) => b.business_id === business.business_id);

    try {
      const batch = writeBatch(db);
      if (existingFollow) {
        batch.delete(doc(db, 'follows', existingFollow.follow_id));
        if (isLiveBiz) {
          batch.update(doc(db, 'businesses', business.business_id), {
            followersCount: Math.max(0, business.followersCount - 1),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        notifyToast(`Unfollowed ${business.name}.`, 'info');
      } else {
        batch.set(followRef, {
          follow_id: followId,
          follower_user_id: currentUserId,
          business_id: business.business_id,
          business_user_id: business.user_id,
          follower_auth_uid: firebaseUser.uid,
          business_auth_uid: business.auth_uid,
          createdAt: serverTimestamp(),
        });
        if (isLiveBiz) {
          batch.update(doc(db, 'businesses', business.business_id), {
            followersCount: business.followersCount + 1,
            updatedAt: serverTimestamp(),
          });
        }
        if (
          business.user_id !== currentUserId &&
          business.auth_uid &&
          !isSampleAuthUid(business.auth_uid) &&
          business.auth_uid !== 'unknown'
        ) {
          const notifId = generateUuid();
          const actorDisplay = myBusiness?.name || userProfile?.displayName || 'Member';
          batch.set(doc(db, 'notifications', notifId), {
            notification_id: notifId,
            recipient_user_id: business.user_id,
            recipient_auth_uid: business.auth_uid,
            actor_user_id: currentUserId,
            ...(myBusiness?.business_id ? { actor_business_id: myBusiness.business_id } : {}),
            type: 'follower',
            title: 'New business follower',
            body: `${actorDisplay} started following ${business.name}.`,
            read: false,
            targetTab: 'friends',
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
        notifyToast(`Now following ${business.name}!`, 'success');
      }
    } catch (err) {
      handleActionFirestoreError(err, OperationType.WRITE, `follows/${followId}`);
    }
  };

  const updateMyBusiness = async (updates: Partial<Business>) => {
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness) return;
    const allowed: Record<string, any> = { updatedAt: serverTimestamp() };
    if (updates.name) allowed.name = updates.name.slice(0, 120);
    if (updates.category) allowed.category = updates.category;
    if (updates.country) allowed.country = updates.country.slice(0, 80);
    if (updates.city) allowed.city = updates.city.slice(0, 80);
    if (updates.tagline !== undefined) allowed.tagline = updates.tagline.slice(0, 180);
    if (updates.about !== undefined) allowed.about = updates.about.slice(0, 2000);
    if (updates.whatsapp !== undefined) allowed.whatsapp = updates.whatsapp.slice(0, 32);
    if (updates.logoDataUrl !== undefined) allowed.logoDataUrl = updates.logoDataUrl.slice(0, 400000);
    if (updates.logoColor) allowed.logoColor = updates.logoColor.slice(0, 24);
    if (updates.coverTheme) allowed.coverTheme = updates.coverTheme.slice(0, 40);
    if (updates.name) allowed.logoInitials = createLogoInitials(updates.name);
    try {
      await updateDoc(doc(db, 'businesses', myBusiness.business_id), allowed);
      notifyToast('Business profile updated.', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `businesses/${myBusiness.business_id}`);
    }
  };

  const updateSettingPrefs = (patch: Partial<SettingKitPreferences>) => {
    setSettingPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('swaypalm_settings_kit', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
    if (
      patch.desktopCallAlerts &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      void Notification.requestPermission().catch(() => {});
    }
    notifyToast('Preferences updated.', 'success');
  };

  const updateAccountSettings = async (updates: {
    displayName: string;
    email?: string;
    phone: string;
    country: string;
    city: string;
    businessType: string;
  }) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    const cleanName = updates.displayName.trim().slice(0, 100);
    const cleanEmail = (updates.email !== undefined ? updates.email : userProfile?.email || '')
      .trim()
      .slice(0, 160);
    const cleanPhone = updates.phone.trim().slice(0, 32);
    const cleanCountry = updates.country.trim().slice(0, 80);
    const cleanCity = updates.city.trim().slice(0, 80);
    const cleanType = updates.businessType.trim().slice(0, 80);

    if (!cleanName) {
      notifyToast('Display name cannot be empty.', 'error');
      return;
    }
    if (cleanEmail.length < 3 || !cleanEmail.includes('@')) {
      notifyToast('Enter a valid email address.', 'error');
      return;
    }

    const phoneChanged = cleanPhone !== (userProfile?.phone || '');
    const emailChanged = cleanEmail.toLowerCase() !== (userProfile?.email || '').toLowerCase();

    try {
      if (auth.currentUser && cleanName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: cleanName }).catch(() => {});
      }

      let authEmailNote = '';
      if (emailChanged && auth.currentUser && cleanEmail.toLowerCase() !== (auth.currentUser.email || '').toLowerCase()) {
        try {
          await verifyBeforeUpdateEmail(auth.currentUser, cleanEmail);
          authEmailNote = ' Confirmation link sent to your new login email.';
        } catch (emailErr: any) {
          if (emailErr?.code === 'auth/requires-recent-login') {
            authEmailNote = ' Profile email updated under your permanent User ID (sign in again to update login credentials).';
          }
        }
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', currentUserId), {
        displayName: cleanName,
        email: cleanEmail,
        emailCodeVerified: emailChanged ? false : Boolean(userProfile?.emailCodeVerified),
        phone: cleanPhone,
        phoneVerified: phoneChanged ? false : Boolean(userProfile?.phoneVerified),
        country: cleanCountry,
        city: cleanCity,
        businessType: cleanType,
        updatedAt: serverTimestamp(),
      });
      if (myBusiness && isUuid(myBusiness.business_id)) {
        batch.update(doc(db, 'businesses', myBusiness.business_id), {
          ownerName: cleanName,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      notifyToast(`Account settings saved under immutable ID.${authEmailNote}`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `users/${currentUserId}`);
    }
  };

  const sendAccountPasswordReset = async () => {
    if (!firebaseUser?.email) {
      notifyToast('No email address found on this account.', 'error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, firebaseUser.email);
      notifyToast(`Password reset link sent to ${firebaseUser.email}.`, 'success');
    } catch (err: any) {
      notifyToast(
        isNetworkError(err)
          ? getFriendlyNetworkErrorMessage(err)
          : err?.message || 'Could not send password reset email.',
        'error'
      );
    }
  };

  const loadBusinessReviews = async (businessId: string): Promise<BusinessReview[]> => {
    const sample = SAMPLE_REVIEWS.filter((r) => r.business_id === businessId);
    if (!liveBusinesses.some((b) => b.business_id === businessId)) return sample;
    try {
      const snap = await getDocs(
        query(collection(db, 'businesses', businessId, 'reviews'), where('business_id', '==', businessId))
      );
      const live = snap.docs.map((d) => normalizeBusinessReviewDoc(d.id, businessId, d.data()));
      live.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
      return [...live, ...sample.filter((s) => !live.some((l) => l.review_id === s.review_id))];
    } catch (err) {
      handleActionFirestoreError(err, OperationType.LIST, `businesses/${businessId}/reviews`);
      return sample;
    }
  };

  const submitBusinessReview = async (business: Business, rating: number, comment: string) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    if (!liveBusinesses.some((b) => b.business_id === business.business_id)) {
      notifyToast('Review recorded on showcase business.', 'success');
      return;
    }
    const reviewId = generateUuid();
    const nextCount = (business.reviewCount || 0) + 1;
    const nextRating = Number(
      (((business.rating || 5) * (business.reviewCount || 0) + rating) / nextCount).toFixed(1)
    );
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', business.business_id, 'reviews', reviewId), {
      review_id: reviewId,
      business_id: business.business_id,
      user_id: currentUserId,
      auth_uid: firebaseUser.uid,
      rating,
      comment: comment.trim().slice(0, 800),
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'businesses', business.business_id), {
      rating: nextRating,
      reviewCount: nextCount,
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      notifyToast('Thank you! Your review has been published.', 'success');
    } catch (err) {
      handleActionFirestoreError(
        err,
        OperationType.WRITE,
        `businesses/${business.business_id}/reviews/${reviewId}`
      );
    }
  };

  // Presence visibility & Friendships
  const toggleOnlineStatusVisibility = async () => {
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness) return;
    const nextVisible = myBusiness.showOnlineStatus === false;
    try {
      await updateDoc(doc(db, 'businesses', myBusiness.business_id), {
        showOnlineStatus: nextVisible,
        isOnline: nextVisible,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      notifyToast(
        nextVisible
          ? 'Your online status and last seen time are now visible.'
          : 'Your online status and last seen time are now hidden.',
        'info'
      );
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `businesses/${myBusiness.business_id}`);
    }
  };

  const sendFriendRequest = async (targetBusiness: Business) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness || !currentUserId) return;
    if (targetBusiness.user_id === currentUserId) return;
    const pairUsers = [currentUserId, targetBusiness.user_id].sort();
    const pairAuths = [firebaseUser.uid, targetBusiness.auth_uid].sort();
    const friendshipId = deterministicUuid(`friendship:${pairUsers[0]}_${pairUsers[1]}`);

    try {
      await setDoc(doc(db, 'friendships', friendshipId), {
        friendship_id: friendshipId,
        requester_id: currentUserId,
        recipient_id: targetBusiness.user_id,
        participant_user_ids: pairUsers,
        participant_auth_uids: pairAuths,
        requester_auth_uid: firebaseUser.uid,
        recipient_auth_uid: targetBusiness.auth_uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (
        targetBusiness.auth_uid &&
        !isSampleAuthUid(targetBusiness.auth_uid) &&
        targetBusiness.auth_uid !== 'unknown'
      ) {
        const notifId = generateUuid();
        await setDoc(doc(db, 'notifications', notifId), {
          notification_id: notifId,
          recipient_user_id: targetBusiness.user_id,
          recipient_auth_uid: targetBusiness.auth_uid,
          actor_user_id: currentUserId,
          actor_business_id: myBusiness.business_id,
          type: 'friend',
          title: 'New business connection request',
          body: `${myBusiness.name} wants to connect with you on SwayPalm.`,
          read: false,
          targetTab: 'friends',
          createdAt: serverTimestamp(),
        });
      }
      notifyToast(`Connection request sent to ${targetBusiness.name}.`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `friendships/${friendshipId}`);
    }
  };

  const respondFriendRequest = async (friendship: Friendship, accept: boolean) => {
    if (!requireVerifiedUser()) return;
    try {
      await updateDoc(doc(db, 'friendships', friendship.friendship_id), {
        status: accept ? 'accepted' : 'declined',
        updatedAt: serverTimestamp(),
      });
      notifyToast(accept ? 'Business connection accepted!' : 'Request declined.', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `friendships/${friendship.friendship_id}`);
    }
  };

  // Marketplace & Cart
  const addProduct = async (input: {
    title: string;
    description: string;
    price: number;
    stock: number;
    category: BusinessCategory;
    imageDataUrl?: string;
  }) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness || !currentUserId) return;

    const myActiveProducts = products.filter((p) => p.user_id === currentUserId);
    const plan = userProfile?.plan || 'free';
    if (plan === 'free' && myActiveProducts.length >= 2) {
      notifyToast('Free plan allows 2 products. Subscribe to Basic ($5/mo) or Pro ($15/mo) for more.', 'error');
      setActivePage('advertise');
      return;
    }
    if (plan === 'basic' && myActiveProducts.length >= 15) {
      notifyToast('Basic plan allows 15 products. Upgrade to Pro for unlimited products.', 'error');
      setActivePage('advertise');
      return;
    }

    const productId = generateUuid();
    const payload: Record<string, any> = {
      product_id: productId,
      business_id: myBusiness.business_id,
      user_id: currentUserId,
      auth_uid: firebaseUser.uid,
      title: input.title.trim().slice(0, 140),
      description: input.description.trim().slice(0, 2000),
      price: Number(input.price),
      stock: Math.max(0, Math.floor(Number(input.stock))),
      category: input.category,
      imageTheme: myBusiness.coverTheme || 'hero_trade',
      boosted: plan === 'pro' || plan === 'premium',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.imageDataUrl) payload.imageDataUrl = input.imageDataUrl;

    try {
      await setDoc(doc(db, 'products', productId), payload);
      notifyToast(`"${input.title}" listed on SwayPalm Marketplace!`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `products/${productId}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!requireVerifiedUser()) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      notifyToast('Product removed.', 'info');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      notifyToast(`"${product.title}" is currently out of stock.`, 'error');
      return;
    }
    const safeQty = Math.max(1, Math.min(product.stock, Math.floor(quantity)));
    setCart((prev) => {
      const existingItem = prev.find((i) => i.product.product_id === product.product_id);
      if (existingItem) {
        const nextQty = Math.min(product.stock, existingItem.quantity + safeQty);
        return prev.map((i) =>
          i.product.product_id === product.product_id ? { ...i, product, quantity: nextQty } : i
        );
      }
      return [...prev, { product, quantity: safeQty }];
    });
    notifyToast(`Added "${product.title}" to cart.`, 'success');
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.product_id === productId
          ? { ...i, quantity: Math.min(Math.max(1, i.product.stock), qty) }
          : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.product_id !== productId));
  };

  const checkoutCart = async (details: {
    buyerName: string;
    buyerPhone: string;
    shippingAddress: string;
    paymentMethod: PaymentMethod;
  }) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId || cart.length === 0) return;

    const byBiz = new Map<string, CartItem[]>();
    for (const item of cart) {
      const list = byBiz.get(item.product.business_id) || [];
      list.push(item);
      byBiz.set(item.product.business_id, list);
    }

    const batch = writeBatch(db);
    for (const [businessId, items] of byBiz.entries()) {
      const first = items[0].product;
      const sellerBiz = getBusinessById(businessId);
      const sellerUserId = sellerBiz?.user_id || first.user_id;
      const sellerAuthUid = sellerBiz?.auth_uid || first.auth_uid;
      const orderId = generateUuid();
      const totalAmount = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      const split = calculateOrderSplit(totalAmount);

      batch.set(doc(db, 'orders', orderId), {
        order_id: orderId,
        buyer_id: currentUserId,
        seller_id: sellerUserId,
        business_id: businessId,
        buyer_auth_uid: firebaseUser.uid,
        seller_auth_uid: sellerAuthUid,
        buyerPhone: details.buyerPhone.trim().slice(0, 32),
        shippingAddress: details.shippingAddress.trim().slice(0, 240),
        items: items.map((i) => ({
          product_id: i.product.product_id,
          title: i.product.title,
          price: i.product.price,
          quantity: i.quantity,
        })),
        totalAmount: split.grossAmount,
        platformFeeRate: split.platformFeeRate,
        platformFeeAmount: split.platformFeeAmount,
        sellerNetAmount: split.sellerNetAmount,
        feeStatus: 'deducted',
        paymentMethod: details.paymentMethod,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      for (const item of items) {
        const liveProd = liveProducts.find((p) => p.product_id === item.product.product_id);
        if (liveProd && liveProd.stock >= item.quantity && item.quantity > 0) {
          batch.update(doc(db, 'products', liveProd.product_id), {
            stock: Math.max(0, liveProd.stock - item.quantity),
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (
        sellerUserId !== currentUserId &&
        sellerAuthUid &&
        !isSampleAuthUid(sellerAuthUid) &&
        sellerAuthUid !== 'unknown'
      ) {
        const notifId = generateUuid();
        const actorLabel = myBusiness?.name || details.buyerName.trim() || 'Buyer';
        batch.set(doc(db, 'notifications', notifId), {
          notification_id: notifId,
          recipient_user_id: sellerUserId,
          recipient_auth_uid: sellerAuthUid,
          actor_user_id: currentUserId,
          ...(myBusiness?.business_id ? { actor_business_id: myBusiness.business_id } : {}),
          type: 'order',
          title: 'New Marketplace Order',
          body: `${actorLabel} placed a $${split.grossAmount.toFixed(2)} order via ${details.paymentMethod}. 10% fee ($${split.platformFeeAmount.toFixed(2)}) auto-deducted; net payout: $${split.sellerNetAmount.toFixed(2)}.`,
          read: false,
          targetTab: 'dashboard',
          createdAt: serverTimestamp(),
        });
      }
    }

    try {
      await batch.commit();
      setCart([]);
      setShowCartDrawer(false);
      notifyToast('Order placed! 10% platform commission auto-deducted & sellers notified.', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.WRITE, 'orders');
    }
  };

  const updateOrderStatus = async (order: Order, nextStatus: Order['status']) => {
    if (!requireVerifiedUser()) return;
    try {
      await updateDoc(doc(db, 'orders', order.order_id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      notifyToast(`Order marked as ${nextStatus}.`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `orders/${order.order_id}`);
    }
  };

  // Real-Time Chat
  const startDirectChat = async (targetBusiness: Business, initialMessage?: string) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness || !currentUserId) return;
    if (targetBusiness.user_id === currentUserId) {
      setActivePage('chat');
      return;
    }

    const existing = chats.find(
      (c) =>
        c.type === 'direct' &&
        c.participant_user_ids.includes(currentUserId) &&
        c.participant_user_ids.includes(targetBusiness.user_id)
    );
    if (existing) {
      setActiveChatId(existing.chat_id);
      setActivePage('chat');
      if (initialMessage) {
        await sendChatMessage(existing, { type: 'text', text: initialMessage });
      }
      return;
    }

    const pairUsers = [currentUserId, targetBusiness.user_id].sort();
    const pairAuths = [firebaseUser.uid, targetBusiness.auth_uid].sort();
    const chatId = deterministicUuid(`direct_chat:${pairUsers[0]}_${pairUsers[1]}`);

    // Direct chats strictly use user IDs and NEVER store participant names
    const newThread: Record<string, any> = {
      chat_id: chatId,
      type: 'direct',
      participant_user_ids: pairUsers,
      participant_auth_uids: pairAuths,
      lastMessage: initialMessage ? initialMessage.slice(0, 500) : 'Direct business thread started',
      last_sender_id: currentUserId,
      unread_by: [targetBusiness.user_id],
      created_by: currentUserId,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'chats', chatId), newThread);
      if (initialMessage) {
        const msgId = generateUuid();
        await setDoc(doc(db, 'chats', chatId, 'messages', msgId), {
          message_id: msgId,
          chat_id: chatId,
          sender_id: currentUserId,
          sender_auth_uid: firebaseUser.uid,
          participant_user_ids: pairUsers,
          participant_auth_uids: pairAuths,
          type: 'text',
          text: initialMessage.slice(0, 2000),
          createdAt: serverTimestamp(),
        });
      }
      setActiveChatId(chatId);
      setActivePage('chat');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
    }
  };

  const createGroupChat = async (name: string, participantBusinesses: Business[]) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness || !currentUserId) return;
    const participantUserIds = Array.from(
      new Set([currentUserId, ...participantBusinesses.map((b) => b.user_id)])
    ).slice(0, 25);
    const participantAuthUids = Array.from(
      new Set([firebaseUser.uid, ...participantBusinesses.map((b) => b.auth_uid)])
    ).slice(0, 25);

    if (participantUserIds.length < 2) {
      notifyToast('Select at least one business to start a group chat.', 'error');
      return;
    }

    const chatId = generateUuid();
    try {
      await setDoc(doc(db, 'chats', chatId), {
        chat_id: chatId,
        type: 'group',
        name: name.trim().slice(0, 120),
        participant_user_ids: participantUserIds,
        participant_auth_uids: participantAuthUids,
        lastMessage: `Group "${name.trim()}" created`,
        last_sender_id: currentUserId,
        unread_by: participantUserIds.filter((id) => id !== currentUserId),
        created_by: currentUserId,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveChatId(chatId);
      setActivePage('chat');
      notifyToast(`Group chat "${name}" created!`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
    }
  };

  const subscribeToChatMessages = (chatId: string, cb: (msgs: ChatMessage[]) => void) => {
    if (!firebaseUser) return () => {};
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      where('participant_auth_uids', 'array-contains', firebaseUser.uid)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => normalizeChatMessageDoc(d.id, d.data()));
        list.sort((a, b) => toEpochMs(a.createdAt) - toEpochMs(b.createdAt));
        cb(list);
      },
      (err) => handleListenerError('Chat messages error', err)
    );
  };

  const sendChatMessage = async (
    chat: ChatThread,
    payload: {
      type: 'text' | 'photo' | 'voice';
      text?: string;
      mediaDataUrl?: string;
      voiceDurationSec?: number;
    }
  ) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    const msgId = generateUuid();
    const msgDoc: Record<string, any> = {
      message_id: msgId,
      chat_id: chat.chat_id,
      sender_id: currentUserId,
      sender_auth_uid: firebaseUser.uid,
      participant_user_ids: chat.participant_user_ids,
      participant_auth_uids: chat.participant_auth_uids,
      type: payload.type,
      createdAt: serverTimestamp(),
    };
    if (payload.text) msgDoc.text = payload.text.slice(0, 2000);
    if (payload.mediaDataUrl) msgDoc.mediaDataUrl = payload.mediaDataUrl;
    if (payload.voiceDurationSec) msgDoc.voiceDurationSec = payload.voiceDurationSec;

    const summary =
      payload.type === 'photo'
        ? 'Sent a photo'
        : payload.type === 'voice'
          ? `Voice note (${payload.voiceDurationSec || 3}s)`
          : (payload.text || '').slice(0, 500);

    const batch = writeBatch(db);
    batch.set(doc(db, 'chats', chat.chat_id, 'messages', msgId), msgDoc);
    batch.update(doc(db, 'chats', chat.chat_id), {
      lastMessage: summary,
      last_sender_id: currentUserId,
      unread_by: chat.participant_user_ids.filter((id) => id !== currentUserId),
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleActionFirestoreError(
        err,
        OperationType.WRITE,
        `chats/${chat.chat_id}/messages/${msgId}`
      );
    }
  };

  const markChatRead = async (chat: ChatThread) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!firebaseUser?.emailVerified || !currentUserId || !chat.unread_by?.includes(currentUserId)) {
      return;
    }
    try {
      await updateDoc(doc(db, 'chats', chat.chat_id), {
        unread_by: chat.unread_by.filter((id) => id !== currentUserId),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore read sync race
    }
  };

  // WebRTC Video & Audio Calling
  const CALL_RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  const cleanupCallResources = () => {
    if (callDocUnsubRef.current) {
      callDocUnsubRef.current();
      callDocUnsubRef.current = null;
    }
    if (candidatesUnsubRef.current) {
      candidatesUnsubRef.current();
      candidatesUnsubRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      try {
        pcRef.current.close();
      } catch {
        // ignore close error
      }
      pcRef.current = null;
    }
    addedCandidateIdsRef.current.clear();
    pendingRemoteCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    activeCallRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setCallConnectionState('idle');
    setIsMicMuted(false);
    setIsCameraEnabled(false);
    setCallElapsedSec(0);
    setCallMediaNotice(null);
  };

  useEffect(() => {
    return () => {
      cleanupCallResources();
    };
  }, []);

  useEffect(() => {
    if (callConnectionState !== 'connected' && callConnectionState !== 'preview') {
      return;
    }
    const timer = window.setInterval(() => {
      setCallElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callConnectionState]);

  // Listen for incoming WebRTC calls addressed to the signed-in user
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setIncomingCall(null);
      return;
    }
    const uid = firebaseUser.uid;
    const q = query(
      collection(db, 'calls'),
      where('participant_auth_uids', 'array-contains', uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const ringingList = snap.docs
          .map((d) => normalizeCallDoc(d.id, d.data()))
          .filter((c) => {
            if (c.callee_auth_uid !== uid || c.status !== 'ringing') return false;
            const createdMs = toEpochMs(c.createdAt);
            return createdMs === 0 || now - createdMs < 120_000;
          })
          .sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));

        if (!activeCallRef.current && ringingList.length > 0) {
          const nextCall = ringingList[0];
          setIncomingCall((prev) => {
            if (
              prev?.call_id !== nextCall.call_id &&
              settingPrefsRef.current.desktopCallAlerts &&
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted' &&
              document.visibilityState !== 'visible'
            ) {
              try {
                const callerLabel = getDisplayBusinessName(
                  nextCall.caller_business_id,
                  nextCall.caller_user_id,
                  'SwayPalm Partner'
                );
                new Notification(`Incoming ${nextCall.callType} call`, {
                  body: `${callerLabel} is calling you on SwayPalm`,
                });
              } catch {
                // ignore notification constructor errors
              }
            }
            return nextCall;
          });
        } else {
          setIncomingCall((prev) => {
            if (!prev) return null;
            const stillRinging = ringingList.some((c) => c.call_id === prev.call_id);
            return stillRinging ? prev : null;
          });
        }
      },
      (err) => handleListenerError('Incoming call listener error', err)
    );

    return () => unsub();
  }, [authReady, firebaseUser, businessesById, businessesByUserId]);

  const acquireLocalMedia = async (wantVideo: boolean) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        stream: null as MediaStream | null,
        hasAudio: false,
        hasVideo: false,
        notice: 'Camera and microphone access are unavailable in this browser — continuing in listen-only mode.',
      };
    }

    if (wantVideo) {
      try {
        const hd = settingPrefsRef.current.preferHdVideo;
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: 'user',
            width: { ideal: hd ? 1280 : 640 },
            height: { ideal: hd ? 720 : 360 },
          },
        });
        return {
          stream,
          hasAudio: stream.getAudioTracks().length > 0,
          hasVideo: stream.getVideoTracks().length > 0,
          notice: null as string | null,
        };
      } catch {
        // Fall back to audio-only when camera is unavailable or denied
      }
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      return {
        stream: audioStream,
        hasAudio: audioStream.getAudioTracks().length > 0,
        hasVideo: false,
        notice: wantVideo
          ? 'Camera unavailable — continuing with voice audio only.'
          : null,
      };
    } catch {
      return {
        stream: null as MediaStream | null,
        hasAudio: false,
        hasVideo: false,
        notice: 'Microphone unavailable or permission denied — connected in listen-only mode.',
      };
    }
  };

  const flushPendingRemoteCandidates = async (pc: RTCPeerConnection) => {
    if (!remoteDescSetRef.current) return;
    const queued = [...pendingRemoteCandidatesRef.current];
    pendingRemoteCandidatesRef.current = [];
    for (const init of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(init));
      } catch (err) {
        console.error('Failed to add queued ICE candidate', err);
      }
    }
  };

  const attachCandidateListener = (
    callId: string,
    myRole: 'caller' | 'callee',
    pc: RTCPeerConnection
  ) => {
    if (!firebaseUser) return;
    const candQuery = query(
      collection(db, 'calls', callId, 'candidates'),
      where('participant_auth_uids', 'array-contains', firebaseUser.uid)
    );
    candidatesUnsubRef.current = onSnapshot(
      candQuery,
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const data = change.doc.data() as {
            candidate_id?: string;
            id?: string;
            role: 'caller' | 'callee';
            candidateJson: string;
          };
          const candKey = data.candidate_id || data.id || change.doc.id;
          if (data.role === myRole || addedCandidateIdsRef.current.has(candKey)) return;
          addedCandidateIdsRef.current.add(candKey);
          try {
            const parsed = JSON.parse(data.candidateJson) as RTCIceCandidateInit;
            if (remoteDescSetRef.current) {
              pc.addIceCandidate(new RTCIceCandidate(parsed)).catch((err) =>
                console.error('addIceCandidate error', err)
              );
            } else {
              pendingRemoteCandidatesRef.current.push(parsed);
            }
          } catch (err) {
            console.error('Invalid ICE candidate JSON', err);
          }
        });
      },
      (err) => handleListenerError('ICE candidates listener error', err)
    );
  };

  const writeIceCandidateDoc = async (
    callId: string,
    role: 'caller' | 'callee',
    participantUserIds: string[],
    participantAuthUids: string[],
    candidate: RTCIceCandidate
  ) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!firebaseUser || !currentUserId) return;
    const candJson = JSON.stringify(candidate.toJSON());
    if (candJson.length < 2 || candJson.length > 2000) return;
    const candId = generateUuid();
    try {
      await setDoc(doc(db, 'calls', callId, 'candidates', candId), {
        candidate_id: candId,
        call_id: callId,
        sender_user_id: currentUserId,
        sender_auth_uid: firebaseUser.uid,
        role,
        participant_user_ids: participantUserIds,
        participant_auth_uids: participantAuthUids,
        candidateJson: candJson,
        createdAt: serverTimestamp(),
      });
    } catch {
      // ignore late ICE candidate write after call closes
    }
  };

  const startCall = async (
    targetBusiness: Business,
    callType: CallType,
    chatId?: string
  ) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireSignedIn() || !firebaseUser || !myBusiness || !currentUserId) return;
    if (targetBusiness.user_id === currentUserId) {
      notifyToast('You cannot call your own business account.', 'info');
      return;
    }
    if (activeCallRef.current) {
      notifyToast('End your current call before starting a new one.', 'info');
      return;
    }

    const media = await acquireLocalMedia(callType === 'video');
    const muteOnStart = settingPrefsRef.current.startCallsMuted && media.hasAudio;
    if (muteOnStart && media.stream) {
      media.stream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    localStreamRef.current = media.stream;
    setLocalStream(media.stream);
    setIsMicMuted(muteOnStart);
    setIsCameraEnabled(media.hasVideo);

    const participantUsers = [currentUserId, targetBusiness.user_id].sort();
    const participantAuths = [firebaseUser.uid, targetBusiness.auth_uid].sort();

    // Showcase businesses use an explicit local media preview rather than creating unanswerable calls
    if (targetBusiness.isSample || isSampleAuthUid(targetBusiness.auth_uid)) {
      const previewSession: CallSession = {
        call_id: generateUuid(),
        ...(chatId && isUuid(chatId) ? { chat_id: chatId } : {}),
        callType,
        caller_user_id: currentUserId,
        callee_user_id: targetBusiness.user_id,
        caller_business_id: myBusiness.business_id,
        callee_business_id: targetBusiness.business_id,
        participant_user_ids: participantUsers,
        participant_auth_uids: participantAuths,
        caller_auth_uid: firebaseUser.uid,
        callee_auth_uid: targetBusiness.auth_uid,
        status: 'active',
        offerSdp: 'preview-local-stage',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPreviewOnly: true,
      };
      activeCallRef.current = previewSession;
      setActiveCall(previewSession);
      setCallConnectionState('preview');
      setCallElapsedSec(0);
      setCallMediaNotice(
        media.notice
          ? `${media.notice} Showcase partner preview — live WebRTC calls connect with registered SwayPalm members.`
          : 'Showcase partner preview — live WebRTC audio & video calls connect directly with registered SwayPalm members.'
      );
      return;
    }

    if (!firebaseUser.emailVerified) {
      if (media.stream) {
        media.stream.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      setPendingEmailTarget(firebaseUser.email || '');
      setAuthMode('email_otp');
      setShowAuthModal(true);
      notifyToast('Verify your email to place live audio & video calls.', 'info');
      return;
    }

    if (typeof RTCPeerConnection === 'undefined') {
      cleanupCallResources();
      notifyToast('WebRTC calling is not supported by this browser.', 'error');
      return;
    }

    const callId = generateUuid();
    const pc = new RTCPeerConnection(CALL_RTC_CONFIG);
    pcRef.current = pc;

    const remoteMedia = new MediaStream();
    remoteStreamRef.current = remoteMedia;
    setRemoteStream(remoteMedia);

    if (media.stream) {
      media.stream.getTracks().forEach((track) => {
        pc.addTrack(track, media.stream!);
      });
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' });
      if (callType === 'video') {
        pc.addTransceiver('video', { direction: 'recvonly' });
      }
    }

    pc.ontrack = (event) => {
      const incomingTracks = event.streams?.[0]
        ? event.streams[0].getTracks()
        : [event.track];
      incomingTracks.forEach((track) => {
        if (!remoteMedia.getTracks().some((t) => t.id === track.id)) {
          remoteMedia.addTrack(track);
        }
      });
      setRemoteStream(new MediaStream(remoteMedia.getTracks()));
    };

    pc.onconnectionstatechange = () => {
      if (!pcRef.current) return;
      const st = pc.connectionState;
      if (st === 'connected') {
        setCallConnectionState('connected');
      } else if (st === 'connecting') {
        setCallConnectionState('connecting');
      } else if (st === 'failed') {
        notifyToast('Call connection lost due to network restrictions.', 'error');
        void endCurrentCall();
      }
    };

    let callDocCreated = false;
    const earlyLocalCandidates: RTCIceCandidate[] = [];

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      if (!callDocCreated) {
        earlyLocalCandidates.push(event.candidate);
      } else {
        void writeIceCandidateDoc(callId, 'caller', participantUsers, participantAuths, event.candidate);
      }
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);
      const offerJson = JSON.stringify(pc.localDescription || offer);
      if (offerJson.length < 10 || offerJson.length > 20000) {
        throw new Error('Offer SDP payload outside allowed bounds.');
      }

      const callDocPayload: Record<string, any> = {
        call_id: callId,
        ...(chatId && isUuid(chatId) ? { chat_id: chatId } : {}),
        callType,
        caller_user_id: currentUserId,
        callee_user_id: targetBusiness.user_id,
        ...(isUuid(myBusiness.business_id) ? { caller_business_id: myBusiness.business_id } : {}),
        ...(isUuid(targetBusiness.business_id) ? { callee_business_id: targetBusiness.business_id } : {}),
        participant_user_ids: participantUsers,
        participant_auth_uids: participantAuths,
        caller_auth_uid: firebaseUser.uid,
        callee_auth_uid: targetBusiness.auth_uid,
        status: 'ringing',
        offerSdp: offerJson,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'calls', callId), callDocPayload);
      callDocCreated = true;

      for (const cand of earlyLocalCandidates) {
        void writeIceCandidateDoc(callId, 'caller', participantUsers, participantAuths, cand);
      }

      const localSession: CallSession = {
        call_id: callId,
        ...(chatId && isUuid(chatId) ? { chat_id: chatId } : {}),
        callType,
        caller_user_id: currentUserId,
        callee_user_id: targetBusiness.user_id,
        caller_business_id: myBusiness.business_id,
        callee_business_id: targetBusiness.business_id,
        participant_user_ids: participantUsers,
        participant_auth_uids: participantAuths,
        caller_auth_uid: firebaseUser.uid,
        callee_auth_uid: targetBusiness.auth_uid,
        status: 'ringing',
        offerSdp: offerJson,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      activeCallRef.current = localSession;
      setActiveCall(localSession);
      setCallConnectionState('ringing');
      setCallElapsedSec(0);
      setCallMediaNotice(media.notice);

      callDocUnsubRef.current = onSnapshot(
        doc(db, 'calls', callId),
        async (snap) => {
          if (!snap.exists()) {
            cleanupCallResources();
            return;
          }
          const updated = normalizeCallDoc(snap.id, snap.data());
          activeCallRef.current = updated;
          setActiveCall(updated);

          if (updated.answerSdp && !remoteDescSetRef.current && pcRef.current) {
            try {
              const answerDesc = JSON.parse(updated.answerSdp) as RTCSessionDescriptionInit;
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerDesc));
              remoteDescSetRef.current = true;
              setCallConnectionState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
              await flushPendingRemoteCandidates(pcRef.current);
            } catch (err) {
              console.error('Failed to apply remote answer SDP', err);
            }
          }

          if (
            updated.status === 'ended' ||
            updated.status === 'declined' ||
            updated.status === 'missed'
          ) {
            const calleeLabel = getDisplayBusinessName(
              updated.callee_business_id,
              updated.callee_user_id,
              'Partner'
            );
            const reason =
              updated.status === 'declined'
                ? `${calleeLabel} declined the call.`
                : updated.status === 'missed'
                  ? `${calleeLabel} did not answer.`
                  : 'Call ended.';
            notifyToast(reason, 'info');
            cleanupCallResources();
          }
        },
        (err) => handleListenerError('Active outgoing call listener error', err)
      );

      attachCandidateListener(callId, 'caller', pc);
    } catch (err) {
      cleanupCallResources();
      handleActionFirestoreError(err, OperationType.CREATE, `calls/${callId}`);
    }
  };

  const acceptIncomingCall = async (withVideo?: boolean) => {
    if (!firebaseUser || !incomingCall) return;
    if (!firebaseUser.emailVerified) {
      notifyToast('Verify your email to answer live calls.', 'info');
      return;
    }
    if (typeof RTCPeerConnection === 'undefined') {
      notifyToast('WebRTC calling is not supported by this browser.', 'error');
      return;
    }

    const callToAnswer = incomingCall;
    setIncomingCall(null);
    cleanupCallResources();

    const wantVideo =
      typeof withVideo === 'boolean' ? withVideo : callToAnswer.callType === 'video';
    const media = await acquireLocalMedia(wantVideo);
    const muteOnStart = settingPrefsRef.current.startCallsMuted && media.hasAudio;
    if (muteOnStart && media.stream) {
      media.stream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    localStreamRef.current = media.stream;
    setLocalStream(media.stream);
    setIsMicMuted(muteOnStart);
    setIsCameraEnabled(media.hasVideo);
    setCallMediaNotice(media.notice);

    const pc = new RTCPeerConnection(CALL_RTC_CONFIG);
    pcRef.current = pc;

    const remoteMedia = new MediaStream();
    remoteStreamRef.current = remoteMedia;
    setRemoteStream(remoteMedia);

    if (media.stream) {
      media.stream.getTracks().forEach((track) => {
        pc.addTrack(track, media.stream!);
      });
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' });
      if (callToAnswer.callType === 'video') {
        pc.addTransceiver('video', { direction: 'recvonly' });
      }
    }

    pc.ontrack = (event) => {
      const incomingTracks = event.streams?.[0]
        ? event.streams[0].getTracks()
        : [event.track];
      incomingTracks.forEach((track) => {
        if (!remoteMedia.getTracks().some((t) => t.id === track.id)) {
          remoteMedia.addTrack(track);
        }
      });
      setRemoteStream(new MediaStream(remoteMedia.getTracks()));
    };

    pc.onconnectionstatechange = () => {
      if (!pcRef.current) return;
      const st = pc.connectionState;
      if (st === 'connected') {
        setCallConnectionState('connected');
      } else if (st === 'connecting') {
        setCallConnectionState('connecting');
      } else if (st === 'failed') {
        notifyToast('Call connection lost.', 'error');
        void endCurrentCall();
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      void writeIceCandidateDoc(
        callToAnswer.call_id,
        'callee',
        callToAnswer.participant_user_ids,
        callToAnswer.participant_auth_uids,
        event.candidate
      );
    };

    try {
      const offerDesc = JSON.parse(callToAnswer.offerSdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
      remoteDescSetRef.current = true;

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const answerJson = JSON.stringify(pc.localDescription || answer);

      await updateDoc(doc(db, 'calls', callToAnswer.call_id), {
        answerSdp: answerJson.slice(0, 20000),
        status: 'active',
        updatedAt: serverTimestamp(),
      });

      const activeSession: CallSession = {
        ...callToAnswer,
        answerSdp: answerJson,
        status: 'active',
      };
      activeCallRef.current = activeSession;
      setActiveCall(activeSession);
      setCallConnectionState('connecting');
      setCallElapsedSec(0);

      attachCandidateListener(callToAnswer.call_id, 'callee', pc);
      await flushPendingRemoteCandidates(pc);

      callDocUnsubRef.current = onSnapshot(
        doc(db, 'calls', callToAnswer.call_id),
        (snap) => {
          if (!snap.exists()) {
            cleanupCallResources();
            return;
          }
          const updated = normalizeCallDoc(snap.id, snap.data());
          activeCallRef.current = updated;
          setActiveCall(updated);
          if (
            updated.status === 'ended' ||
            updated.status === 'declined' ||
            updated.status === 'missed'
          ) {
            notifyToast('Call ended.', 'info');
            cleanupCallResources();
          }
        },
        (err) => handleListenerError('Incoming accepted call listener error', err)
      );
    } catch (err) {
      cleanupCallResources();
      handleActionFirestoreError(err, OperationType.UPDATE, `calls/${callToAnswer.call_id}`);
    }
  };

  const declineIncomingCall = async () => {
    if (!incomingCall) return;
    const targetId = incomingCall.call_id;
    setIncomingCall(null);
    try {
      await updateDoc(doc(db, 'calls', targetId), {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore if already ended by caller
    }
  };

  const endCurrentCall = async () => {
    const current = activeCallRef.current;
    cleanupCallResources();
    if (current && !current.isPreviewOnly) {
      const nextStatus =
        current.status === 'ringing' && current.caller_auth_uid === firebaseUser?.uid
          ? 'missed'
          : 'ended';
      try {
        await updateDoc(doc(db, 'calls', current.call_id), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // ignore if already closed
      }
    }
  };

  const toggleMicMute = () => {
    if (!localStreamRef.current) return;
    const tracks = localStreamRef.current.getAudioTracks();
    if (tracks.length === 0) return;
    const nextMuted = !isMicMuted;
    tracks.forEach((t) => {
      t.enabled = !nextMuted;
    });
    setIsMicMuted(nextMuted);
  };

  const toggleCameraVideo = async () => {
    if (!localStreamRef.current) {
      notifyToast('Camera device is unavailable in listen-only mode.', 'info');
      return;
    }
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) {
      notifyToast('Video camera was not enabled for this audio call.', 'info');
      return;
    }
    const nextEnabled = !isCameraEnabled;
    videoTracks.forEach((t) => {
      t.enabled = nextEnabled;
    });
    setIsCameraEnabled(nextEnabled);
  };

  // Groups
  const createGroup = async (input: {
    name: string;
    description: string;
    category: string;
    location: string;
  }) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !myBusiness || !currentUserId) return;
    const groupId = generateUuid();
    const batch = writeBatch(db);
    batch.set(doc(db, 'groups', groupId), {
      group_id: groupId,
      creator_user_id: currentUserId,
      creator_auth_uid: firebaseUser.uid,
      name: input.name.trim().slice(0, 120),
      description: input.description.trim().slice(0, 800),
      category: input.category.trim().slice(0, 80),
      location: input.location.trim().slice(0, 80),
      coverTheme: myBusiness.coverTheme || 'services_logistics',
      membersCount: 1,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'groups', groupId, 'members', currentUserId), {
      user_id: currentUserId,
      auth_uid: firebaseUser.uid,
      role: 'admin',
      joinedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setLocalJoinedGroups((prev) => new Set(prev).add(groupId));
      notifyToast(`Group "${input.name}" created!`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `groups/${groupId}`);
    }
  };

  const toggleJoinGroup = async (group: BusinessGroup) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    const isJoined = localJoinedGroups.has(group.group_id);
    if (!isJoined && (userProfile?.plan || 'free') === 'free' && localJoinedGroups.size >= 3) {
      notifyToast('Free plan allows joining 3 groups. Upgrade to Basic ($5/mo) for unlimited groups.', 'error');
      setActivePage('advertise');
      return;
    }

    if (!liveGroups.some((g) => g.group_id === group.group_id)) {
      setLocalJoinedGroups((prev) => {
        const next = new Set(prev);
        if (isJoined) next.delete(group.group_id);
        else next.add(group.group_id);
        return next;
      });
      notifyToast(isJoined ? `Left ${group.name}.` : `Joined ${group.name}!`, 'success');
      return;
    }

    const memberRef = doc(db, 'groups', group.group_id, 'members', currentUserId);
    const groupRef = doc(db, 'groups', group.group_id);
    const batch = writeBatch(db);
    if (isJoined) {
      batch.delete(memberRef);
      batch.update(groupRef, {
        membersCount: Math.max(0, group.membersCount - 1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(memberRef, {
        user_id: currentUserId,
        auth_uid: firebaseUser.uid,
        role: 'member',
        joinedAt: serverTimestamp(),
      });
      batch.update(groupRef, {
        membersCount: group.membersCount + 1,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      setLocalJoinedGroups((prev) => {
        const next = new Set(prev);
        if (isJoined) next.delete(group.group_id);
        else next.add(group.group_id);
        return next;
      });
      notifyToast(isJoined ? `Left ${group.name}.` : `Joined ${group.name}!`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.WRITE, `groups/${group.group_id}`);
    }
  };

  const loadGroupDetails = async (
    groupId: string
  ): Promise<{ members: GroupMember[]; posts: GroupPost[] }> => {
    if (!liveGroups.some((g) => g.group_id === groupId)) {
      return {
        members: [
          {
            user_id: SAMPLE_OWNER_UUIDS[0],
            auth_uid: 'sample_auth_01',
            role: 'admin',
            joinedAt: new Date().toISOString(),
          },
          {
            user_id: SAMPLE_OWNER_UUIDS[1],
            auth_uid: 'sample_auth_02',
            role: 'member',
            joinedAt: new Date().toISOString(),
          },
        ],
        posts: [
          {
            group_post_id: deterministicUuid(`sample_gp:${groupId}:1`),
            group_id: groupId,
            user_id: SAMPLE_OWNER_UUIDS[0],
            auth_uid: 'sample_auth_01',
            content: 'Welcome members! Drop your monthly product catalog or sourcing needs below so partners can connect.',
            createdAt: '2026-11-19T14:00:00.000Z',
          },
        ],
      };
    }

    try {
      const [mSnap, pSnap] = await Promise.all([
        getDocs(
          query(collection(db, 'groups', groupId, 'members'), where('role', 'in', ['member', 'admin']))
        ),
        getDocs(query(collection(db, 'groups', groupId, 'posts'), where('group_id', '==', groupId))),
      ]);
      const groupPosts = pSnap.docs.map((d) => normalizeGroupPostDoc(d.id, groupId, d.data()));
      groupPosts.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
      return {
        members: mSnap.docs.map((d) => normalizeGroupMemberDoc(d.id, d.data())),
        posts: groupPosts,
      };
    } catch (err) {
      handleActionFirestoreError(err, OperationType.LIST, `groups/${groupId}`);
      return { members: [], posts: [] };
    }
  };

  const postInGroup = async (groupId: string, content: string) => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireVerifiedUser() || !firebaseUser || !currentUserId) return;
    if (!liveGroups.some((g) => g.group_id === groupId)) {
      notifyToast('Posted in showcase group.', 'success');
      return;
    }
    const postId = generateUuid();
    try {
      await setDoc(doc(db, 'groups', groupId, 'posts', postId), {
        group_post_id: postId,
        group_id: groupId,
        user_id: currentUserId,
        auth_uid: firebaseUser.uid,
        content: content.trim().slice(0, 2000),
        createdAt: serverTimestamp(),
      });
      notifyToast('Posted to group feed.', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `groups/${groupId}/posts/${postId}`);
    }
  };

  // Subscriptions & Adverts
  const subscribeToPlan = async (
    plan: 'basic' | 'pro' | 'premium',
    method: PaymentMethod,
    reference: string,
    details?: {
      paybillNumber?: string;
      accountNumber?: string;
      payerPhone?: string;
      amountKes?: number;
      mpesaCode?: string;
      checkoutRequestId?: string;
      cardSandboxToken?: string;
      stripeSessionId?: string;
    }
  ): Promise<boolean> => {
    const currentUserId = userProfile?.id || userUuid;
    if (!requireSignedIn() || !firebaseUser || !myBusiness || !currentUserId) return false;
    if (!firebaseUser.emailVerified) {
      setPendingEmailTarget(firebaseUser.email || '');
      setAuthMode('email_otp');
      setShowAuthModal(true);
      notifyToast('Verify your email address first to activate a subscription.', 'info');
      return false;
    }

    const amounts: Record<'basic' | 'pro' | 'premium', number> = {
      basic: 5,
      pro: 15,
      premium: 30,
    };

    const paybillNumber = details?.paybillNumber || (method === 'M-Pesa' ? '247247' : '');
    const accountNumber = details?.accountNumber || (method === 'M-Pesa' ? '0460180118328' : '');
    const payerPhone = details?.payerPhone?.trim() || '';
    const mpesaCode = details?.mpesaCode?.trim() || reference.trim();
    const checkoutRequestId = details?.checkoutRequestId?.trim() || '';
    const cardSandboxToken = details?.cardSandboxToken?.trim() || '';
    const stripeSessionId = details?.stripeSessionId?.trim() || '';

    let verifiedReference = reference.trim();
    let verifiedPhone = payerPhone;
    let verifiedAmountKes = details?.amountKes ?? amounts[plan] * 130;

    const verifyRes = await safeFetchJson<{
      verified?: boolean;
      error?: string;
      normalizedCode?: string;
      normalizedPhone?: string;
      amountKes?: number;
    }>('/api/payments/mpesa-paybill/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        method,
        paybillNumber,
        accountNumber,
        payerPhone,
        mpesaCode,
        checkoutRequestId,
        cardSandboxToken,
        stripeSessionId,
        reference: reference.trim(),
        businessId: myBusiness.business_id,
      }),
    });

    if (!verifyRes.ok || !verifyRes.data?.verified) {
      notifyToast(verifyRes.error || 'Payment verification failed. Check your details.', 'error');
      return false;
    }
    if (verifyRes.data.normalizedCode) verifiedReference = verifyRes.data.normalizedCode;
    if (verifyRes.data.normalizedPhone) verifiedPhone = verifyRes.data.normalizedPhone;
    if (typeof verifyRes.data.amountKes === 'number') verifiedAmountKes = verifyRes.data.amountKes;

    const paymentId = generateUuid();
    const paymentPayload: Record<string, unknown> = {
      payment_id: paymentId,
      user_id: currentUserId,
      business_id: myBusiness.business_id,
      auth_uid: firebaseUser.uid,
      plan,
      amount: amounts[plan],
      method,
      reference: (verifiedReference || `SWP-${Date.now()}`).slice(0, 100),
      status: 'completed',
      createdAt: serverTimestamp(),
    };

    if (method === 'M-Pesa') {
      paymentPayload.paybillNumber = paybillNumber.slice(0, 20);
      paymentPayload.accountNumber = accountNumber.slice(0, 32);
      if (verifiedPhone) paymentPayload.payerPhone = verifiedPhone.slice(0, 32);
      paymentPayload.amountKes = verifiedAmountKes;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'payments', paymentId), paymentPayload);
    batch.update(doc(db, 'users', currentUserId), {
      plan,
      verified: true,
      lastPaymentId: paymentId,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'businesses', myBusiness.business_id), {
      plan,
      verified: true,
      lastPaymentId: paymentId,
      updatedAt: serverTimestamp(),
    });

    const notifId = generateUuid();
    batch.set(doc(db, 'notifications', notifId), {
      notification_id: notifId,
      recipient_user_id: currentUserId,
      recipient_auth_uid: firebaseUser.uid,
      type: 'advert',
      title: `${plan.toUpperCase()} Plan Activated`,
      body:
        method === 'M-Pesa'
          ? `M-Pesa Paybill ${paybillNumber} (Acc ${accountNumber}, Ref ${verifiedReference}) confirmed. Verified badge unlocked!`
          : `Payment via ${method} confirmed. Verified badge and advertising features are now unlocked!`,
      read: false,
      targetTab: 'dashboard',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      notifyToast(
        method === 'M-Pesa'
          ? `Paybill ${paybillNumber} verified! Upgraded to ${plan.toUpperCase()}.`
          : `Upgraded to ${plan.toUpperCase()}! Verified badge unlocked.`,
        'success'
      );
      return true;
    } catch (err) {
      handleActionFirestoreError(err, OperationType.WRITE, `payments/${paymentId}`);
      return false;
    }
  };

  const createPaidAdvert = async (input: PaidAdvertInput): Promise<AdvertCampaign | null> => {
    if (firebaseUser && !firebaseUser.emailVerified) {
      setPendingEmailTarget(firebaseUser.email || '');
      setAuthMode('email_otp');
      setShowAuthModal(true);
      notifyToast('Verify your email address first, or sign out to post as a guest advertiser.', 'info');
      return null;
    }

    const cleanTitle = input.title.trim().slice(0, 140);
    const cleanRegion = input.targetRegion.trim().slice(0, 80) || 'Global';
    if (cleanTitle.length < 2) {
      notifyToast('Enter an advert headline (at least 2 characters).', 'error');
      return null;
    }

    const currentUserId = userProfile?.id || userUuid;
    const isVerifiedMember = Boolean(
      firebaseUser && firebaseUser.emailVerified && myBusiness && currentUserId
    );
    const targetUserId = isVerifiedMember && currentUserId ? currentUserId : GUEST_USER_ID;
    const targetAuthUid = isVerifiedMember && firebaseUser ? firebaseUser.uid : 'guest';
    const advertiserType: 'user' | 'guest' = isVerifiedMember ? 'user' : 'guest';
    const targetBusinessId =
      isVerifiedMember && myBusiness ? myBusiness.business_id : GUEST_BUSINESS_ID;
    const advertiserName = (
      input.advertiserName.trim() ||
      (isVerifiedMember ? myBusiness?.name : '') ||
      'Sponsored Advertiser'
    ).slice(0, 120);

    const method = input.method;
    const paybillNumber = input.paybillNumber || (method === 'M-Pesa' ? '247247' : '');
    const accountNumber = input.accountNumber || (method === 'M-Pesa' ? '0460180118328' : '');
    const payerPhone = input.payerPhone?.trim() || '';
    const mpesaCode = input.mpesaCode?.trim() || input.reference.trim();
    const checkoutRequestId = input.checkoutRequestId?.trim() || '';
    const cardSandboxToken = input.cardSandboxToken?.trim() || '';
    const stripeSessionId = input.stripeSessionId?.trim() || '';

    let verifiedReference = input.reference.trim();
    let verifiedPhone = payerPhone;
    let verifiedAmountKes = input.amountKes ?? AD_PLAY_PRICE_KES;

    const verifyRes = await safeFetchJson<{
      verified?: boolean;
      error?: string;
      normalizedCode?: string;
      normalizedPhone?: string;
      amountKes?: number;
    }>('/api/payments/mpesa-paybill/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'ad_slot',
        method,
        paybillNumber,
        accountNumber,
        payerPhone,
        mpesaCode,
        checkoutRequestId,
        cardSandboxToken,
        stripeSessionId,
        reference: input.reference.trim(),
        businessId: targetBusinessId,
      }),
    });

    if (!verifyRes.ok || !verifyRes.data?.verified) {
      notifyToast(verifyRes.error || 'Ad payment verification failed ($12 required per ad playing).', 'error');
      return null;
    }

    if (verifyRes.data.normalizedCode) verifiedReference = verifyRes.data.normalizedCode;
    if (verifyRes.data.normalizedPhone) verifiedPhone = verifyRes.data.normalizedPhone;
    if (typeof verifyRes.data.amountKes === 'number') verifiedAmountKes = verifyRes.data.amountKes;

    const finalRef = (verifiedReference || `SWP-AD-${Date.now()}`).slice(0, 100);
    const paymentId = generateUuid();
    const advertId = generateUuid();

    const paymentPayload: Record<string, unknown> = {
      payment_id: paymentId,
      user_id: targetUserId,
      business_id: targetBusinessId,
      auth_uid: targetAuthUid,
      plan: 'ad_slot',
      advert_id: advertId,
      amount: AD_PLAY_PRICE_USD,
      method,
      reference: finalRef,
      status: 'completed',
      createdAt: serverTimestamp(),
    };

    if (method === 'M-Pesa') {
      paymentPayload.paybillNumber = paybillNumber.slice(0, 20);
      paymentPayload.accountNumber = accountNumber.slice(0, 32);
      if (verifiedPhone) paymentPayload.payerPhone = verifiedPhone.slice(0, 32);
      paymentPayload.amountKes = verifiedAmountKes;
    }

    const cleanDescription = input.description?.trim().slice(0, 600) || '';
    const cleanCtaLabel = input.ctaLabel?.trim().slice(0, 40) || '';
    const cleanCtaUrl = normalizeExternalUrl(input.ctaUrl) || '';
    const cleanMediaDataUrl = input.mediaDataUrl?.trim().slice(0, 400000) || '';
    const cleanMediaTheme = (input.mediaTheme?.trim() || 'hero_trade').slice(0, 60);

    const advertPayload: Record<string, unknown> = {
      advert_id: advertId,
      user_id: targetUserId,
      business_id: targetBusinessId,
      auth_uid: targetAuthUid,
      advertiserType,
      ...(advertiserType === 'guest' || input.advertiserName.trim()
        ? { advertiser_name: advertiserName }
        : {}),
      title: cleanTitle,
      targetRegion: cleanRegion,
      mediaTheme: cleanMediaTheme,
      budgetTier: 'ad_slot',
      priceUsd: AD_PLAY_PRICE_USD,
      paymentStatus: 'paid',
      payment_id: paymentId,
      paymentMethod: method,
      paymentReference: finalRef,
      status: 'approved',
      impressions: 0,
      clicks: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (cleanDescription) advertPayload.description = cleanDescription;
    if (cleanCtaLabel) advertPayload.ctaLabel = cleanCtaLabel;
    if (cleanCtaUrl) advertPayload.ctaUrl = cleanCtaUrl;
    if (cleanMediaDataUrl) advertPayload.mediaDataUrl = cleanMediaDataUrl;

    const batch = writeBatch(db);
    batch.set(doc(db, 'payments', paymentId), paymentPayload);
    batch.set(doc(db, 'adverts', advertId), advertPayload);

    if (isVerifiedMember && firebaseUser && currentUserId) {
      const notifId = generateUuid();
      batch.set(doc(db, 'notifications', notifId), {
        notification_id: notifId,
        recipient_user_id: currentUserId,
        recipient_auth_uid: firebaseUser.uid,
        type: 'advert',
        title: 'Ad Now Playing ($12 Paid)',
        body: `"${cleanTitle}" is now live in Sponsored Ads for ${cleanRegion}.`,
        read: false,
        targetTab: 'advertise',
        createdAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      if (!isVerifiedMember) {
        setGuestAdIds((prev) => {
          const next = [advertId, ...prev.filter((id) => id !== advertId)].slice(0, 30);
          try {
            localStorage.setItem('swaypalm_guest_ad_ids', JSON.stringify(next));
          } catch {
            // ignore storage quota
          }
          return next;
        });
      }
      notifyToast(`$12 ad payment verified! "${cleanTitle}" is now playing live.`, 'success');
      return {
        advert_id: advertId,
        user_id: targetUserId,
        business_id: targetBusinessId,
        auth_uid: targetAuthUid,
        advertiserType,
        ...(advertiserType === 'guest' || input.advertiserName.trim()
          ? { advertiser_name: advertiserName }
          : {}),
        title: cleanTitle,
        description: cleanDescription || undefined,
        targetRegion: cleanRegion,
        ctaLabel: cleanCtaLabel || undefined,
        ctaUrl: cleanCtaUrl || undefined,
        mediaDataUrl: cleanMediaDataUrl || undefined,
        mediaTheme: cleanMediaTheme,
        budgetTier: 'ad_slot',
        priceUsd: AD_PLAY_PRICE_USD,
        paymentStatus: 'paid',
        payment_id: paymentId,
        paymentMethod: method,
        paymentReference: finalRef,
        status: 'approved',
        impressions: 0,
        clicks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      handleActionFirestoreError(err, OperationType.CREATE, `adverts/${advertId}`);
      return null;
    }
  };

  const recordAdvertImpression = (advertId: string) => {
    if (!advertId || viewedAdvertSessionRef.current.has(advertId)) return;
    viewedAdvertSessionRef.current.add(advertId);
    updateDoc(doc(db, 'adverts', advertId), {
      impressions: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  };

  const recordAdvertClick = (advertId: string) => {
    if (!advertId) return;
    updateDoc(doc(db, 'adverts', advertId), {
      clicks: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  };

  const createAdvertCampaign = async (_input: { title: string; targetRegion: string }) => {
    notifyToast('Every advert playing costs $12 USD. Complete the $12 checkout to launch your ad immediately.', 'info');
    setActivePage('advertise');
  };

  // Notifications
  const markNotificationRead = async (notifId: string) => {
    if (!firebaseUser?.emailVerified) return;
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!firebaseUser?.emailVerified) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    for (const n of unread) {
      batch.update(doc(db, 'notifications', n.notification_id), { read: true });
    }
    try {
      await batch.commit();
      notifyToast('All notifications marked read.', 'info');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  };

  // Admin Actions
  const adminMigrateDatabaseToUuids = async (): Promise<UuidMigrationReport | null> => {
    if (!isAdmin || !firebaseUser?.emailVerified) {
      notifyToast('Verified admin access required to run database UUID migration.', 'error');
      return null;
    }
    setMigrationStatus((prev) => ({ ...prev, running: true, error: null }));
    try {
      const report = await runFullUuidMigration(db);
      setMigrationStatus({ running: false, lastReport: report, error: null });
      notifyToast(
        `UUID migration complete! Migrated ${report.migratedUsers} users, ${report.migratedBusinesses} businesses, ${report.migratedProducts} products, ${report.migratedPosts} posts, ${report.migratedOrders} orders, ${report.migratedChats} chats (${report.deletedLegacyDocs} legacy docs cleaned up).`,
        'success'
      );
      return report;
    } catch (err: any) {
      const message = err?.message || 'Database UUID migration failed.';
      setMigrationStatus((prev) => ({ ...prev, running: false, error: message }));
      handleActionFirestoreError(err, OperationType.WRITE, 'uuid_migration');
      return null;
    }
  };

  const adminSetBusinessStatus = async (business: Business, status: 'active' | 'blocked') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'businesses', business.business_id), {
        status,
        updatedAt: serverTimestamp(),
      });
      notifyToast(`${business.name} marked ${status}.`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `businesses/${business.business_id}`);
    }
  };

  const adminToggleVerifyBusiness = async (business: Business) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'businesses', business.business_id), {
        verified: !business.verified,
        updatedAt: serverTimestamp(),
      });
      notifyToast(`${business.name} verification updated.`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `businesses/${business.business_id}`);
    }
  };

  const adminSetProductStatus = async (product: Product, status: 'active' | 'hidden') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'products', product.product_id), {
        status,
        updatedAt: serverTimestamp(),
      });
      notifyToast(`Product "${product.title}" marked ${status}.`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `products/${product.product_id}`);
    }
  };

  const adminSetAdvertStatus = async (advert: AdvertCampaign, status: 'approved' | 'paused') => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'adverts', advert.advert_id), {
      status,
      updatedAt: serverTimestamp(),
    });
    if (
      status === 'approved' &&
      advert.auth_uid &&
      advert.auth_uid !== 'guest' &&
      !isSampleAuthUid(advert.auth_uid)
    ) {
      const notifId = generateUuid();
      batch.set(doc(db, 'notifications', notifId), {
        notification_id: notifId,
        recipient_user_id: advert.user_id,
        recipient_auth_uid: advert.auth_uid,
        type: 'advert',
        title: 'Advert Approved!',
        body: `Your campaign "${advert.title}" is now live across ${advert.targetRegion}.`,
        read: false,
        targetTab: 'dashboard',
        createdAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      notifyToast(`Advert ${status}.`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `adverts/${advert.advert_id}`);
    }
  };

  const adminMarkOrderFeeSettled = async (order: Order) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'orders', order.order_id), {
        feeStatus: 'settled',
        updatedAt: serverTimestamp(),
      });
      notifyToast(`Order ${order.order_id.slice(0, 8)} 10% commission marked settled.`, 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.UPDATE, `orders/${order.order_id}`);
    }
  };

  const adminSeedSampleCatalog = async () => {
    if (!isAdmin || !firebaseUser?.emailVerified) {
      notifyToast('Verified admin account required to sync sample catalog.', 'error');
      return;
    }

    try {
      const bizSnaps = await Promise.all(
        SAMPLE_BUSINESSES.map((b) => getDoc(doc(db, 'businesses', b.business_id)))
      );
      const bizBatch = writeBatch(db);
      SAMPLE_BUSINESSES.forEach((b, idx) => {
        const { isSample: _ignored, createdAt: _created, ...rest } = b;
        const ref = doc(db, 'businesses', b.business_id);
        if (bizSnaps[idx].exists()) {
          bizBatch.update(ref, {
            ...rest,
            lastSeenAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          bizBatch.set(ref, {
            ...rest,
            lastSeenAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });
      await bizBatch.commit();

      const [prodSnaps, postSnaps, grpSnaps] = await Promise.all([
        Promise.all(SAMPLE_PRODUCTS.map((p) => getDoc(doc(db, 'products', p.product_id)))),
        Promise.all(SAMPLE_POSTS.map((post) => getDoc(doc(db, 'posts', post.post_id)))),
        Promise.all(SAMPLE_GROUPS.map((grp) => getDoc(doc(db, 'groups', grp.group_id)))),
      ]);

      const catalogBatch = writeBatch(db);
      SAMPLE_PRODUCTS.forEach((p, idx) => {
        const { createdAt: _created, ...rest } = p;
        const ref = doc(db, 'products', p.product_id);
        if (prodSnaps[idx].exists()) {
          catalogBatch.update(ref, {
            ...rest,
            updatedAt: serverTimestamp(),
          });
        } else {
          catalogBatch.set(ref, {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });
      SAMPLE_POSTS.forEach((post, idx) => {
        const { createdAt: _created, ...rest } = post;
        const ref = doc(db, 'posts', post.post_id);
        if (postSnaps[idx].exists()) {
          catalogBatch.update(ref, {
            ...rest,
            updatedAt: serverTimestamp(),
          });
        } else {
          catalogBatch.set(ref, {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });
      SAMPLE_GROUPS.forEach((grp, idx) => {
        const { createdAt: _created, ...rest } = grp;
        const ref = doc(db, 'groups', grp.group_id);
        if (grpSnaps[idx].exists()) {
          catalogBatch.update(ref, {
            ...rest,
            updatedAt: serverTimestamp(),
          });
        } else {
          catalogBatch.set(ref, {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });
      await catalogBatch.commit();
      notifyToast('12 global businesses, products, posts & groups seeded with UUIDs to Firestore!', 'success');
    } catch (err) {
      handleActionFirestoreError(err, OperationType.WRITE, 'sample_catalog');
    }
  };

  const handledStripeReturnRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !authReady) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('card_checkout');
    if (!checkoutState) return;

    if (checkoutState === 'cancelled') {
      try {
        window.history.replaceState(
          {},
          document.title,
          getPagePath(resolvePageFromLocation(window.location))
        );
      } catch {
        // ignore history error
      }
      notifyToast('Card checkout was cancelled. No charge was made.', 'info');
      return;
    }

    if (checkoutState !== 'success') return;
    const sessionId = params.get('session_id')?.trim() || '';
    const rawPurpose = params.get('purpose');
    const purpose =
      rawPurpose === 'marketplace'
        ? 'marketplace'
        : rawPurpose === 'ad_slot'
          ? 'ad_slot'
          : 'subscription';
    const planParam = params.get('plan')?.trim() || '';
    if (!sessionId || handledStripeReturnRef.current === sessionId) return;

    if (purpose !== 'ad_slot' && (!firebaseUser || !myBusiness)) return;
    handledStripeReturnRef.current = sessionId;

    void (async () => {
      try {
        window.history.replaceState(
          {},
          document.title,
          getPagePath(resolvePageFromLocation(window.location))
        );
      } catch {
        // ignore history error
      }

      if (purpose === 'ad_slot') {
        let rawDraft: string | null = null;
        try {
          rawDraft = window.sessionStorage.getItem('swaypalm_pending_ad_checkout');
          window.sessionStorage.removeItem('swaypalm_pending_ad_checkout');
        } catch {
          rawDraft = null;
        }
        const draft = rawDraft
          ? (JSON.parse(rawDraft) as {
              advertiserName?: string;
              title?: string;
              description?: string;
              targetRegion?: string;
              ctaLabel?: string;
              ctaUrl?: string;
              mediaDataUrl?: string;
              mediaTheme?: string;
              method?: PaymentMethod;
            })
          : null;

        const created = await createPaidAdvert({
          advertiserName: draft?.advertiserName || myBusiness?.name || 'Sponsored Advertiser',
          title: draft?.title || 'Sponsored Business Spotlight',
          description: draft?.description,
          targetRegion: draft?.targetRegion || 'Global',
          ctaLabel: draft?.ctaLabel,
          ctaUrl: draft?.ctaUrl,
          mediaDataUrl: draft?.mediaDataUrl,
          mediaTheme: draft?.mediaTheme,
          method: draft?.method || 'Stripe',
          reference: sessionId,
          stripeSessionId: sessionId,
        });
        if (created) {
          setActivePage('home');
        }
        return;
      }

      if (
        purpose === 'subscription' &&
        (planParam === 'basic' || planParam === 'pro' || planParam === 'premium')
      ) {
        await subscribeToPlan(planParam, 'Stripe', sessionId, {
          stripeSessionId: sessionId,
        });
        setActivePage('advertise');
        return;
      }

      if (purpose === 'marketplace') {
        const verifyRes = await safeFetchJson<{
          verified?: boolean;
          error?: string;
        }>(`/api/payments/card/verify-session/${encodeURIComponent(sessionId)}`);
        if (!verifyRes.ok || !verifyRes.data?.verified) {
          notifyToast(verifyRes.error || 'Could not confirm Stripe card payment.', 'error');
          return;
        }
        let rawPending: string | null = null;
        try {
          rawPending = window.sessionStorage.getItem('swaypalm_pending_stripe_cart');
          window.sessionStorage.removeItem('swaypalm_pending_stripe_cart');
        } catch {
          rawPending = null;
        }
        const pending = rawPending
          ? (JSON.parse(rawPending) as {
              buyerName?: string;
              buyerPhone?: string;
              shippingAddress?: string;
              paymentMethod?: PaymentMethod;
            })
          : null;
        if (pending?.buyerName && pending?.buyerPhone && pending?.shippingAddress) {
          await checkoutCart({
            buyerName: pending.buyerName,
            buyerPhone: pending.buyerPhone,
            shippingAddress: pending.shippingAddress,
            paymentMethod: pending.paymentMethod || 'Stripe',
          });
        } else {
          notifyToast('Stripe card payment confirmed!', 'success');
        }
      }
    })();
  }, [authReady, firebaseUser, myBusiness]);

  const value: SwayPalmContextValue = {
    firebaseUser,
    authReady,
    userUuid,
    userProfile,
    myBusiness,
    isAdmin,
    activePage,
    setActivePage,
    selectedBusinessId,
    openBusinessProfile,
    selectedProduct,
    setSelectedProduct,
    activeChatId,
    setActiveChatId,
    searchQuery,
    setSearchQuery,
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    pendingEmailTarget,
    emailCodeDelivery,
    emailCodePreview,
    emailCodeVerifiedInSession,
    sendEmailVerificationCode,
    verifyEmailCode,
    refreshFirebaseEmailStatus,
    pendingOtpCode,
    sendPhoneOtp,
    verifyPhoneOtp,
    businesses,
    posts,
    stories,
    viewedStoryIds,
    products,
    groups,
    follows,
    friendships,
    profileViews,
    orders,
    chats,
    adverts,
    playingAdverts,
    guestAdIds,
    payments,
    notifications,
    likedPostIds: localLikes,
    joinedGroupIds: localJoinedGroups,
    cart,
    showCartDrawer,
    setShowCartDrawer,
    toasts,
    notifyToast,
    networkStatus,
    networkError,
    isRetryingNetwork,
    retryNetworkConnection,
    dismissNetworkError,
    getBusinessById,
    getBusinessByUserId,
    getDisplayBusinessName,
    getDisplayOwnerName,
    signInWithGoogle,
    registerWithEmailForm,
    loginWithEmailForm,
    logout,
    createPost,
    updatePost,
    deletePost,
    createStory,
    markStoryViewed,
    deleteStory,
    toggleLikePost,
    loadPostComments,
    addPostComment,
    sharePost,
    toggleSavePost,
    toggleFollowBusiness,
    updateMyBusiness,
    loadBusinessReviews,
    submitBusinessReview,
    nowMs,
    toggleOnlineStatusVisibility,
    sendFriendRequest,
    respondFriendRequest,
    addProduct,
    deleteProduct,
    addToCart,
    updateCartQty,
    removeFromCart,
    checkoutCart,
    updateOrderStatus,
    startDirectChat,
    createGroupChat,
    subscribeToChatMessages,
    sendChatMessage,
    markChatRead,
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    callConnectionState,
    isMicMuted,
    isCameraEnabled,
    callElapsedSec,
    callMediaNotice,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCurrentCall,
    toggleMicMute,
    toggleCameraVideo,
    createGroup,
    toggleJoinGroup,
    loadGroupDetails,
    postInGroup,
    subscribeToPlan,
    createPaidAdvert,
    recordAdvertImpression,
    recordAdvertClick,
    createAdvertCampaign,
    markNotificationRead,
    markAllNotificationsRead,
    adminUsers,
    adminBusinesses,
    adminProducts,
    adminAdverts,
    adminPayments,
    adminOrders,
    migrationStatus,
    adminMigrateDatabaseToUuids,
    adminSetBusinessStatus,
    adminToggleVerifyBusiness,
    adminSetProductStatus,
    adminSetAdvertStatus,
    adminMarkOrderFeeSettled,
    adminSeedSampleCatalog,
    settingPrefs,
    updateSettingPrefs,
    updateAccountSettings,
    sendAccountPasswordReset,
  };

  return <SwayPalmContext.Provider value={value}>{children}</SwayPalmContext.Provider>;
};

export function useSwayPalm() {
  const ctx = useContext(SwayPalmContext);
  if (!ctx) throw new Error('useSwayPalm must be used within SwayPalmProvider');
  return ctx;
}
