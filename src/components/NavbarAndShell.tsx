import React, { useState } from 'react';
import {
  Bell,
  Bookmark,
  Compass,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  QrCode,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  User,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { getBusinessPresence } from '../data/sampleCatalog';
import { AppPage } from '../types';
import { BrandMark, BusinessAvatar, VerifiedBadge } from './BrandMark';
import { PWAInstallButton } from './PWAInstallControls';
import { ShareQrModal } from './PublicQrCodeCard';

export const NavbarAndShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    firebaseUser,
    userUuid,
    userProfile,
    myBusiness,
    isAdmin,
    activePage,
    setActivePage,
    openBusinessProfile,
    setSelectedProduct,
    searchQuery,
    setSearchQuery,
    setShowAuthModal,
    setAuthMode,
    sendEmailVerificationCode,
    logout,
    businesses,
    products,
    follows,
    friendships,
    nowMs,
    toggleOnlineStatusVisibility,
    toggleFollowBusiness,
    startDirectChat,
    chats,
    notifications,
    cart,
    setShowCartDrawer,
    getBusinessById,
    getDisplayBusinessName,
  } = useSwayPalm();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShareQr, setShowShareQr] = useState(false);
  const [dismissEmailBanner, setDismissEmailBanner] = useState(false);
  const [presenceView, setPresenceView] = useState<'online' | 'recent'>('online');

  const myUserId = userProfile?.id || userUuid;
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadChats = myUserId
    ? chats.filter((c) => c.unread_by?.includes(myUserId)).length
    : 0;
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const suggestedBusinesses = businesses
    .filter(
      (b) =>
        b.business_id !== myBusiness?.business_id &&
        !follows.some((f) => f.business_id === b.business_id)
    )
    .slice(0, 4);

  const trendingProducts = products.slice(0, 3);

  const acceptedFriendUserIds = new Set(
    friendships
      .filter((f) => f.status === 'accepted')
      .flatMap((f) => f.participant_user_ids)
      .filter((uid) => uid !== myUserId)
  );

  const partnerDirectory = businesses
    .filter((b) => b.business_id !== myBusiness?.business_id)
    .map((b) => ({
      business: b,
      isFriend: acceptedFriendUserIds.has(b.user_id),
      presence: getBusinessPresence(b, nowMs),
    }));

  const onlinePartnersCount = partnerDirectory.filter((item) => item.presence.isOnline).length;

  const sidebarFriends = partnerDirectory
    .filter((item) => (presenceView === 'online' ? item.presence.isOnline : !item.presence.isOnline))
    .sort((a, b) => {
      if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
      return b.presence.lastSeenMs - a.presence.lastSeenMs;
    })
    .slice(0, 5);

  const navigate = (page: AppPage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  const showRightSidebar = ['home', 'friends', 'groups', 'saved'].includes(activePage);
  const showSidebars = !['chat'].includes(activePage);

  return (
    <div className="min-h-screen bg-[#F3F5F4] text-[#111915] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white border-b border-neutral-200 px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
        {/* Zone 1: Brand + Search */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-2 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A4D2E] rounded-lg"
          >
            <BrandMark className="w-8 h-8 shrink-0" />
            <span className="font-display font-bold text-lg tracking-tight text-[#0A4D2E]">
              SwayPalm
            </span>
          </button>

          <div className="hidden sm:flex items-center relative w-56 lg:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activePage === 'home' && e.target.value.trim().length > 0) {
                  setActivePage('explore');
                }
              }}
              placeholder="Search businesses, products..."
              aria-label="Search SwayPalm"
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#F3F5F4] border border-transparent focus:border-[#0A4D2E] focus:bg-white rounded-lg focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Zone 2: Primary Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
          {[
            { id: 'home' as AppPage, label: 'Home', icon: Home },
            { id: 'explore' as AppPage, label: 'Explore', icon: Compass },
            { id: 'marketplace' as AppPage, label: 'Marketplace', icon: Store },
            { id: 'advertise' as AppPage, label: 'Advertise', icon: Megaphone },
            { id: 'chat' as AppPage, label: 'Chat', icon: MessageSquare, badge: unreadChats },
            { id: 'notifications' as AppPage, label: 'Notifications', icon: Bell, badge: unreadNotifs },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`relative px-2.5 lg:px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#0A4D2E] bg-[#0A4D2E]/8 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] leading-none font-mono font-semibold bg-[#D4AF37] text-[#111915] rounded-full tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Share QR, Install, Alerts (mobile), Cart & Profile / Auth CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowShareQr(true)}
            title="Public Link & QR Code"
            aria-label="Open Public Link & QR Code"
            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <QrCode className="w-4 h-4 text-[#0A4D2E]" />
            <span className="hidden sm:inline">Share / QR</span>
          </button>
          <PWAInstallButton variant="header" />
          <button
            type="button"
            onClick={() => navigate('notifications')}
            aria-label="Open notifications"
            className={`md:hidden relative p-2 rounded-lg transition-colors ${
              activePage === 'notifications'
                ? 'bg-[#0A4D2E]/10 text-[#0A4D2E]'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4AF37] text-[#111915] text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
                {unreadNotifs}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            aria-label="Open shopping cart"
            className="relative p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0A4D2E] text-white text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            )}
          </button>

          {firebaseUser ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (myBusiness) openBusinessProfile(myBusiness.business_id);
                  else navigate('dashboard');
                }}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
              >
                <BusinessAvatar
                  photoUrl={myBusiness?.logoDataUrl}
                  initials={myBusiness?.logoInitials || 'SP'}
                  color={myBusiness?.logoColor || '#0A4D2E'}
                  name={myBusiness?.name || userProfile?.displayName || 'My Business'}
                  className="w-7 h-7 rounded-md"
                  textClassName="text-xs"
                />
                <span className="hidden sm:inline text-xs font-semibold text-neutral-900 max-w-[110px] truncate">
                  {myBusiness?.name || userProfile?.displayName || 'My Business'}
                </span>
                {myBusiness?.verified && <VerifiedBadge plan={myBusiness.plan} className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => navigate('settings')}
                title="Settings Kit"
                aria-label="Settings Kit"
                className={`hidden sm:inline-flex p-2 rounded-lg transition-colors ${
                  activePage === 'settings'
                    ? 'bg-[#0A4D2E]/10 text-[#0A4D2E]'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                aria-label="Sign Out"
                className="hidden sm:inline-flex p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 whitespace-nowrap shrink-0 transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setShowAuthModal(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                Join Free
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="md:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20 md:pb-8 flex gap-6 items-start">
        {/* Left Sidebar (Desktop) */}
        {showSidebars && (
          <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 sticky top-22 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-2 space-y-0.5">
              {[
                {
                  id: 'profile' as AppPage,
                  label: 'My Profile',
                  icon: User,
                  onClick: () =>
                    myBusiness
                      ? openBusinessProfile(myBusiness.business_id)
                      : (setAuthMode('register'), setShowAuthModal(true)),
                },
                { id: 'friends' as AppPage, label: 'Friends', icon: Users },
                { id: 'groups' as AppPage, label: 'Groups', icon: UsersRound },
                { id: 'marketplace' as AppPage, label: 'Marketplace', icon: Store },
                { id: 'saved' as AppPage, label: 'Saved', icon: Bookmark },
                { id: 'dashboard' as AppPage, label: 'Dashboard', icon: LayoutDashboard },
                { id: 'advertise' as AppPage, label: 'Post Ad ($12) & Plans', icon: Megaphone },
                { id: 'settings' as AppPage, label: 'Settings Kit', icon: Settings },
                { id: 'admin' as AppPage, label: 'Admin Panel', icon: Shield },
              ].map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => (item.onClick ? item.onClick() : navigate(item.id))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      active
                        ? 'bg-[#0A4D2E] text-white'
                        : 'text-neutral-700 hover:bg-[#F3F5F4] hover:text-neutral-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <PWAInstallButton variant="sidebar" />

            {isAdmin && (
              <div className="bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-600">
                Signed in as Platform Admin
              </div>
            )}
          </aside>
        )}

        {/* Center Content Viewport */}
        <main className="flex-1 min-w-0">
          {firebaseUser &&
            userProfile &&
            userProfile.emailCodeVerified === false &&
            !dismissEmailBanner && (
              <div className="mb-4 bg-white border border-[#D4AF37]/60 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0A4D2E]/10 text-[#0A4D2E] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-neutral-900">
                      Confirm your email verification code
                    </p>
                    <p className="text-xs text-neutral-600 truncate">
                      Verify {firebaseUser.email || userProfile.email} with your 6-digit code to secure your business account.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('email_otp');
                      setShowAuthModal(true);
                      void sendEmailVerificationCode(
                        firebaseUser.email || userProfile.email,
                        userProfile.displayName
                      );
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold transition-colors"
                  >
                    Verify Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissEmailBanner(true)}
                    aria-label="Dismiss email verification reminder"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          {children}
        </main>

        {/* Right Sidebar (Desktop XL) */}
        {showSidebars && showRightSidebar && (
          <aside className="hidden xl:flex flex-col w-72 shrink-0 sticky top-22 gap-4">
            {/* Suggested Businesses */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-sm text-neutral-900">
                  Suggested Businesses
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('explore')}
                  className="text-xs font-semibold text-[#0A4D2E] hover:underline"
                >
                  See all
                </button>
              </div>
              <div className="space-y-3">
                {suggestedBusinesses.map((biz) => (
                  <div key={biz.business_id} className="flex items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => openBusinessProfile(biz.business_id)}
                      className="flex items-center gap-2.5 min-w-0 text-left group"
                    >
                      <BusinessAvatar
                        photoUrl={biz.logoDataUrl}
                        initials={biz.logoInitials}
                        color={biz.logoColor}
                        name={biz.name}
                        className="w-9 h-9 rounded-lg"
                        textClassName="text-xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-neutral-900 truncate group-hover:text-[#0A4D2E]">
                            {biz.name}
                          </span>
                          {biz.verified && <VerifiedBadge plan={biz.plan} className="w-3.5 h-3.5" />}
                        </div>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {biz.city}, {biz.country}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFollowBusiness(biz)}
                      className="px-2.5 py-1 rounded-md border border-[#0A4D2E]/30 text-[#0A4D2E] text-xs font-semibold hover:bg-[#0A4D2E] hover:text-white transition-colors shrink-0"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Products */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-sm text-neutral-900">
                  Trending Products
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('marketplace')}
                  className="text-xs font-semibold text-[#0A4D2E] hover:underline"
                >
                  Shop
                </button>
              </div>
              <div className="space-y-3">
                {trendingProducts.map((prod) => {
                  const sellerBiz = getBusinessById(prod.business_id);
                  return (
                    <button
                      key={prod.product_id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(prod);
                        navigate('marketplace');
                      }}
                      className="w-full flex items-center justify-between gap-3 text-left p-2 -mx-2 rounded-lg hover:bg-[#F3F5F4] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 line-clamp-1">
                          {prod.title}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {sellerBiz?.name || getDisplayBusinessName(prod.business_id, prod.user_id)} ·{' '}
                          {sellerBiz?.country || 'Global'}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#0A4D2E] tabular-nums shrink-0">
                        ${prod.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Online Friends & Last Seen */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display font-bold text-sm text-neutral-900 tabular-nums">
                  Online Friends ({onlinePartnersCount})
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('friends')}
                  className="text-xs font-semibold text-[#0A4D2E] hover:underline whitespace-nowrap shrink-0"
                >
                  All
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#F3F5F4] rounded-lg mb-3">
                <button
                  type="button"
                  onClick={() => setPresenceView('online')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                    presenceView === 'online'
                      ? 'bg-white text-[#0A4D2E] shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Online Now
                </button>
                <button
                  type="button"
                  onClick={() => setPresenceView('recent')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                    presenceView === 'recent'
                      ? 'bg-white text-[#0A4D2E] shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Last Seen
                </button>
              </div>

              <div className="space-y-2.5">
                {sidebarFriends.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-2">
                    No contacts in this list right now.
                  </p>
                ) : (
                  sidebarFriends.map(({ business: partner, isFriend, presence }) => (
                    <div
                      key={partner.business_id}
                      className="flex items-center justify-between gap-2 p-1.5 -mx-1.5 rounded-lg hover:bg-[#F3F5F4] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => openBusinessProfile(partner.business_id)}
                        className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                      >
                        <BusinessAvatar
                          photoUrl={partner.logoDataUrl}
                          initials={partner.logoInitials}
                          color={partner.logoColor}
                          name={partner.name}
                          className="w-8 h-8 rounded-full"
                          textClassName="text-[11px]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 truncate">
                            {partner.name}
                          </p>
                          <p
                            className={`text-[11px] truncate ${
                              presence.isOnline ? 'text-[#0A4D2E] font-medium' : 'text-neutral-500'
                            }`}
                          >
                            {isFriend ? 'Friend · ' : ''}
                            {presence.label}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => startDirectChat(partner)}
                        className="text-[11px] font-semibold text-[#0A4D2E] hover:underline shrink-0 whitespace-nowrap"
                      >
                        Chat
                      </button>
                    </div>
                  ))
                )}
              </div>

              {firebaseUser && myBusiness && (
                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-neutral-500">
                    My status:{' '}
                    <span className="font-semibold text-neutral-800">
                      {myBusiness.showOnlineStatus === false ? 'Hidden' : 'Online'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleOnlineStatusVisibility()}
                    className="font-semibold text-[#0A4D2E] hover:underline whitespace-nowrap shrink-0"
                  >
                    {myBusiness.showOnlineStatus === false ? 'Show status' : 'Hide status'}
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (< 56px height) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white border-t border-neutral-200 grid grid-cols-5">
        {[
          { id: 'home' as AppPage, label: 'Home', icon: Home },
          { id: 'explore' as AppPage, label: 'Explore', icon: Compass },
          { id: 'marketplace' as AppPage, label: 'Shop', icon: Store },
          { id: 'advertise' as AppPage, label: 'Advertise', icon: Megaphone },
          { id: 'chat' as AppPage, label: 'Chat', icon: MessageSquare, badge: unreadChats },
        ].map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? 'text-[#0A4D2E] font-semibold' : 'text-neutral-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1.5 right-4 min-w-[14px] h-[14px] px-1 rounded-full bg-[#D4AF37] text-[#111915] text-[9px] font-mono font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden flex">
          <div className="w-72 bg-white h-full p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <BrandMark className="w-7 h-7" />
                  <span className="font-display font-bold text-base text-[#0A4D2E]">
                    SwayPalm
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate('explore');
                  }}
                  placeholder="Search businesses..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#F3F5F4] rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                {[
                  {
                    id: 'profile' as AppPage,
                    label: 'My Business Profile',
                    icon: User,
                    onClick: () => {
                      if (myBusiness) openBusinessProfile(myBusiness.business_id);
                      else {
                        setMobileMenuOpen(false);
                        setShowAuthModal(true);
                      }
                    },
                  },
                  { id: 'friends' as AppPage, label: 'Friends & Network', icon: Users },
                  { id: 'groups' as AppPage, label: 'Business Groups', icon: UsersRound },
                  { id: 'saved' as AppPage, label: 'Saved Posts', icon: Bookmark },
                  { id: 'dashboard' as AppPage, label: 'Owner Dashboard', icon: LayoutDashboard },
                  { id: 'advertise' as AppPage, label: 'Post Ad ($12) & Plans', icon: Megaphone },
                  { id: 'settings' as AppPage, label: 'Settings Kit', icon: Settings },
                  { id: 'admin' as AppPage, label: 'Admin Panel', icon: Shield },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => (item.onClick ? item.onClick() : navigate(item.id))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-800 hover:bg-[#F3F5F4] text-left"
                    >
                      <Icon className="w-4 h-4 text-[#0A4D2E]" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <PWAInstallButton variant="sidebar" />
              </div>
            </div>

            {firebaseUser ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void logout();
                }}
                className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthMode('register');
                  setShowAuthModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#0A4D2E] text-white text-sm font-semibold"
              >
                Register Free
              </button>
            )}
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <ShareQrModal open={showShareQr} onClose={() => setShowShareQr(false)} />
    </div>
  );
};
