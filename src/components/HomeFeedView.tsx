import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Edit3,
  Globe2,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
  Tag,
  Trash2,
  Video,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { formatTimeAgo, resizeImageFileToDataUrl } from '../data/sampleCatalog';
import { SAMPLE_POST_UUIDS } from '../lib/ids';
import { FeedPost, PostComment } from '../types';
import { BusinessAvatar, VerifiedBadge } from './BrandMark';
import { MediaArtwork } from './MediaArtwork';
import { StoriesSection } from './StoriesSection';

const POST_THEMES = [
  { id: 'hero_trade', label: 'Default Business Theme' },
  { id: 'hair_luxury', label: 'Beauty & Hair' },
  { id: 'diani_resort', label: 'Hospitality & Resort' },
  { id: 'fashion_atelier', label: 'Fashion & Textiles' },
  { id: 'electronics_hub', label: 'Tech & Electronics' },
  { id: 'coffee_export', label: 'Agriculture & Export' },
  { id: 'tours_safari', label: 'Tourism & Safari' },
  { id: 'services_logistics', label: 'Logistics & Trade' },
];

type FeedFilter = 'all' | 'offer' | 'media' | 'following';

export const HomeFeedView: React.FC = () => {
  const {
    firebaseUser,
    userUuid,
    myBusiness,
    userProfile,
    isAdmin,
    posts,
    follows,
    likedPostIds,
    createPost,
    updatePost,
    deletePost,
    toggleLikePost,
    loadPostComments,
    addPostComment,
    sharePost,
    toggleSavePost,
    toggleFollowBusiness,
    startDirectChat,
    openBusinessProfile,
    setShowAuthModal,
    setAuthMode,
    notifyToast,
    getBusinessById,
    getBusinessByUserId,
    getDisplayBusinessName,
    getDisplayOwnerName,
  } = useSwayPalm();

  const [postType, setPostType] = useState<'update' | 'photo' | 'video' | 'offer'>('update');
  const [content, setContent] = useState('');
  const [mediaDataUrl, setMediaDataUrl] = useState<string | undefined>(undefined);
  const [mediaTheme, setMediaTheme] = useState<string>('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editOfferTitle, setEditOfferTitle] = useState('');
  const [editOfferPrice, setEditOfferPrice] = useState('');

  const [openCommentsFor, setOpenCommentsFor] = useState<Record<string, PostComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'offer') return posts.filter((p) => p.postType === 'offer');
    if (feedFilter === 'media') {
      return posts.filter(
        (p) => p.postType === 'photo' || p.postType === 'video' || Boolean(p.mediaDataUrl)
      );
    }
    if (feedFilter === 'following') {
      const followedIds = new Set(follows.map((f) => f.business_id));
      return posts.filter(
        (p) => followedIds.has(p.business_id) || p.business_id === myBusiness?.business_id
      );
    }
    return posts;
  }, [posts, feedFilter, follows, myBusiness?.business_id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 880);
      setMediaDataUrl(dataUrl);
      setPostType('photo');
    } catch {
      notifyToast('Could not process image file.', 'error');
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPublishing(true);
    try {
      await createPost({
        postType,
        content,
        mediaDataUrl,
        mediaTheme: mediaTheme || myBusiness?.coverTheme || 'hero_trade',
        offerProductTitle: postType === 'offer' ? offerTitle : undefined,
        offerPrice: postType === 'offer' && offerPrice ? Number(offerPrice) : undefined,
      });
      setContent('');
      setMediaDataUrl(undefined);
      setMediaTheme('');
      setOfferTitle('');
      setOfferPrice('');
      setPostType('update');
    } finally {
      setPublishing(false);
    }
  };

  const startEditingPost = (post: FeedPost) => {
    setEditingPostId(post.post_id);
    setEditContent(post.content);
    setEditOfferTitle(post.offerProductTitle || '');
    setEditOfferPrice(post.offerPrice ? String(post.offerPrice) : '');
  };

  const handleSavePostEdit = async (post: FeedPost) => {
    if (!editContent.trim()) return;
    await updatePost(post, {
      content: editContent,
      offerProductTitle: post.postType === 'offer' ? editOfferTitle : undefined,
      offerPrice:
        post.postType === 'offer' && editOfferPrice ? Number(editOfferPrice) : undefined,
    });
    setEditingPostId(null);
  };

  const handleToggleComments = async (post: FeedPost) => {
    if (openCommentsFor[post.post_id]) {
      setOpenCommentsFor((prev) => {
        const next = { ...prev };
        delete next[post.post_id];
        return next;
      });
      return;
    }
    const list = await loadPostComments(post.post_id);
    setOpenCommentsFor((prev) => ({ ...prev, [post.post_id]: list }));
  };

  const handleSendComment = async (post: FeedPost) => {
    const text = (commentDrafts[post.post_id] || '').trim();
    if (!text) return;
    await addPostComment(post, text);
    setCommentDrafts((prev) => ({ ...prev, [post.post_id]: '' }));
    const updated = await loadPostComments(post.post_id);
    setOpenCommentsFor((prev) => ({
      ...prev,
      [post.post_id]:
        updated.length > 0
          ? updated
          : [
              ...(prev[post.post_id] || []),
              {
                comment_id: `local_${Date.now()}`,
                post_id: post.post_id,
                user_id: userProfile?.id || userUuid || 'me',
                auth_uid: firebaseUser?.uid || 'me',
                text,
                createdAt: new Date().toISOString(),
              },
            ],
    }));
  };

  const savedIds = userProfile?.savedPostIds || [];

  return (
    <div className="space-y-5">
      {/* 24-Hour Business Stories Strip */}
      <StoriesSection />

      {/* Post Composer */}
      <section className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5">
        <form onSubmit={handlePublish}>
          <div className="flex items-start gap-3">
            <BusinessAvatar
              photoUrl={myBusiness?.logoDataUrl}
              initials={myBusiness?.logoInitials || 'SP'}
              color={myBusiness?.logoColor || '#0A4D2E'}
              name={myBusiness?.name || 'Your Business'}
              className="w-10 h-10 rounded-lg"
              textClassName="text-xs"
            />
            <div className="flex-1 min-w-0">
              <textarea
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => {
                  if (!firebaseUser) {
                    setAuthMode('register');
                    setShowAuthModal(true);
                  }
                }}
                placeholder={
                  myBusiness
                    ? `Share a product offer, shipment arrival, or partnership request as ${myBusiness.name}...`
                    : 'Share a product offer, business update, or sourcing request (Join Free to publish)...'
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#F3F5F4] border border-transparent focus:border-[#0A4D2E] focus:bg-white rounded-lg resize-none focus:outline-none transition-colors"
              />

              {postType === 'offer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                  <input
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="Product or service offer title"
                    className="px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="Offer price (USD)"
                    className="px-3 py-2 text-xs border border-neutral-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                </div>
              )}

              {(postType === 'video' || postType === 'offer') && !mediaDataUrl && (
                <div className="mt-2.5 flex items-center gap-2">
                  <label className="text-[11px] font-medium text-neutral-600 whitespace-nowrap">
                    Showcase Backdrop:
                  </label>
                  <select
                    value={mediaTheme || myBusiness?.coverTheme || 'hero_trade'}
                    onChange={(e) => setMediaTheme(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  >
                    {POST_THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mediaDataUrl && (
                <div className="mt-2.5 relative inline-block">
                  <img
                    src={mediaDataUrl}
                    alt="Post attachment preview"
                    className="max-h-44 rounded-lg border border-neutral-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaDataUrl(undefined)}
                    className="mt-1 text-xs font-medium text-red-700 hover:underline block"
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:bg-[#F3F5F4] transition-colors">
                <ImageIcon className="w-4 h-4 text-[#0A4D2E]" />
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setPostType(postType === 'video' ? 'update' : 'video')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  postType === 'video'
                    ? 'bg-[#0A4D2E]/10 text-[#0A4D2E] font-semibold'
                    : 'text-neutral-700 hover:bg-[#F3F5F4]'
                }`}
              >
                <Video className="w-4 h-4 text-[#0A4D2E]" />
                Video Showcase
              </button>

              <button
                type="button"
                onClick={() => setPostType(postType === 'offer' ? 'update' : 'offer')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  postType === 'offer'
                    ? 'bg-[#D4AF37]/20 text-[#111915] font-semibold'
                    : 'text-neutral-700 hover:bg-[#F3F5F4]'
                }`}
              >
                <Tag className="w-4 h-4 text-[#D4AF37]" />
                Product Offer
              </button>
            </div>

            <button
              type="submit"
              disabled={publishing || !content.trim()}
              className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <Globe2 className="w-3.5 h-3.5" />
              {publishing ? 'Publishing...' : 'Publish Update'}
            </button>
          </div>
        </form>
      </section>

      {/* Feed Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-white border border-neutral-200 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Updates' },
              { id: 'offer', label: 'Product Offers' },
              { id: 'media', label: 'Photos & Media' },
              { id: 'following', label: 'Following' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFeedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                feedFilter === tab.id
                  ? 'bg-[#0A4D2E] text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#F3F5F4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-500 tabular-nums">
          {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
        </span>
      </div>

      {/* Business Feed Stream */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
            <p className="font-display font-semibold text-sm text-neutral-900">
              {feedFilter === 'following'
                ? 'No posts from businesses you follow yet'
                : 'No posts in this category yet'}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {feedFilter === 'following'
                ? 'Follow suppliers and trade partners in Explore to track their updates here.'
                : 'Publish the first update above or switch back to All Updates.'}
            </p>
            <button
              type="button"
              onClick={() => setFeedFilter('all')}
              className="mt-4 px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
            >
              Show All Updates
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isFollowing = follows.some((f) => f.business_id === post.business_id);
            const isLiked = likedPostIds.has(post.post_id);
            const isSaved = savedIds.includes(post.post_id);
            const biz = getBusinessById(post.business_id);
            const postBizName =
              biz?.name || getDisplayBusinessName(post.business_id, post.user_id);
            const postInitials =
              biz?.logoInitials || postBizName.slice(0, 2).toUpperCase() || 'SP';
            const postColor = biz?.logoColor || '#0A4D2E';
            const postLocation = biz ? `${biz.city}, ${biz.country}` : 'Global';
            const postVerified = Boolean(biz?.verified);
            const commentsList = openCommentsFor[post.post_id];
            const isLiveAuthor =
              Boolean(firebaseUser) &&
              !SAMPLE_POST_UUIDS.includes(post.post_id) &&
              (post.auth_uid === firebaseUser?.uid || isAdmin);
            const isEditingThis = editingPostId === post.post_id;

            return (
              <article
                key={post.post_id}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
              >
                {/* Post Header */}
                <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openBusinessProfile(post.business_id)}
                    className="flex items-center gap-3 text-left min-w-0 group"
                  >
                    <BusinessAvatar
                      photoUrl={biz?.logoDataUrl}
                      initials={postInitials}
                      color={postColor}
                      name={postBizName}
                      className="w-10 h-10 rounded-lg"
                      textClassName="text-xs"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-sm text-neutral-900 truncate group-hover:text-[#0A4D2E]">
                          {postBizName}
                        </span>
                        {postVerified && (
                          <VerifiedBadge plan={biz?.plan || 'pro'} className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                        <span className="truncate">{postLocation}</span>
                        <span aria-hidden="true">·</span>
                        <span className="whitespace-nowrap">{formatTimeAgo(post.createdAt)}</span>
                        {post.postType === 'offer' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#0A4D2E]">Product Offer</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLiveAuthor && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditingPost(post)}
                          aria-label="Edit post"
                          title="Edit post"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0A4D2E] hover:bg-[#F3F5F4] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePost(post.post_id)}
                          aria-label="Delete post"
                          title="Delete post"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {post.business_id !== myBusiness?.business_id && biz && (
                      <button
                        type="button"
                        onClick={() => toggleFollowBusiness(biz)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          isFollowing
                            ? 'bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
                            : 'border border-[#0A4D2E]/30 text-[#0A4D2E] hover:bg-[#0A4D2E] hover:text-white'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Copy or Inline Edit Form */}
                {isEditingThis ? (
                  <div className="px-4 sm:px-5 pb-4 space-y-2.5">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                    />
                    {post.postType === 'offer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editOfferTitle}
                          onChange={(e) => setEditOfferTitle(e.target.value)}
                          placeholder="Offer title"
                          className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg"
                        />
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={editOfferPrice}
                          onChange={(e) => setEditOfferPrice(e.target.value)}
                          placeholder="Offer price (USD)"
                          className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg font-mono"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPostId(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSavePostEdit(post)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 sm:px-5 pb-3">
                    <p className="text-sm sm:text-[15px] text-neutral-800 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>
                )}

                {/* Offer Strip */}
                {post.postType === 'offer' && (post.offerProductTitle || post.offerPrice) && (
                  <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-lg bg-[#FAFBFB] border border-neutral-200 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {post.offerProductTitle || 'Featured Business Offer'}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Available via {postBizName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {post.offerPrice !== undefined && (
                        <span className="font-mono font-bold text-sm text-[#0A4D2E] tabular-nums">
                          ${post.offerPrice}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openBusinessProfile(post.business_id)}
                        className="px-3 py-1.5 rounded-md bg-[#0A4D2E] text-white text-xs font-semibold hover:bg-[#083D24]"
                      >
                        View Offer
                      </button>
                    </div>
                  </div>
                )}

                {/* Media */}
                {(post.mediaDataUrl ||
                  post.postType === 'photo' ||
                  post.postType === 'offer' ||
                  post.postType === 'video') && (
                  <div className="border-y border-neutral-100">
                    <MediaArtwork
                      theme={post.mediaTheme || biz?.coverTheme || 'hero_trade'}
                      imageDataUrl={post.mediaDataUrl}
                      title={
                        post.postType === 'video' ? `Video Showcase · ${postBizName}` : undefined
                      }
                      subtitle={postLocation}
                      aspectClass="aspect-[16/9]"
                    />
                  </div>
                )}

                {/* Action Bar */}
                <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-xs text-neutral-600">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleLikePost(post)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                        isLiked
                          ? 'text-[#0A4D2E] bg-[#0A4D2E]/10 font-semibold'
                          : 'hover:bg-[#F3F5F4]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#0A4D2E]' : ''}`} />
                      <span className="tabular-nums">{post.likesCount}</span>
                      <span className="hidden sm:inline">Like</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleComments(post)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium hover:bg-[#F3F5F4] transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="tabular-nums">{post.commentsCount}</span>
                      <span className="hidden sm:inline">Comment</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sharePost(post)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium hover:bg-[#F3F5F4] transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="tabular-nums">{post.sharesCount}</span>
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {post.business_id !== myBusiness?.business_id && biz && (
                      <button
                        type="button"
                        onClick={() => startDirectChat(biz)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium hover:bg-[#F3F5F4] transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-[#0A4D2E]" />
                        <span className="hidden sm:inline">Message</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSavePost(post.post_id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      isSaved
                        ? 'text-[#D4AF37] bg-[#D4AF37]/10 font-semibold'
                        : 'hover:bg-[#F3F5F4]'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#D4AF37]' : ''}`} />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                </div>

                {/* Inline Comments */}
                {commentsList && (
                  <div className="px-4 sm:px-5 py-3 bg-[#FAFBFB] border-t border-neutral-100 space-y-3">
                    {commentsList.length === 0 ? (
                      <p className="text-xs text-neutral-500">
                        No comments yet. Start the business conversation below.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {commentsList.map((c) => {
                          const commentBiz = getBusinessByUserId(c.user_id);
                          const authorName = getDisplayOwnerName(c.user_id);
                          return (
                            <div
                              key={c.comment_id}
                              className="text-xs bg-white border border-neutral-200 rounded-lg p-2.5"
                            >
                              <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                                <span>{authorName}</span>
                                {commentBiz?.name && (
                                  <span className="text-neutral-500 font-normal">
                                    · {commentBiz.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-neutral-700 mt-1">{c.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentDrafts[post.post_id] || ''}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({ ...prev, [post.post_id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleSendComment(post);
                          }
                        }}
                        placeholder="Write a reply or inquiry..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendComment(post)}
                        className="p-2 rounded-lg bg-[#0A4D2E] text-white hover:bg-[#083D24]"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
