import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { formatTimeAgo, resizeImageFileToDataUrl } from '../data/sampleCatalog';
import { SAMPLE_STORY_UUIDS } from '../lib/ids';
import { BusinessStory } from '../types';
import { BusinessAvatar, VerifiedBadge } from './BrandMark';
import { MediaArtwork } from './MediaArtwork';

const STORY_THEMES = [
  { id: 'hero_trade', label: 'Global Trade' },
  { id: 'hair_luxury', label: 'Beauty & Hair' },
  { id: 'diani_resort', label: 'Hospitality' },
  { id: 'fashion_atelier', label: 'Fashion' },
  { id: 'electronics_hub', label: 'Electronics' },
  { id: 'coffee_export', label: 'Agriculture' },
  { id: 'tours_safari', label: 'Tourism' },
  { id: 'services_logistics', label: 'Logistics' },
];

const CTA_OPTIONS = [
  'View Business Profile',
  'View Wholesale Offer',
  'Message Supplier',
  'Request Quote',
];

export const StoriesSection: React.FC = () => {
  const {
    firebaseUser,
    myBusiness,
    stories,
    viewedStoryIds,
    createStory,
    markStoryViewed,
    deleteStory,
    openBusinessProfile,
    startDirectChat,
    setAuthMode,
    setShowAuthModal,
    notifyToast,
    getBusinessById,
    getDisplayBusinessName,
  } = useSwayPalm();

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [headline, setHeadline] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaTheme, setMediaTheme] = useState(myBusiness?.coverTheme || 'hero_trade');
  const [mediaDataUrl, setMediaDataUrl] = useState<string | undefined>(undefined);
  const [ctaLabel, setCtaLabel] = useState(CTA_OPTIONS[0]);
  const [publishing, setPublishing] = useState(false);

  const activeStory: BusinessStory | null =
    viewerIndex !== null && stories[viewerIndex] ? stories[viewerIndex] : null;
  const activeStoryBiz = activeStory ? getBusinessById(activeStory.business_id) : undefined;
  const activeStoryBizName = activeStory
    ? activeStoryBiz?.name || getDisplayBusinessName(activeStory.business_id, activeStory.user_id)
    : '';
  const activeStoryLocation = activeStoryBiz
    ? `${activeStoryBiz.city}, ${activeStoryBiz.country}`
    : 'Global';

  useEffect(() => {
    if (activeStory) {
      markStoryViewed(activeStory);
      setProgress(0);
    }
  }, [activeStory?.story_id]);

  // Auto-advance timer inside story viewer (6s per story)
  useEffect(() => {
    if (viewerIndex === null || paused || stories.length === 0) return;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (viewerIndex + 1 < stories.length) {
            setViewerIndex(viewerIndex + 1);
          } else {
            setViewerIndex(null);
          }
          return 0;
        }
        return prev + 2;
      });
    }, 120);
    return () => window.clearInterval(interval);
  }, [viewerIndex, paused, stories.length]);

  // Keyboard navigation when viewing a story
  useEffect(() => {
    if (viewerIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerIndex(null);
      else if (e.key === 'ArrowRight') {
        if (viewerIndex + 1 < stories.length) setViewerIndex(viewerIndex + 1);
        else setViewerIndex(null);
      } else if (e.key === 'ArrowLeft') {
        if (viewerIndex > 0) setViewerIndex(viewerIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewerIndex, stories.length]);

  const handleOpenCreate = () => {
    if (!firebaseUser) {
      setAuthMode('register');
      setShowAuthModal(true);
      return;
    }
    setMediaTheme(myBusiness?.coverTheme || 'hero_trade');
    setShowCreateModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await resizeImageFileToDataUrl(file, 900);
      setMediaDataUrl(url);
    } catch {
      notifyToast('Could not process story image.', 'error');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) return;
    setPublishing(true);
    try {
      await createStory({
        headline,
        caption,
        mediaDataUrl,
        mediaTheme,
        ctaLabel,
      });
      setHeadline('');
      setCaption('');
      setMediaDataUrl(undefined);
      setShowCreateModal(false);
    } finally {
      setPublishing(false);
    }
  };

  const handleStoryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStory || !replyText.trim()) return;
    const biz = getBusinessById(activeStory.business_id);
    if (!biz) {
      notifyToast('Business profile unavailable for messaging.', 'info');
      return;
    }
    const msg = `Regarding your story "${activeStory.headline}": ${replyText.trim()}`;
    setReplyText('');
    setViewerIndex(null);
    await startDirectChat(biz, msg);
  };

  const handleDeleteActiveStory = async () => {
    if (!activeStory) return;
    await deleteStory(activeStory.story_id);
    setViewerIndex(null);
  };

  return (
    <>
      <section className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="font-display font-bold text-sm sm:text-base text-neutral-900">
              Business Stories
            </h2>
            <p className="text-xs text-neutral-500">
              24-hour supplier highlights, fresh stock arrivals, and flash trade offers
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Story
          </button>
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
          {/* Create Story Tile */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="w-28 h-44 sm:w-32 sm:h-48 rounded-xl border border-dashed border-[#0A4D2E]/40 bg-[#F3F5F4] hover:bg-[#0A4D2E]/8 transition-colors shrink-0 p-3 flex flex-col items-center justify-between text-center"
          >
            <BusinessAvatar
              photoUrl={myBusiness?.logoDataUrl}
              initials={myBusiness?.logoInitials || 'SP'}
              color={myBusiness?.logoColor || '#0A4D2E'}
              name={myBusiness?.name || 'Your Business'}
              className="w-10 h-10 rounded-lg"
              textClassName="text-xs"
            />
            <span className="w-9 h-9 rounded-full bg-[#0A4D2E] text-white flex items-center justify-center shadow-sm">
              <Plus className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-neutral-900">Create Story</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">24h spotlight</p>
            </div>
          </button>

          {/* Story Tiles */}
          {stories.map((story, idx) => {
            const isViewed = viewedStoryIds.has(story.story_id);
            const storyBiz = getBusinessById(story.business_id);
            const storyBizName =
              storyBiz?.name || getDisplayBusinessName(story.business_id, story.user_id);
            return (
              <button
                key={story.story_id}
                type="button"
                onClick={() => setViewerIndex(idx)}
                className="w-28 h-44 sm:w-32 sm:h-48 rounded-xl overflow-hidden relative shrink-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A4D2E]"
              >
                <div className="absolute inset-0">
                  <MediaArtwork
                    theme={story.mediaTheme || 'hero_trade'}
                    imageDataUrl={story.mediaDataUrl}
                    aspectClass="w-full h-full"
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />

                {/* Top Avatar with Seen / Unseen Ring */}
                <div className="relative z-10 p-2.5 flex items-center justify-between">
                  <BusinessAvatar
                    photoUrl={storyBiz?.logoDataUrl}
                    initials={storyBiz?.logoInitials || storyBizName.slice(0, 2).toUpperCase() || 'SP'}
                    color={storyBiz?.logoColor || '#0A4D2E'}
                    name={storyBizName}
                    className={`w-8 h-8 rounded-lg ring-2 ${
                      isViewed ? 'ring-white/60' : 'ring-[#D4AF37]'
                    }`}
                    textClassName="text-[11px]"
                  />
                </div>

                {/* Bottom Title */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 text-white">
                  <p className="text-[11px] font-semibold leading-snug line-clamp-2">
                    {story.headline}
                  </p>
                  <p className="text-[10px] text-white/80 truncate mt-1">
                    {storyBizName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Fullscreen Story Viewer Modal */}
      {activeStory && viewerIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
          {/* Left Prev Arrow (Desktop) */}
          {viewerIndex > 0 && (
            <button
              type="button"
              onClick={() => setViewerIndex(viewerIndex - 1)}
              aria-label="Previous story"
              className="hidden sm:flex w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center mr-4 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative w-full max-w-md h-[84vh] max-h-[720px] rounded-2xl overflow-hidden bg-[#0D1410] border border-white/15 flex flex-col justify-between">
            {/* Background Artwork */}
            <div className="absolute inset-0">
              <MediaArtwork
                theme={activeStory.mediaTheme || 'hero_trade'}
                imageDataUrl={activeStory.mediaDataUrl}
                aspectClass="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/75" />
            </div>

            {/* Top Progress Bars + Author Header */}
            <div className="relative z-10 p-4 space-y-3">
              <div className="flex items-center gap-1">
                {stories.map((s, idx) => (
                  <button
                    key={s.story_id}
                    type="button"
                    onClick={() => setViewerIndex(idx)}
                    aria-label={`Jump to story ${idx + 1}`}
                    className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden"
                  >
                    <div
                      className="h-full bg-[#D4AF37] transition-all duration-100"
                      style={{
                        width:
                          idx < viewerIndex
                            ? '100%'
                            : idx === viewerIndex
                              ? `${progress}%`
                              : '0%',
                      }}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 text-white">
                <button
                  type="button"
                  onClick={() => {
                    setViewerIndex(null);
                    openBusinessProfile(activeStory.business_id);
                  }}
                  className="flex items-center gap-2.5 min-w-0 text-left"
                >
                  <BusinessAvatar
                    photoUrl={activeStoryBiz?.logoDataUrl}
                    initials={
                      activeStoryBiz?.logoInitials ||
                      activeStoryBizName.slice(0, 2).toUpperCase() ||
                      'SP'
                    }
                    color={activeStoryBiz?.logoColor || '#0A4D2E'}
                    name={activeStoryBizName}
                    className="w-9 h-9 rounded-lg border border-white/25"
                    textClassName="text-xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold truncate">
                        {activeStoryBizName}
                      </span>
                      {activeStoryBiz?.verified && (
                        <VerifiedBadge plan={activeStoryBiz.plan || 'pro'} className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <p className="text-[11px] text-white/75 truncate">
                      {activeStoryLocation} · {formatTimeAgo(activeStory.createdAt)}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPaused(!paused)}
                    aria-label={paused ? 'Play story' : 'Pause story'}
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                  >
                    {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  {firebaseUser &&
                    activeStory.auth_uid === firebaseUser.uid &&
                    !SAMPLE_STORY_UUIDS.includes(activeStory.story_id) && (
                      <button
                        type="button"
                        onClick={handleDeleteActiveStory}
                        aria-label="Delete story"
                        className="p-2 rounded-lg text-white/80 hover:text-red-300 hover:bg-white/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => setViewerIndex(null)}
                    aria-label="Close story viewer"
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tap Zones for Mobile Navigation */}
            <div className="relative z-10 flex-1 flex">
              <button
                type="button"
                aria-label="Previous story area"
                onClick={() => viewerIndex > 0 && setViewerIndex(viewerIndex - 1)}
                className="w-1/3 h-full focus:outline-none"
              />
              <button
                type="button"
                aria-label="Pause or resume story"
                onClick={() => setPaused((p) => !p)}
                className="w-1/3 h-full focus:outline-none"
              />
              <button
                type="button"
                aria-label="Next story area"
                onClick={() =>
                  viewerIndex + 1 < stories.length
                    ? setViewerIndex(viewerIndex + 1)
                    : setViewerIndex(null)
                }
                className="w-1/3 h-full focus:outline-none"
              />
            </div>

            {/* Bottom Story Copy + CTA + Direct Reply */}
            <div className="relative z-10 p-4 sm:p-5 space-y-3 text-white">
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl leading-snug">
                  {activeStory.headline}
                </h3>
                {activeStory.caption && (
                  <p className="text-xs sm:text-sm text-white/90 mt-1.5 leading-relaxed">
                    {activeStory.caption}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/75 tabular-nums">
                  <Eye className="w-3.5 h-3.5" />
                  {(activeStory.viewsCount || 0).toLocaleString()} views
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setViewerIndex(null);
                    openBusinessProfile(activeStory.business_id);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#c5a12f] text-[#111915] text-xs font-bold whitespace-nowrap transition-colors"
                >
                  {activeStory.ctaLabel || 'View Business Profile'}
                </button>
              </div>

              {activeStory.business_id !== myBusiness?.business_id && (
                <form onSubmit={handleStoryReply} className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <MessageSquare className="w-3.5 h-3.5 text-white/60 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={replyText}
                      onFocus={() => setPaused(true)}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${activeStoryBizName}...`}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/15 border border-white/20 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    aria-label="Send story reply"
                    className="p-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Next Arrow (Desktop) */}
          {viewerIndex + 1 < stories.length && (
            <button
              type="button"
              onClick={() => setViewerIndex(viewerIndex + 1)}
              aria-label="Next story"
              className="hidden sm:flex w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center ml-4 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-2xl overflow-hidden my-auto">
            <div className="px-5 py-4 bg-[#0A4D2E] text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base">Create 24-Hour Business Story</h3>
                <p className="text-xs text-white/80">
                  Highlight a product arrival, limited-time offer, or warehouse tour
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close create story modal"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Live Story Preview */}
              <div className="md:col-span-5">
                <p className="text-xs font-semibold text-neutral-600 mb-2">Live Preview</p>
                <div className="relative h-64 md:h-72 rounded-xl overflow-hidden bg-[#0D1410]">
                  <MediaArtwork
                    theme={mediaTheme}
                    imageDataUrl={mediaDataUrl}
                    aspectClass="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />
                  <div className="relative z-10 h-full p-3.5 flex flex-col justify-between text-white">
                    <div className="flex items-center gap-2">
                      <BusinessAvatar
                        photoUrl={myBusiness?.logoDataUrl}
                        initials={myBusiness?.logoInitials || 'SP'}
                        color={myBusiness?.logoColor || '#0A4D2E'}
                        name={myBusiness?.name || 'Your Business'}
                        className="w-7 h-7 rounded-md"
                        textClassName="text-[10px]"
                      />
                      <span className="text-xs font-semibold truncate">
                        {myBusiness?.name || 'Your Business'}
                      </span>
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm leading-snug">
                        {headline.trim() || 'Your Story Headline'}
                      </p>
                      {caption.trim() && (
                        <p className="text-[11px] text-white/85 mt-1 line-clamp-2">{caption}</p>
                      )}
                      <span className="inline-block mt-2 px-2.5 py-1 rounded bg-[#D4AF37] text-[#111915] text-[10px] font-bold">
                        {ctaLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Story Form */}
              <div className="md:col-span-7 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Story Headline
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. New Container Arrived — 20% Wholesale Discount"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Caption / Details
                  </label>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share minimum order quantity, shipping dates, or booking details..."
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Visual Backdrop
                    </label>
                    <select
                      value={mediaTheme}
                      onChange={(e) => setMediaTheme(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                    >
                      {STORY_THEMES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Action Button
                    </label>
                    <select
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                    >
                      {CTA_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                    <ImageIcon className="w-4 h-4 text-[#0A4D2E]" />
                    {mediaDataUrl ? 'Change Photo' : 'Upload Photo'}
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
                      className="text-xs text-red-700 hover:underline font-medium"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing || !headline.trim()}
                    className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {publishing ? 'Publishing...' : 'Publish 24h Story'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
