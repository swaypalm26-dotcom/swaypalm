import React, { useState } from 'react';
import {
  Bell,
  Bookmark,
  Check,
  CheckCheck,
  Clock,
  Eye,
  EyeOff,
  MessageSquare,
  Phone,
  UserCheck,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { formatTimeAgo, getBusinessPresence } from '../data/sampleCatalog';
import { BusinessAvatar, VerifiedBadge } from './BrandMark';

export const FriendsNetworkView: React.FC = () => {
  const {
    firebaseUser,
    userUuid,
    userProfile,
    myBusiness,
    businesses,
    follows,
    friendships,
    profileViews,
    nowMs,
    getBusinessById,
    getBusinessByUserId,
    getDisplayBusinessName,
    getDisplayOwnerName,
    toggleOnlineStatusVisibility,
    sendFriendRequest,
    respondFriendRequest,
    toggleFollowBusiness,
    openBusinessProfile,
    startDirectChat,
    startCall,
  } = useSwayPalm();

  const [tab, setTab] = useState<'online' | 'friends' | 'requests' | 'suggested' | 'following' | 'views'>('online');
  const [friendFilter, setFriendFilter] = useState<'all' | 'online'>('all');
  const myUserId = userProfile?.id || userUuid || '';

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const acceptedFriendUserIds = new Set(
    acceptedFriends
      .flatMap((f) => f.participant_user_ids)
      .filter((uid) => uid !== myUserId)
  );

  const onlineNowPartners = businesses
    .filter((b) => b.business_id !== myBusiness?.business_id)
    .map((b) => ({
      business: b,
      isFriend: acceptedFriendUserIds.has(b.user_id),
      presence: getBusinessPresence(b, nowMs),
    }))
    .sort((a, b) => {
      if (a.presence.isOnline !== b.presence.isOnline) return a.presence.isOnline ? -1 : 1;
      if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
      return b.presence.lastSeenMs - a.presence.lastSeenMs;
    });

  const onlineCount = onlineNowPartners.filter((p) => p.presence.isOnline).length;

  const incomingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.recipient_id === myUserId
  );
  const outgoingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.requester_id === myUserId
  );

  const connectedUserIds = new Set(
    friendships.flatMap((f) => f.participant_user_ids)
  );
  const suggestedBusinesses = businesses.filter(
    (b) => b.business_id !== myBusiness?.business_id && !connectedUserIds.has(b.user_id)
  );

  const filteredAcceptedFriends = acceptedFriends.filter((fr) => {
    if (friendFilter === 'all') return true;
    const isReq = fr.requester_id === myUserId;
    const partnerUserId = isReq ? fr.recipient_id : fr.requester_id;
    const biz = getBusinessByUserId(partnerUserId);
    return getBusinessPresence(biz, nowMs).isOnline;
  });

  return (
    <div className="space-y-5">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
              Friends & Business Network
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              See who is online now, check last seen activity, manage friend requests, and view profile visitors.
            </p>
          </div>

          {firebaseUser && myBusiness && (
            <button
              type="button"
              onClick={() => void toggleOnlineStatusVisibility()}
              className={`px-3.5 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                myBusiness.showOnlineStatus === false
                  ? 'border-neutral-300 bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
                  : 'border-[#0A4D2E]/30 bg-[#0A4D2E]/8 text-[#0A4D2E] hover:bg-[#0A4D2E]/15'
              }`}
            >
              {myBusiness.showOnlineStatus === false ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Active Status: Hidden
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Active Status: Visible
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'online', label: `Online & Last Seen (${onlineCount})` },
              { id: 'friends', label: `My Friends (${acceptedFriends.length})` },
              { id: 'requests', label: `Requests (${incomingRequests.length})` },
              { id: 'suggested', label: 'Suggested Friends' },
              { id: 'following', label: `Following (${follows.length})` },
              { id: 'views', label: `Who Viewed My Profile (${profileViews.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === t.id
                  ? 'bg-[#0A4D2E] text-white'
                  : 'bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'online' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {onlineNowPartners.map(({ business: biz, isFriend, presence }) => (
              <div
                key={biz.business_id}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => openBusinessProfile(biz.business_id)}
                  className="flex items-center gap-3 text-left min-w-0 flex-1"
                >
                  <BusinessAvatar
                    photoUrl={biz.logoDataUrl}
                    initials={biz.logoInitials}
                    color={biz.logoColor}
                    name={biz.name}
                    className="w-11 h-11 rounded-lg"
                    textClassName="text-xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm text-neutral-900 truncate">
                        {biz.name}
                      </span>
                      {biz.verified && <VerifiedBadge plan={biz.plan} className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-xs text-neutral-500 truncate">
                      {isFriend ? 'Connected Friend · ' : ''}
                      {biz.city}, {biz.country}
                    </p>
                    <p
                      className={`text-xs mt-0.5 inline-flex items-center gap-1 ${
                        presence.isOnline
                          ? 'text-[#0A4D2E] font-semibold'
                          : 'text-neutral-500'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{presence.label}</span>
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isFriend && !connectedUserIds.has(biz.user_id) && (
                    <button
                      type="button"
                      onClick={() => sendFriendRequest(biz)}
                      aria-label={`Add ${biz.name} as friend`}
                      className="p-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void startCall(biz, 'audio')}
                    aria-label={`Audio call ${biz.name}`}
                    className="p-2 rounded-lg border border-neutral-300 text-[#0A4D2E] hover:bg-neutral-50"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void startCall(biz, 'video')}
                    aria-label={`Video call ${biz.name}`}
                    className="p-2 rounded-lg border border-neutral-300 text-[#0A4D2E] hover:bg-neutral-50"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startDirectChat(biz)}
                    className="px-3 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold hover:bg-[#083D24] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Message</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'friends' && (
        <div className="space-y-4">
          {acceptedFriends.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFriendFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  friendFilter === 'all'
                    ? 'bg-[#0A4D2E] text-white'
                    : 'bg-white border border-neutral-200 text-neutral-700'
                }`}
              >
                All Friends ({acceptedFriends.length})
              </button>
              <button
                type="button"
                onClick={() => setFriendFilter('online')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  friendFilter === 'online'
                    ? 'bg-[#0A4D2E] text-white'
                    : 'bg-white border border-neutral-200 text-neutral-700'
                }`}
              >
                Online Only
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAcceptedFriends.length === 0 ? (
              <div className="col-span-full bg-white border border-neutral-200 rounded-xl p-8 text-center">
                <UserCheck className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="font-semibold text-sm text-neutral-900">
                  {friendFilter === 'online' && acceptedFriends.length > 0
                    ? 'None of your connected friends are online right now'
                    : 'No business friends added yet'}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {friendFilter === 'online' && acceptedFriends.length > 0
                    ? 'Switch to All Friends to view their last seen timestamps.'
                    : 'Visit Suggested Friends to connect with entrepreneurs worldwide.'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    friendFilter === 'online' && acceptedFriends.length > 0
                      ? setFriendFilter('all')
                      : setTab('suggested')
                  }
                  className="mt-4 px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
                >
                  {friendFilter === 'online' && acceptedFriends.length > 0
                    ? 'Show All Friends'
                    : 'Browse Suggested Friends'}
                </button>
              </div>
            ) : (
              filteredAcceptedFriends.map((fr) => {
                const isReq = fr.requester_id === myUserId;
                const partnerUserId = isReq ? fr.recipient_id : fr.requester_id;
                const biz = getBusinessByUserId(partnerUserId);
                const partnerName = getDisplayBusinessName(
                  biz?.business_id,
                  partnerUserId,
                  getDisplayOwnerName(partnerUserId, null, 'Business Friend')
                );
                const partnerCity = biz ? `${biz.city}, ${biz.country}` : 'Global';
                const presence = getBusinessPresence(biz, nowMs);

                return (
                  <div key={fr.friendship_id} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <BusinessAvatar
                        photoUrl={biz?.logoDataUrl}
                        initials={biz?.logoInitials || (partnerName || 'SP').slice(0, 2).toUpperCase()}
                        color={biz?.logoColor || '#0A4D2E'}
                        name={partnerName || 'Friend'}
                        className="w-11 h-11 rounded-lg"
                        textClassName="text-xs"
                      />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-neutral-900 truncate">{partnerName}</p>
                        <p className="text-xs text-neutral-500 truncate">{partnerCity}</p>
                        <p
                          className={`text-xs mt-0.5 inline-flex items-center gap-1 ${
                            presence.isOnline ? 'text-[#0A4D2E] font-semibold' : 'text-neutral-500'
                          }`}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{presence.label}</span>
                        </p>
                      </div>
                    </div>
                    {biz && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openBusinessProfile(biz.business_id)}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 whitespace-nowrap"
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => void startCall(biz, 'audio')}
                          aria-label={`Audio call ${partnerName}`}
                          className="p-2 rounded-lg border border-neutral-300 text-[#0A4D2E] hover:bg-neutral-50"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void startCall(biz, 'video')}
                          aria-label={`Video call ${partnerName}`}
                          className="p-2 rounded-lg border border-neutral-300 text-[#0A4D2E] hover:bg-neutral-50"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startDirectChat(biz)}
                          aria-label={`Message ${partnerName}`}
                          className="p-2 rounded-lg bg-[#0A4D2E] text-white"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-500">
              No pending friend requests right now.
            </div>
          ) : (
            <>
              {incomingRequests.map((req) => {
                const reqBiz = getBusinessByUserId(req.requester_id);
                const reqName = getDisplayBusinessName(
                  reqBiz?.business_id,
                  req.requester_id,
                  getDisplayOwnerName(req.requester_id, null, 'Business Partner')
                );
                const reqCity = reqBiz ? `${reqBiz.city}, ${reqBiz.country}` : 'Global';
                return (
                  <div
                    key={req.friendship_id}
                    className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-display font-bold text-sm text-neutral-900">{reqName}</p>
                      <p className="text-xs text-neutral-500">{reqCity} · Wants to connect</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => respondFriendRequest(req, true)}
                        className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respondFriendRequest(req, false)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}

              {outgoingRequests.map((req) => {
                const recBiz = getBusinessByUserId(req.recipient_id);
                const recName = getDisplayBusinessName(
                  recBiz?.business_id,
                  req.recipient_id,
                  getDisplayOwnerName(req.recipient_id, null, 'Business Partner')
                );
                const recCity = recBiz ? `${recBiz.city}, ${recBiz.country}` : 'Global';
                return (
                  <div
                    key={req.friendship_id}
                    className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-display font-bold text-sm text-neutral-900">{recName}</p>
                      <p className="text-xs text-neutral-500">{recCity} · Sent request</p>
                    </div>
                    <span className="text-xs font-medium text-neutral-500">Pending</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === 'suggested' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestedBusinesses.map((biz) => {
            const presence = getBusinessPresence(biz, nowMs);
            return (
              <div
                key={biz.business_id}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => openBusinessProfile(biz.business_id)}
                  className="flex items-center gap-3 text-left min-w-0"
                >
                  <BusinessAvatar
                    photoUrl={biz.logoDataUrl}
                    initials={biz.logoInitials}
                    color={biz.logoColor}
                    name={biz.name}
                    className="w-11 h-11 rounded-lg"
                    textClassName="text-xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-display font-bold text-sm text-neutral-900 truncate">
                        {biz.name}
                      </span>
                      {biz.verified && <VerifiedBadge plan={biz.plan} className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-xs text-neutral-500 truncate">
                      {biz.category} · {biz.city}, {biz.country}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        presence.isOnline ? 'text-[#0A4D2E] font-semibold' : 'text-neutral-500'
                      }`}
                    >
                      {presence.label}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => sendFriendRequest(biz)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0 hover:bg-[#083D24]"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Friend
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'following' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {follows.length === 0 ? (
            <div className="col-span-full bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-500">
              You are not following any businesses yet. Follow businesses from Feed or Explore.
            </div>
          ) : (
            follows.map((f) => {
              const biz = getBusinessById(f.business_id);
              const displayName =
                biz?.name || getDisplayBusinessName(f.business_id, f.business_user_id);
              const presence = getBusinessPresence(biz, nowMs);
              return (
                <div
                  key={f.follow_id}
                  className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => openBusinessProfile(f.business_id)}
                    className="flex items-center gap-3 text-left min-w-0"
                  >
                    <BusinessAvatar
                      photoUrl={biz?.logoDataUrl}
                      initials={biz?.logoInitials || displayName.slice(0, 2).toUpperCase()}
                      color={biz?.logoColor || '#0A4D2E'}
                      name={displayName}
                      className="w-11 h-11 rounded-lg"
                      textClassName="text-xs"
                    />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-neutral-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {biz ? `${biz.city}, ${biz.country} · ${biz.category}` : 'Business Partner'}
                      </p>
                      {biz && (
                        <p
                          className={`text-[11px] mt-0.5 ${
                            presence.isOnline ? 'text-[#0A4D2E] font-semibold' : 'text-neutral-500'
                          }`}
                        >
                          {presence.label}
                        </p>
                      )}
                    </div>
                  </button>
                  {biz && (
                    <button
                      type="button"
                      onClick={() => toggleFollowBusiness(biz)}
                      className="px-3 py-1.5 rounded-lg bg-[#F3F5F4] text-neutral-700 text-xs font-semibold hover:bg-neutral-200"
                    >
                      Following
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'views' && (
        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
          {profileViews.length === 0 ? (
            <div className="p-8 text-center">
              <Eye className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-neutral-900">Profile View Analytics</p>
              <p className="text-xs text-neutral-500 mt-1">
                When other business owners visit your SwayPalm profile, they appear here in real time.
              </p>
            </div>
          ) : (
            profileViews.map((pv) => {
              const viewerBiz = getBusinessByUserId(pv.viewer_user_id);
              const viewerLabel =
                viewerBiz?.name ||
                getDisplayOwnerName(pv.viewer_user_id, null, 'SwayPalm Partner');
              const viewerLoc = viewerBiz ? `${viewerBiz.city}, ${viewerBiz.country}` : 'Global visitor';
              return (
                <div key={pv.view_id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-neutral-900">{viewerLabel}</p>
                    <p className="text-xs text-neutral-500">
                      {viewerLoc} · Viewed {formatTimeAgo(pv.viewedAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const SavedPostsView: React.FC = () => {
  const { userProfile, posts, toggleSavePost, openBusinessProfile, getDisplayBusinessName } =
    useSwayPalm();
  const savedIds = userProfile?.savedPostIds || [];
  const savedPosts = posts.filter((p) => savedIds.includes(p.post_id));

  return (
    <div className="space-y-5">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
        <h1 className="font-display font-bold text-xl text-neutral-900">Saved Business Offers</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Posts and wholesale offers you bookmarked for follow-up.
        </p>
      </div>

      {savedPosts.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center">
          <Bookmark className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="font-semibold text-sm text-neutral-900">No saved posts yet</p>
          <p className="text-xs text-neutral-500 mt-1">
            Click Save on any post in the Home Feed to keep supplier offers handy.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedPosts.map((post) => (
            <div key={post.post_id} className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openBusinessProfile(post.business_id)}
                  className="font-display font-bold text-sm text-[#0A4D2E] hover:underline"
                >
                  {getDisplayBusinessName(post.business_id, post.user_id)}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSavePost(post.post_id)}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                >
                  Remove
                </button>
              </div>
              <p className="text-sm text-neutral-800 mt-2">{post.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const NotificationsView: React.FC = () => {
  const {
    firebaseUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActivePage,
    setShowAuthModal,
    setAuthMode,
  } = useSwayPalm();

  if (!firebaseUser) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center">
        <Bell className="w-9 h-9 text-neutral-300 mx-auto mb-3" />
        <h1 className="font-display font-bold text-lg text-neutral-900">Notifications</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Sign in free to receive real-time alerts for new followers, messages, orders, comments, and advert approvals.
        </p>
        <button
          type="button"
          onClick={() => {
            setAuthMode('register');
            setShowAuthModal(true);
          }}
          className="mt-4 px-5 py-2.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
        >
          Join Free
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-neutral-900">Notifications</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            New followers, messages, marketplace orders, comments, and advert updates.
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="px-3.5 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-[#0A4D2E]" />
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            You are all caught up. Activity alerts will appear here automatically.
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.notification_id}
              type="button"
              onClick={() => {
                void markNotificationRead(n.notification_id);
                if (n.targetTab) setActivePage(n.targetTab);
              }}
              className={`w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-[#FAFBFB] transition-colors ${
                !n.read ? 'bg-[#0A4D2E]/5' : ''
              }`}
            >
              <div>
                <p className="font-display font-bold text-sm text-neutral-900">{n.title}</p>
                <p className="text-xs text-neutral-600 mt-0.5">{n.body}</p>
                <p className="text-[11px] text-neutral-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
              </div>
              {!n.read && (
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37] text-[#111915] text-[10px] font-bold shrink-0">
                  Unread
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
