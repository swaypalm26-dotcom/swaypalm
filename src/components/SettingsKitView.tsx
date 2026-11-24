import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LogOut,
  Mail,
  Mic,
  Phone,
  RefreshCw,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  User,
  Video,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { getWebsiteBaseUrl } from '../lib/urls';
import { BUSINESS_CATEGORIES, BusinessCategory } from '../types';
import { resizeSquareAvatarToDataUrl, SUBSCRIPTION_PLANS } from '../data/sampleCatalog';
import { BusinessAvatar, VerifiedBadge } from './BrandMark';
import { PlayStoreLaunchKitCard, PWAInstallButton } from './PWAInstallControls';
import { PublicQrCodeCard } from './PublicQrCodeCard';

type SettingsTab = 'account' | 'business' | 'calls' | 'data';

const BRAND_COLOR_SWATCHES = [
  { hex: '#0A4D2E', label: 'SwayPalm Green' },
  { hex: '#14532D', label: 'Forest' },
  { hex: '#854D0E', label: 'Trade Gold' },
  { hex: '#1E3A5F', label: 'Harbor Navy' },
  { hex: '#4C1D95', label: 'Royal Indigo' },
  { hex: '#7C2D12', label: 'Terracotta' },
];

const COVER_THEME_OPTIONS = [
  { id: 'hero_trade', label: 'Global B2B', gradient: 'from-[#0A4D2E] via-[#0D5E38] to-[#06311D]' },
  { id: 'hair_luxury', label: 'Beauty & Salon', gradient: 'from-[#2A1F1A] via-[#453126] to-[#1D1511]' },
  { id: 'diani_resort', label: 'Coastal Hospitality', gradient: 'from-[#09473D] via-[#0F6C5D] to-[#062E28]' },
  { id: 'fashion_atelier', label: 'Fashion Atelier', gradient: 'from-[#18221D] via-[#27382F] to-[#101714]' },
  { id: 'electronics_hub', label: 'Hardware & Tech', gradient: 'from-[#151D26] via-[#212E3C] to-[#0E141A]' },
  { id: 'coffee_export', label: 'Origin Agriculture', gradient: 'from-[#1B3322] via-[#294B33] to-[#112216]' },
  { id: 'tours_safari', label: 'Tours & Safari', gradient: 'from-[#2B351D] via-[#404F2B] to-[#1C2312]' },
  { id: 'services_logistics', label: 'Trade & Logistics', gradient: 'from-[#0B3B24] via-[#135636] to-[#072617]' },
];

export const SettingsKitView: React.FC = () => {
  const {
    firebaseUser,
    userUuid,
    userProfile,
    myBusiness,
    posts,
    products,
    orders,
    payments,
    notifications,
    settingPrefs,
    updateSettingPrefs,
    updateAccountSettings,
    sendAccountPasswordReset,
    updateMyBusiness,
    toggleOnlineStatusVisibility,
    markAllNotificationsRead,
    openBusinessProfile,
    setActivePage,
    setShowAuthModal,
    setAuthMode,
    sendEmailVerificationCode,
    logout,
    notifyToast,
  } = useSwayPalm();

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const myUserId = userProfile?.id || userUuid || '';

  // Account form state
  const [displayName, setDisplayName] = useState(userProfile?.displayName || firebaseUser?.displayName || '');
  const [email, setEmail] = useState(userProfile?.email || firebaseUser?.email || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [country, setCountry] = useState(userProfile?.country || myBusiness?.country || '');
  const [city, setCity] = useState(userProfile?.city || myBusiness?.city || '');
  const [businessType, setBusinessType] = useState(
    userProfile?.businessType || myBusiness?.category || 'Services'
  );
  const [savingAccount, setSavingAccount] = useState(false);

  // Business form state
  const [bizName, setBizName] = useState(myBusiness?.name || '');
  const [bizCategory, setBizCategory] = useState<BusinessCategory>(myBusiness?.category || 'Services');
  const [bizCountry, setBizCountry] = useState(myBusiness?.country || '');
  const [bizCity, setBizCity] = useState(myBusiness?.city || '');
  const [bizTagline, setBizTagline] = useState(myBusiness?.tagline || '');
  const [bizWhatsapp, setBizWhatsapp] = useState(myBusiness?.whatsapp || '');
  const [bizAbout, setBizAbout] = useState(myBusiness?.about || '');
  const [bizColor, setBizColor] = useState(myBusiness?.logoColor || '#0A4D2E');
  const [bizCover, setBizCover] = useState(myBusiness?.coverTheme || 'services_logistics');
  const [savingBiz, setSavingBiz] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Hardware & Call Diagnostics Kit state
  const [devices, setDevices] = useState<{
    mics: MediaDeviceInfo[];
    cams: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({ mics: [], cams: [], speakers: [] });
  const [testingMedia, setTestingMedia] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const testVideoRef = useRef<HTMLVideoElement | null>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayName(userProfile?.displayName || firebaseUser?.displayName || '');
    setEmail(userProfile?.email || firebaseUser?.email || '');
    setPhone(userProfile?.phone || '');
    setCountry(userProfile?.country || myBusiness?.country || '');
    setCity(userProfile?.city || myBusiness?.city || '');
    setBusinessType(userProfile?.businessType || myBusiness?.category || 'Services');
  }, [
    userProfile?.displayName,
    userProfile?.email,
    userProfile?.phone,
    userProfile?.country,
    userProfile?.city,
    userProfile?.businessType,
    firebaseUser?.displayName,
    firebaseUser?.email,
  ]);

  useEffect(() => {
    if (!myBusiness) return;
    setBizName(myBusiness.name);
    setBizCategory(myBusiness.category);
    setBizCountry(myBusiness.country);
    setBizCity(myBusiness.city);
    setBizTagline(myBusiness.tagline || '');
    setBizWhatsapp(myBusiness.whatsapp || '');
    setBizAbout(myBusiness.about || '');
    setBizColor(myBusiness.logoColor || '#0A4D2E');
    setBizCover(myBusiness.coverTheme || 'services_logistics');
  }, [myBusiness?.business_id, myBusiness?.updatedAt]);

  const stopMediaTest = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    if (testVideoRef.current) {
      testVideoRef.current.srcObject = null;
    }
    setTestingMedia(false);
    setMicLevel(0);
  };

  useEffect(() => {
    return () => {
      stopMediaTest();
    };
  }, []);

  const refreshDevices = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setDeviceError('Media device enumeration is not supported in this browser.');
      return;
    }
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        mics: list.filter((d) => d.kind === 'audioinput'),
        cams: list.filter((d) => d.kind === 'videoinput'),
        speakers: list.filter((d) => d.kind === 'audiooutput'),
      });
      setDeviceError(null);
    } catch {
      setDeviceError('Could not inspect browser media devices.');
    }
  };

  useEffect(() => {
    if (activeTab === 'calls') {
      void refreshDevices();
    } else {
      stopMediaTest();
    }
  }, [activeTab]);

  const startMediaTest = async () => {
    stopMediaTest();
    setDeviceError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setDeviceError('Camera and microphone testing are not available in this browser.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: 'user',
            width: { ideal: settingPrefs.preferHdVideo ? 1280 : 640 },
            height: { ideal: settingPrefs.preferHdVideo ? 720 : 360 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setDeviceError('Camera unavailable — testing microphone input only.');
      }

      testStreamRef.current = stream;
      setTestingMedia(true);
      await refreshDevices();

      if (testVideoRef.current && stream.getVideoTracks().length > 0) {
        testVideoRef.current.srcObject = stream;
      }

      if (stream.getAudioTracks().length > 0) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const tick = () => {
            if (!audioCtxRef.current) return;
            analyser.getByteTimeDomainData(dataArray);
            let peak = 0;
            for (let i = 0; i < dataArray.length; i += 1) {
              const amp = Math.abs(dataArray[i] - 128);
              if (amp > peak) peak = amp;
            }
            setMicLevel(Math.min(100, Math.round((peak / 64) * 100)));
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      }
    } catch {
      setDeviceError('Microphone and camera permissions were blocked or no hardware was found.');
      setTestingMedia(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    await updateAccountSettings({
      displayName,
      email,
      phone,
      country,
      city,
      businessType,
    });
    setSavingAccount(false);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myBusiness) return;
    setSavingBiz(true);
    await updateMyBusiness({
      name: bizName.trim(),
      category: bizCategory,
      country: bizCountry.trim(),
      city: bizCity.trim(),
      tagline: bizTagline.trim(),
      whatsapp: bizWhatsapp.trim(),
      about: bizAbout.trim(),
      logoColor: bizColor,
      coverTheme: bizCover,
    });
    setSavingBiz(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeSquareAvatarToDataUrl(file, 360);
      await updateMyBusiness({ logoDataUrl: dataUrl });
    } catch {
      notifyToast('Could not process profile picture.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const liveAppUrl = getWebsiteBaseUrl();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard?.writeText(liveAppUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard fallback
    }
  };

  const handleExportBusinessData = () => {
    if (!firebaseUser) return;
    const myProducts = products.filter(
      (p) => p.user_id === myUserId || p.auth_uid === firebaseUser.uid
    );
    const myPosts = posts.filter(
      (p) => p.user_id === myUserId || p.auth_uid === firebaseUser.uid
    );
    const myOrders = orders.filter(
      (o) =>
        o.buyer_id === myUserId ||
        o.seller_id === myUserId ||
        o.buyer_auth_uid === firebaseUser.uid ||
        o.seller_auth_uid === firebaseUser.uid
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      websiteUrl: liveAppUrl,
      account: userProfile,
      business: myBusiness,
      products: myProducts,
      posts: myPosts,
      orders: myOrders,
      payments,
      callAndWorkspacePreferences: settingPrefs,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `swaypalm-business-kit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notifyToast('Business data exported as JSON.', 'success');
  };

  const isGoogleAccount = Boolean(
    firebaseUser?.providerData.some((p) => p.providerId === 'google.com')
  );
  const currentPlanDef =
    SUBSCRIPTION_PLANS.find((p) => p.id === (myBusiness?.plan || userProfile?.plan || 'free')) ||
    SUBSCRIPTION_PLANS[0];
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const notificationPermission =
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0A4D2E]/10 text-[#0A4D2E] flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
              Settings Kit
            </h1>
            <p className="text-sm text-neutral-600 mt-0.5">
              Manage account security, business branding, call devices, privacy, and workspace data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'account' as SettingsTab, label: 'Account', icon: User },
            { id: 'business' as SettingsTab, label: 'Business Kit', icon: Store },
            { id: 'calls' as SettingsTab, label: 'Calls & Privacy', icon: Video },
            { id: 'data' as SettingsTab, label: 'Plans & Export', icon: CreditCard },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#0A4D2E] text-white'
                    : 'bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt for signed-out visitors on account / business / data tabs */}
      {!firebaseUser && activeTab !== 'calls' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
          <h2 className="font-display font-bold text-lg text-neutral-900">
            Sign in to configure your SwayPalm account
          </h2>
          <p className="text-sm text-neutral-600 mt-1.5 max-w-md mx-auto">
            Register free or sign in to customize your business profile, verification settings, privacy controls, and subscription data.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setShowAuthModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold hover:bg-[#083D24]"
            >
              Register Free
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: ACCOUNT & VERIFICATION */}
      {firebaseUser && activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form
            onSubmit={handleSaveAccount}
            className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-4"
          >
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="font-display font-bold text-base text-neutral-900">
                Personal & Account Details
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Signed in as <span className="font-medium text-neutral-800">{userProfile?.email || firebaseUser.email}</span>
              </p>
            </div>

            {myUserId && (
              <div className="p-3 rounded-lg bg-[#F3F5F4] border border-neutral-200 text-[11px] space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-neutral-600 font-medium">Permanent User UUID</span>
                  <code className="font-mono font-semibold text-[#0A4D2E]">{myUserId}</code>
                </div>
                {myBusiness?.business_id && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-neutral-600 font-medium">Permanent Business UUID</span>
                    <code className="font-mono font-semibold text-[#0A4D2E]">{myBusiness.business_id}</code>
                  </div>
                )}
                <p className="text-[10px] text-neutral-500 pt-0.5">
                  Editing your name, email, phone, or business name keeps these exact IDs so all posts, products, chats, followers, and orders stay linked.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Primary Business Sector
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#0A4D2E]"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingAccount}
                className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold disabled:opacity-60 whitespace-nowrap"
              >
                {savingAccount ? 'Saving…' : 'Save Account Details'}
              </button>
            </div>
          </form>

          {/* Security & Verification Column */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900">
                Verification & Security
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Keep your email, phone, and credentials verified.
              </p>
            </div>

            <div className="space-y-3 border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#0A4D2E]" />
                    Email Verification
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {firebaseUser.emailVerified && userProfile?.emailCodeVerified !== false
                      ? 'Verified and active'
                      : 'Code confirmation needed'}
                  </p>
                </div>
                {firebaseUser.emailVerified && userProfile?.emailCodeVerified !== false ? (
                  <span className="text-xs font-semibold text-[#0A4D2E] inline-flex items-center gap-1 whitespace-nowrap">
                    <ShieldCheck className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('email_otp');
                      setShowAuthModal(true);
                      void sendEmailVerificationCode(
                        firebaseUser.email || userProfile?.email,
                        userProfile?.displayName
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Verify
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0A4D2E]" />
                    Phone OTP
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                    {userProfile?.phoneVerified ? `Verified (${userProfile.phone || phone})` : 'Pending OTP verification'}
                  </p>
                </div>
                {userProfile?.phoneVerified ? (
                  <span className="text-xs font-semibold text-[#0A4D2E] inline-flex items-center gap-1 whitespace-nowrap">
                    <ShieldCheck className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('otp');
                      setShowAuthModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 whitespace-nowrap"
                  >
                    Verify Phone
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 space-y-2">
                <p className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#0A4D2E]" />
                  Sign-In Method
                </p>
                {isGoogleAccount ? (
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Protected by Google Sign-In. Manage your password directly in your Google Account.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void sendAccountPasswordReset()}
                    className="w-full py-2 px-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                  >
                    Send Password Reset Email
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full py-2 px-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out of SwayPalm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUSINESS PROFILE & BRANDING KIT */}
      {firebaseUser && activeTab === 'business' && myBusiness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Avatar & Cover Theme Studio */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900">
                Brand Identity Kit
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Customize how buyers see your business across feeds and profiles.
              </p>
            </div>

            <div className="flex items-center gap-3.5">
              <BusinessAvatar
                photoUrl={myBusiness.logoDataUrl}
                initials={myBusiness.logoInitials}
                color={bizColor}
                name={myBusiness.name}
                className="w-16 h-16 rounded-xl border border-neutral-200"
                textClassName="text-lg"
              />
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-sm text-neutral-900 truncate">
                    {myBusiness.name}
                  </span>
                  {myBusiness.verified && <VerifiedBadge plan={myBusiness.plan} className="w-4 h-4 shrink-0" />}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap">
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingAvatar ? 'Uploading…' : myBusiness.logoDataUrl ? 'Replace Photo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingAvatar}
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  {myBusiness.logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => void updateMyBusiness({ logoDataUrl: '' })}
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Badge Swatches */}
            <div className="pt-3 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-800 mb-2">
                Initials Badge Color
              </p>
              <div className="flex flex-wrap gap-2">
                {BRAND_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    title={sw.label}
                    aria-label={sw.label}
                    onClick={() => setBizColor(sw.hex)}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                      bizColor === sw.hex ? 'border-[#D4AF37] scale-105' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Cover Banner Selector */}
            <div className="pt-3 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-800 mb-2">
                Profile Cover Theme
              </p>
              <div className="grid grid-cols-2 gap-2">
                {COVER_THEME_OPTIONS.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setBizCover(theme.id)}
                    className={`text-left rounded-lg overflow-hidden border transition-all ${
                      bizCover === theme.id
                        ? 'border-[#0A4D2E] ring-2 ring-[#0A4D2E]/25'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className={`h-8 bg-gradient-to-r ${theme.gradient}`} />
                    <div className="px-2 py-1.5 bg-white text-[11px] font-semibold text-neutral-800 truncate">
                      {theme.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Public Business Directory Form */}
          <form
            onSubmit={handleSaveBusiness}
            className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-4"
          >
            <div className="border-b border-neutral-100 pb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-base text-neutral-900">
                  Public Storefront & Directory Info
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Visible on your public business profile and global search.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openBusinessProfile(myBusiness.business_id)}
                className="text-xs font-semibold text-[#0A4D2E] hover:underline whitespace-nowrap"
              >
                View Profile
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Category
                </label>
                <select
                  value={bizCategory}
                  onChange={(e) => setBizCategory(e.target.value as BusinessCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#0A4D2E]"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  required
                  value={bizCountry}
                  onChange={(e) => setBizCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={bizCity}
                  onChange={(e) => setBizCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  WhatsApp Business Number
                </label>
                <input
                  type="text"
                  value={bizWhatsapp}
                  onChange={(e) => setBizWhatsapp(e.target.value)}
                  placeholder="+254712345678"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={bizTagline}
                  onChange={(e) => setBizTagline(e.target.value)}
                  placeholder="Short one-line value proposition"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  About Business
                </label>
                <textarea
                  rows={4}
                  value={bizAbout}
                  onChange={(e) => setBizAbout(e.target.value)}
                  placeholder="Describe your products, MOQ, wholesale shipping, or service coverage..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:border-[#0A4D2E]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingBiz}
                className="px-5 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold disabled:opacity-60 whitespace-nowrap"
              >
                {savingBiz ? 'Saving…' : 'Save Branding & Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: PRIVACY, PRESENCE & CALL DEVICE KIT */}
      {activeTab === 'calls' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Privacy & Call Behavior Controls */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900">
                Presence & Call Preferences
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Control visibility to business partners and how audio/video calls launch.
              </p>
            </div>

            {/* Online Presence (Firestore persisted when signed in) */}
            <div className="border-t border-neutral-100 pt-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 inline-flex items-center gap-1.5">
                  {myBusiness?.showOnlineStatus === false ? (
                    <EyeOff className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-[#0A4D2E]" />
                  )}
                  Show Online & Last Seen Status
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {firebaseUser
                    ? myBusiness?.showOnlineStatus === false
                      ? 'Currently hidden — partners see "Presence hidden".'
                      : 'Partners can see when your business is online or recently active.'
                    : 'Sign in to manage your public online presence.'}
                </p>
              </div>
              <button
                type="button"
                disabled={!firebaseUser || !myBusiness}
                onClick={() => void toggleOnlineStatusVisibility()}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50 ${
                  myBusiness?.showOnlineStatus === false
                    ? 'border border-neutral-300 text-neutral-800 hover:bg-neutral-50'
                    : 'bg-[#0A4D2E] text-white hover:bg-[#083D24]'
                }`}
              >
                {myBusiness?.showOnlineStatus === false ? 'Enable' : 'Visible'}
              </button>
            </div>

            {/* Call Toggles */}
            <div className="space-y-4 border-t border-neutral-100 pt-4">
              {[
                {
                  key: 'ringtoneEnabled' as const,
                  title: 'Incoming Call Ringtone',
                  desc: 'Play a subtle chime when a SwayPalm partner calls you.',
                  value: settingPrefs.ringtoneEnabled,
                },
                {
                  key: 'startCallsMuted' as const,
                  title: 'Join Calls with Microphone Muted',
                  desc: 'Automatically mute your mic when placing or answering calls.',
                  value: settingPrefs.startCallsMuted,
                },
                {
                  key: 'preferHdVideo' as const,
                  title: 'HD Video Quality (720p)',
                  desc: 'Turn off for data-saver 360p video over mobile connections.',
                  value: settingPrefs.preferHdVideo,
                },
                {
                  key: 'desktopCallAlerts' as const,
                  title: 'Desktop Call Alerts',
                  desc:
                    notificationPermission === 'denied'
                      ? 'Browser notification permission is blocked in your browser settings.'
                      : `Browser permission: ${notificationPermission}. Show desktop alerts when a call arrives in the background.`,
                  value: settingPrefs.desktopCallAlerts,
                },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">{pref.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{pref.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pref.value}
                    onClick={() => updateSettingPrefs({ [pref.key]: !pref.value })}
                    className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 ${
                      pref.value ? 'bg-[#0A4D2E]' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        pref.value ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Audio & Video Hardware Diagnostics Kit */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-base text-neutral-900">
                  Audio & Video Hardware Check
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verify your camera and microphone before joining business calls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshDevices()}
                aria-label="Refresh media devices"
                className="p-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {deviceError && (
              <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {deviceError}
              </div>
            )}

            {/* Video Test Stage */}
            <div className="rounded-xl overflow-hidden bg-[#0D1410] aspect-video relative flex items-center justify-center">
              <video
                ref={testVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover scale-x-[-1] ${
                  testingMedia ? 'block' : 'hidden'
                }`}
              />
              {!testingMedia && (
                <div className="text-center px-4 text-neutral-300">
                  <Video className="w-8 h-8 mx-auto mb-2 text-[#D4AF37]" />
                  <p className="text-xs font-semibold">Camera & Mic Preview Idle</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Click &ldquo;Test Camera &amp; Mic&rdquo; to verify your video feed and audio level.
                  </p>
                </div>
              )}
            </div>

            {/* Live Mic Level Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-neutral-700 inline-flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#0A4D2E]" />
                  Microphone Input Level
                </span>
                <span className="font-mono text-neutral-500 tabular-nums">{micLevel}%</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full bg-[#0A4D2E] transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {testingMedia ? (
                <button
                  type="button"
                  onClick={stopMediaTest}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Stop Device Test
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startMediaTest()}
                  className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold whitespace-nowrap"
                >
                  Test Camera & Mic
                </button>
              )}
            </div>

            {/* Detected Browser Devices */}
            <div className="pt-3 border-t border-neutral-100 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-neutral-500">Microphones</p>
                <p className="font-mono font-bold text-neutral-900 tabular-nums mt-0.5">
                  {devices.mics.length}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Cameras</p>
                <p className="font-mono font-bold text-neutral-900 tabular-nums mt-0.5">
                  {devices.cams.length}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Speakers</p>
                <p className="font-mono font-bold text-neutral-900 tabular-nums mt-0.5">
                  {devices.speakers.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLANS, NOTIFICATIONS & DATA EXPORT */}
      {firebaseUser && activeTab === 'data' && (
        <div className="space-y-5">
          <PublicQrCodeCard />
          <PWAInstallButton variant="card" />
          <PlayStoreLaunchKitCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Subscription & Storefront URL */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900">
                Plan & Storefront Link
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Registration on SwayPalm is always free; upgrade only to advertise and boost listings.
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Active Plan</span>
                <span className="font-display font-bold text-sm text-[#0A4D2E]">
                  {currentPlanDef.name} (${currentPlanDef.price}/{currentPlanDef.cadence})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Product Allowance</span>
                <span className="text-xs font-semibold text-neutral-900">
                  {currentPlanDef.productLimitLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Completed Payments</span>
                <span className="font-mono text-xs font-semibold text-neutral-900 tabular-nums">
                  {payments.length}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs min-w-0">
                <Globe className="w-3.5 h-3.5 text-[#0A4D2E] shrink-0" />
                <a
                  href={liveAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold text-[#0A4D2E] hover:underline truncate"
                >
                  {liveAppUrl}
                </a>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#0A4D2E]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'Copied' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage('advertise')}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#111915] text-xs font-bold hover:bg-[#c5a12f] whitespace-nowrap"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>

          {/* Notifications & JSON Export */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900">
                Notifications & Business Data Export
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Clear unread alerts or download a full JSON archive of your SwayPalm business activity.
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900 inline-flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-[#0A4D2E]" />
                  Unread Notifications
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
                  {unreadNotifCount} unread alert{unreadNotifCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unreadNotifCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllNotificationsRead()}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 whitespace-nowrap"
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActivePage('notifications')}
                  className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold whitespace-nowrap"
                >
                  Open Alerts
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  Export Business Archive
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Includes profile, storefront catalog, posts, orders, and preferences (.json).
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportBusinessData}
                className="px-3.5 py-2 rounded-lg border border-[#0A4D2E] text-[#0A4D2E] hover:bg-[#0A4D2E] hover:text-white transition-colors text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};
