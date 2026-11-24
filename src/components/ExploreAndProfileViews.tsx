import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Edit3,
  ExternalLink,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { BUSINESS_CATEGORIES, BusinessCategory, BusinessReview } from '../types';
import { BusinessAvatar, VerifiedBadge } from './BrandMark';
import { MediaArtwork } from './MediaArtwork';
import {
  formatTimeAgo,
  getBusinessPresence,
  resizeSquareAvatarToDataUrl,
} from '../data/sampleCatalog';

export const ExploreBusinessesView: React.FC = () => {
  const {
    businesses,
    follows,
    myBusiness,
    nowMs,
    searchQuery,
    setSearchQuery,
    openBusinessProfile,
    toggleFollowBusiness,
    startDirectChat,
  } = useSwayPalm();

  const [selectedCategory, setSelectedCategory] = useState<'All' | BusinessCategory>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'verified' | 'premium'>('all');
  const [onlineOnly, setOnlineOnly] = useState(false);

  const countries = useMemo(
    () => ['All', ...Array.from(new Set(businesses.map((b) => b.country))).sort()],
    [businesses]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cityQ = selectedCity.trim().toLowerCase();
    return businesses
      .filter((b) => {
        if (selectedCategory !== 'All' && b.category !== selectedCategory) return false;
        if (selectedCountry !== 'All' && b.country !== selectedCountry) return false;
        if (cityQ && !b.city.toLowerCase().includes(cityQ)) return false;
        if (tierFilter === 'free' && b.plan !== 'free') return false;
        if (tierFilter === 'verified' && !b.verified) return false;
        if (tierFilter === 'premium' && b.plan !== 'premium') return false;
        if (onlineOnly && !getBusinessPresence(b, nowMs).isOnline) return false;
        if (
          q &&
          !b.name.toLowerCase().includes(q) &&
          !b.category.toLowerCase().includes(q) &&
          !b.country.toLowerCase().includes(q) &&
          !b.city.toLowerCase().includes(q) &&
          !(b.tagline || '').toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const rank = (p: string) => (p === 'premium' ? 3 : p === 'pro' ? 2 : p === 'basic' ? 1 : 0);
        return rank(b.plan) - rank(a.plan);
      });
  }, [businesses, searchQuery, selectedCategory, selectedCountry, selectedCity, tierFilter, onlineOnly, nowMs]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
        <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
          Explore Global Businesses
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Discover verified suppliers, hospitality brands, exporters, and service firms across 6+ countries.
        </p>

        {/* Search & Filter Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keyword, product, or company..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
            />
          </div>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            aria-label="Filter by Country"
            className="px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Countries' : c}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            placeholder="Filter by City (e.g. Nairobi, Dubai)"
            className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
          />

          <div className="flex items-center gap-1 p-1 bg-[#F3F5F4] rounded-lg">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'free', label: 'Free' },
                { id: 'verified', label: 'Verified' },
                { id: 'premium', label: 'Premium' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierFilter(t.id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  tierFilter === t.id
                    ? 'bg-white text-[#0A4D2E] shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Tabs & Online Filter */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setOnlineOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border ${
              onlineOnly
                ? 'bg-[#0A4D2E] text-white border-[#0A4D2E]'
                : 'bg-white text-[#0A4D2E] border-[#0A4D2E]/30 hover:bg-[#0A4D2E]/8'
            }`}
          >
            {onlineOnly ? 'Online Only ✓' : 'Online Now'}
          </button>
          {(['All', ...BUSINESS_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#0A4D2E] text-white'
                  : 'bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center">
          <p className="font-display font-semibold text-neutral-900">
            No businesses match your current filters
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            Try clearing the city or keyword filter to see all global businesses.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedCountry('All');
              setSelectedCity('');
              setTierFilter('all');
              setOnlineOnly(false);
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((biz) => {
            const isFollowing = follows.some((f) => f.business_id === biz.business_id);
            const isMine = biz.business_id === myBusiness?.business_id;

            return (
              <div
                key={biz.business_id}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => openBusinessProfile(biz.business_id)}
                    className="w-full text-left block"
                  >
                    <MediaArtwork
                      theme={biz.coverTheme}
                      aspectClass="aspect-[16/9]"
                    />
                  </button>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <BusinessAvatar
                        photoUrl={biz.logoDataUrl}
                        initials={biz.logoInitials}
                        color={biz.logoColor}
                        name={biz.name}
                        className="w-11 h-11 rounded-lg"
                        textClassName="text-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openBusinessProfile(biz.business_id)}
                          className="flex items-center gap-1.5 text-left group"
                        >
                          <h3 className="font-display font-bold text-sm text-neutral-900 truncate group-hover:text-[#0A4D2E]">
                            {biz.name}
                          </h3>
                          {biz.verified && <VerifiedBadge plan={biz.plan} className="w-4 h-4" />}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                          <span>{biz.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">
                            {biz.city}, {biz.country}
                          </span>
                        </div>
                        {(() => {
                          const presence = getBusinessPresence(biz, nowMs);
                          return (
                            <p
                              className={`text-[11px] mt-0.5 ${
                                presence.isOnline
                                  ? 'text-[#0A4D2E] font-semibold'
                                  : 'text-neutral-500'
                              }`}
                            >
                              {presence.label}
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 mt-3 line-clamp-2 leading-relaxed">
                      {biz.tagline || biz.about}
                    </p>

                    <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold text-neutral-900">
                        <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                        {biz.rating.toFixed(1)}
                        <span className="text-neutral-500 font-normal">({biz.reviewCount})</span>
                      </span>
                      <span>{biz.followersCount.toLocaleString()} followers</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openBusinessProfile(biz.business_id)}
                    className="flex-1 py-2 px-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
                  >
                    View Profile
                  </button>
                  {!isMine && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleFollowBusiness(biz)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                          isFollowing
                            ? 'bg-[#F3F5F4] text-neutral-700'
                            : 'bg-[#0A4D2E] text-white hover:bg-[#083D24]'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startDirectChat(biz)}
                        aria-label={`Message ${biz.name}`}
                        className="p-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const BusinessProfileView: React.FC = () => {
  const {
    businesses,
    myBusiness,
    selectedBusinessId,
    nowMs,
    setActivePage,
    posts,
    products,
    follows,
    friendships,
    toggleFollowBusiness,
    startDirectChat,
    startCall,
    sendFriendRequest,
    setSelectedProduct,
    addToCart,
    loadBusinessReviews,
    submitBusinessReview,
    updateMyBusiness,
    notifyToast,
    getBusinessByUserId,
    getDisplayOwnerName,
  } = useSwayPalm();

  const business =
    businesses.find((b) => b.business_id === selectedBusinessId) || myBusiness || businesses[0];
  const profilePresence = getBusinessPresence(business, nowMs);

  const [tab, setTab] = useState<'posts' | 'products' | 'reviews' | 'about'>('posts');
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const [editName, setEditName] = useState(business?.name || '');
  const [editTagline, setEditTagline] = useState(business?.tagline || '');
  const [editAbout, setEditAbout] = useState(business?.about || '');
  const [editWhatsapp, setEditWhatsapp] = useState(business?.whatsapp || '');
  const [editCity, setEditCity] = useState(business?.city || '');
  const [editLogoDataUrl, setEditLogoDataUrl] = useState(business?.logoDataUrl || '');

  useEffect(() => {
    if (!business) return;
    setEditName(business.name);
    setEditTagline(business.tagline || '');
    setEditAbout(business.about || '');
    setEditWhatsapp(business.whatsapp || '');
    setEditCity(business.city);
    setEditLogoDataUrl(business.logoDataUrl || '');
    void loadBusinessReviews(business.business_id).then(setReviews);
  }, [business?.business_id, business?.logoDataUrl]);

  if (!business) return null;

  const isMine = myBusiness?.business_id === business.business_id;
  const isFollowing = follows.some((f) => f.business_id === business.business_id);
  const existingFriend = friendships.find((f) =>
    f.participant_user_ids.includes(business.user_id)
  );
  const bizPosts = posts.filter((p) => p.business_id === business.business_id);
  const bizProducts = products.filter((p) => p.business_id === business.business_id);

  const whatsappDigits = business.whatsapp?.replace(/[^\d]/g, '') || '';
  const whatsappUrl = whatsappDigits.length >= 7 ? `https://wa.me/${whatsappDigits}` : null;

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    saveImmediately: boolean
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeSquareAvatarToDataUrl(file, 360);
      setEditLogoDataUrl(dataUrl);
      if (saveImmediately) {
        await updateMyBusiness({ logoDataUrl: dataUrl });
      }
    } catch {
      notifyToast('Could not process profile picture file.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveAvatar = async (saveImmediately: boolean) => {
    setEditLogoDataUrl('');
    if (saveImmediately) {
      await updateMyBusiness({ logoDataUrl: '' });
      setShowPhotoModal(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMyBusiness({
      name: editName,
      tagline: editTagline,
      about: editAbout,
      whatsapp: editWhatsapp,
      city: editCity,
      logoDataUrl: editLogoDataUrl,
    });
    setEditing(false);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    await submitBusinessReview(business, ratingInput, reviewComment);
    setReviewComment('');
    const updated = await loadBusinessReviews(business.business_id);
    setReviews(updated);
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setActivePage('explore')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Explore Businesses
      </button>

      {/* Cover & Identity Header */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <MediaArtwork
          theme={business.coverTheme}
          title={business.name}
          subtitle={`${business.city}, ${business.country} · ${business.category}`}
          aspectClass="aspect-[21/7] min-h-[160px]"
        />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative -mt-10 z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (business.logoDataUrl) setShowPhotoModal(true);
                  }}
                  aria-label={business.logoDataUrl ? 'View profile picture' : business.name}
                  className={`block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A4D2E] ${
                    business.logoDataUrl ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <BusinessAvatar
                    photoUrl={business.logoDataUrl}
                    initials={business.logoInitials}
                    color={business.logoColor}
                    name={business.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-white shadow-sm"
                    textClassName="text-xl sm:text-2xl"
                  />
                </button>

                {isMine && (
                  <label
                    title={uploadingPhoto ? 'Uploading photo...' : 'Upload profile picture'}
                    className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[#0A4D2E] hover:bg-[#083D24] text-white border-2 border-white shadow-sm flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      onChange={(e) => void handleAvatarUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-extrabold text-xl sm:text-2xl text-neutral-900">
                    {business.name}
                  </h1>
                  {business.verified && (
                    <VerifiedBadge plan={business.plan} className="w-5 h-5" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 mt-1">
                  <span className="font-medium text-[#0A4D2E]">{business.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {business.city}, {business.country}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-neutral-900 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                    {business.rating.toFixed(1)} ({business.reviewCount} reviews)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Users className="w-3.5 h-3.5" />
                    {business.followersCount.toLocaleString()} followers
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      profilePresence.isOnline
                        ? 'font-semibold text-[#0A4D2E]'
                        : 'text-neutral-500'
                    }
                  >
                    {profilePresence.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {isMine ? (
                <button
                  type="button"
                  onClick={() => setEditing(!editing)}
                  className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Business Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleFollowBusiness(business)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isFollowing
                        ? 'bg-[#F3F5F4] text-neutral-800 hover:bg-neutral-200'
                        : 'bg-[#0A4D2E] text-white hover:bg-[#083D24]'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>

                  <button
                    type="button"
                    onClick={() => startDirectChat(business)}
                    className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </button>

                  <button
                    type="button"
                    onClick={() => void startCall(business, 'audio')}
                    className="px-3.5 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#0A4D2E]" />
                    Audio Call
                  </button>

                  <button
                    type="button"
                    onClick={() => void startCall(business, 'video')}
                    className="px-3.5 py-2 rounded-lg bg-[#0A4D2E]/10 border border-[#0A4D2E]/25 text-xs font-semibold text-[#0A4D2E] hover:bg-[#0A4D2E]/15 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Video className="w-3.5 h-3.5 text-[#0A4D2E]" />
                    Video Call
                  </button>

                  {!existingFriend && (
                    <button
                      type="button"
                      onClick={() => sendFriendRequest(business)}
                      className="px-3.5 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  )}

                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg bg-[#128C7E] text-white text-xs font-semibold hover:bg-[#0e7267] inline-flex items-center gap-1.5"
                    >
                      WhatsApp
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {business.tagline && (
            <p className="text-sm text-neutral-700 mt-4 max-w-3xl">{business.tagline}</p>
          )}

          {/* Edit Form for Business Owner */}
          {editing && isMine && (
            <form onSubmit={handleSaveEdit} className="mt-5 p-4 bg-[#FAFBFB] border border-neutral-200 rounded-xl space-y-4">
              {/* Profile Picture Control */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                <div className="flex items-center gap-3">
                  <BusinessAvatar
                    photoUrl={editLogoDataUrl}
                    initials={business.logoInitials}
                    color={business.logoColor}
                    name={editName || business.name}
                    className="w-14 h-14 rounded-xl border border-neutral-200"
                    textClassName="text-base"
                  />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Profile Picture</p>
                    <p className="text-[11px] text-neutral-500">
                      Displayed across your feed posts, stories, chat, and business directory.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-800">
                    <Camera className="w-3.5 h-3.5 text-[#0A4D2E]" />
                    {uploadingPhoto
                      ? 'Processing...'
                      : editLogoDataUrl
                        ? 'Change Photo'
                        : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      onChange={(e) => void handleAvatarUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                  {editLogoDataUrl && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveAvatar(false)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">About Business</label>
                <textarea
                  rows={3}
                  value={editAbout}
                  onChange={(e) => setEditAbout(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Profile Tabs */}
          <div className="mt-6 border-t border-neutral-200 pt-2 flex items-center gap-2 overflow-x-auto">
            {(
              [
                { id: 'posts', label: `Posts (${bizPosts.length})` },
                { id: 'products', label: `Products (${bizProducts.length})` },
                { id: 'reviews', label: `Reviews (${reviews.length})` },
                { id: 'about', label: 'About' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? 'bg-[#0A4D2E] text-white'
                    : 'text-neutral-600 hover:bg-[#F3F5F4]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {bizPosts.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-500">
              No feed updates published by {business.name} yet.
            </div>
          ) : (
            bizPosts.map((p) => (
              <div key={p.post_id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="p-5">
                  <p className="text-xs text-neutral-500 mb-2">
                    {formatTimeAgo(p.createdAt)} · {p.postType === 'offer' ? 'Product Offer' : p.postType === 'photo' ? 'Photo Update' : p.postType === 'video' ? 'Video Showcase' : 'Business Update'}
                  </p>
                  <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line">{p.content}</p>
                  {p.postType === 'offer' && (p.offerProductTitle || p.offerPrice) && (
                    <div className="mt-3 p-3 rounded-lg bg-[#FAFBFB] border border-neutral-200 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-neutral-900 truncate">
                        {p.offerProductTitle || 'Featured Offer'}
                      </span>
                      {p.offerPrice !== undefined && (
                        <span className="font-mono font-bold text-sm text-[#0A4D2E] tabular-nums">
                          ${p.offerPrice}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {(p.mediaDataUrl || p.postType === 'photo' || p.postType === 'offer' || p.postType === 'video') && (
                  <div className="border-t border-neutral-100">
                    <MediaArtwork
                      theme={p.mediaTheme || business.coverTheme || 'hero_trade'}
                      imageDataUrl={p.mediaDataUrl}
                      aspectClass="aspect-[16/9]"
                    />
                  </div>
                )}
                <div className="px-5 py-2.5 border-t border-neutral-100 flex items-center gap-4 text-xs text-neutral-500 tabular-nums">
                  <span>{p.likesCount} likes</span>
                  <span>{p.commentsCount} comments</span>
                  <span>{p.sharesCount} shares</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bizProducts.length === 0 ? (
            <div className="col-span-full bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-500">
              No marketplace products listed by {business.name} yet.
            </div>
          ) : (
            bizProducts.map((prod) => (
              <div
                key={prod.product_id}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <MediaArtwork
                    theme={prod.imageTheme}
                    imageDataUrl={prod.imageDataUrl}
                    aspectClass="aspect-[4/3]"
                  />
                  <div className="p-4">
                    <p className="text-xs text-neutral-500">{prod.category}</p>
                    <h3 className="font-display font-bold text-sm text-neutral-900 mt-1 line-clamp-2">
                      {prod.title}
                    </h3>
                    <p className="font-mono font-bold text-base text-[#0A4D2E] tabular-nums mt-2">
                      ${prod.price}
                    </p>
                  </div>
                </div>
                <div className="px-4 pb-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(prod);
                      setActivePage('marketplace');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCart(prod, 1)}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold hover:bg-[#083D24]"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-4">
          {!isMine && (
            <form
              onSubmit={handleReviewSubmit}
              className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3"
            >
              <h3 className="font-display font-bold text-sm text-neutral-900">
                Leave a Business Review
              </h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingInput(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= ratingInput
                          ? 'fill-[#D4AF37] text-[#D4AF37]'
                          : 'text-neutral-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                required
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your trade or service experience with this business..."
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold hover:bg-[#083D24]"
              >
                Submit Review
              </button>
            </form>
          )}

          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-500">
                No reviews yet. Be the first partner to review {business.name}.
              </div>
            ) : (
              reviews.map((rev) => {
                const reviewerBiz = getBusinessByUserId(rev.user_id);
                const reviewerName = getDisplayOwnerName(rev.user_id, null, 'SwayPalm Partner');
                return (
                  <div key={rev.review_id} className="bg-white border border-neutral-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-neutral-900">
                        {reviewerBiz ? `${reviewerBiz.name} · ${reviewerName}` : reviewerName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                        {rev.rating}.0
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 mt-1.5">{rev.comment}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-neutral-900">
            About {business.name}
          </h2>
          <p className="text-sm text-neutral-700 leading-relaxed">
            {business.about || business.tagline}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-neutral-200 text-xs">
            <div>
              <p className="text-neutral-500">Location</p>
              <p className="font-semibold text-neutral-900 mt-0.5">
                {business.city}, {business.country}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Industry Category</p>
              <p className="font-semibold text-neutral-900 mt-0.5">{business.category}</p>
            </div>
            <div>
              <p className="text-neutral-500">Membership Plan</p>
              <p className="font-semibold text-[#0A4D2E] mt-0.5 uppercase">
                {business.plan} {business.verified ? '· Verified' : ''}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Activity Status</p>
              <p
                className={`font-semibold mt-0.5 ${
                  profilePresence.isOnline ? 'text-[#0A4D2E]' : 'text-neutral-800'
                }`}
              >
                {profilePresence.label}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Full-size Profile Picture Preview Modal */}
      {showPhotoModal && business.logoDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="bg-white border border-neutral-200 rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-2">
              <p className="font-display font-bold text-sm text-neutral-900 truncate">
                {business.name}
              </p>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                aria-label="Close profile picture preview"
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#F3F5F4] aspect-square w-full overflow-hidden">
              <img
                src={business.logoDataUrl}
                alt={business.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            {isMine && (
              <div className="p-3 bg-white border-t border-neutral-200 flex items-center justify-between gap-2">
                <label className="flex-1 cursor-pointer py-2 px-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={(e) => void handleAvatarUpload(e, true)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar(true)}
                  className="py-2 px-3 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
