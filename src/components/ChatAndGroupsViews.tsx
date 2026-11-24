import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Mic,
  Phone,
  Plus,
  Send,
  Square,
  UserPlus,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import {
  Business,
  BusinessGroup,
  ChatMessage,
  GroupMember,
  GroupPost,
} from '../types';
import { deterministicUuid } from '../lib/ids';
import { formatTimeAgo, getBusinessPresence, resizeImageFileToDataUrl } from '../data/sampleCatalog';
import { BusinessAvatar } from './BrandMark';
import { MediaArtwork } from './MediaArtwork';

export const ChatView: React.FC = () => {
  const {
    firebaseUser,
    userUuid,
    userProfile,
    businesses,
    myBusiness,
    chats,
    friendships,
    nowMs,
    activeChatId,
    setActiveChatId,
    setActivePage,
    getBusinessByUserId,
    getDisplayBusinessName,
    getDisplayOwnerName,
    toggleOnlineStatusVisibility,
    startDirectChat,
    createGroupChat,
    subscribeToChatMessages,
    sendChatMessage,
    markChatRead,
    startCall,
    setShowAuthModal,
    setAuthMode,
    notifyToast,
  } = useSwayPalm();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [rosterTab, setRosterTab] = useState<'friends' | 'online' | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recordSecRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const myUserId = userProfile?.id || userUuid || '';
  const activeChat = chats.find((c) => c.chat_id === activeChatId) || chats[0] || null;

  const acceptedFriendships = friendships.filter((f) => f.status === 'accepted');
  const acceptedFriendUserIds = new Set(
    acceptedFriendships
      .flatMap((f) => f.participant_user_ids)
      .filter((uid) => uid !== myUserId)
  );

  const friendRosterItems = acceptedFriendships
    .map((fr) => {
      const isRequester = fr.requester_id === myUserId;
      const partnerUserId = isRequester ? fr.recipient_id : fr.requester_id;
      if (!partnerUserId || partnerUserId === myUserId) return null;
      const matchedBiz = getBusinessByUserId(partnerUserId);
      const fallbackName = getDisplayBusinessName(
        null,
        partnerUserId,
        getDisplayOwnerName(partnerUserId, null, 'Business Friend')
      );
      const biz: Business = matchedBiz || {
        business_id: deterministicUuid(`swaypalm:fallback_biz:${partnerUserId}`),
        user_id: partnerUserId,
        auth_uid: isRequester ? fr.recipient_auth_uid : fr.requester_auth_uid,
        name: fallbackName,
        category: 'Services',
        country: '',
        city: 'Global',
        tagline: '',
        rating: 5,
        reviewCount: 0,
        followersCount: 0,
        viewsCount: 0,
        status: 'active',
        plan: 'free',
        verified: false,
        logoColor: '#0A4D2E',
        logoInitials: fallbackName.slice(0, 2).toUpperCase(),
        coverTheme: 'hero_trade',
        createdAt: fr.createdAt,
        updatedAt: fr.updatedAt,
      };
      return {
        business: biz,
        isFriend: true,
        presence: getBusinessPresence(matchedBiz, nowMs),
      };
    })
    .filter((item): item is { business: Business; isFriend: boolean; presence: ReturnType<typeof getBusinessPresence> } => Boolean(item))
    .sort((a, b) => {
      if (a.presence.isOnline !== b.presence.isOnline) return a.presence.isOnline ? -1 : 1;
      if (a.presence.lastSeenMs !== b.presence.lastSeenMs) {
        return b.presence.lastSeenMs - a.presence.lastSeenMs;
      }
      return a.business.name.localeCompare(b.business.name);
    });

  const onlineFriendCount = friendRosterItems.filter((item) => item.presence.isOnline).length;

  const onlinePartnerItems = businesses
    .filter((b) => b.business_id !== myBusiness?.business_id)
    .map((b) => ({
      business: b,
      isFriend: acceptedFriendUserIds.has(b.user_id),
      presence: getBusinessPresence(b, nowMs),
    }))
    .filter((item) => item.presence.isOnline)
    .sort((a, b) => {
      if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
      return b.presence.lastSeenMs - a.presence.lastSeenMs;
    });

  const activeRosterTab = rosterTab ?? (friendRosterItems.length > 0 ? 'friends' : 'online');
  const visibleRosterItems =
    activeRosterTab === 'friends' ? friendRosterItems : onlinePartnerItems;

  const getThreadPresence = (thread: typeof activeChat) => {
    if (!thread || !myUserId) return null;
    if (thread.type === 'direct') {
      const otherUid = thread.participant_user_ids.find((id) => id !== myUserId);
      const otherBiz = getBusinessByUserId(otherUid);
      return getBusinessPresence(otherBiz, nowMs);
    }
    const onlineMembers = thread.participant_user_ids.filter((uid) => {
      if (uid === myUserId) return false;
      const biz = getBusinessByUserId(uid);
      return getBusinessPresence(biz, nowMs).isOnline;
    }).length;
    return {
      isOnline: onlineMembers > 0,
      hidden: false,
      label:
        onlineMembers > 0
          ? `${thread.participant_user_ids.length} participants · ${onlineMembers} online`
          : `${thread.participant_user_ids.length} participants`,
      shortLabel: onlineMembers > 0 ? `${onlineMembers} online` : 'Group',
      lastSeenMs: 0,
    };
  };

  const getDirectChatBusiness = (thread: typeof activeChat) => {
    if (!thread || !myUserId || thread.type !== 'direct') return undefined;
    const otherUid = thread.participant_user_ids.find((id) => id !== myUserId);
    return getBusinessByUserId(otherUid);
  };

  const getThreadTitle = (thread: typeof activeChat) => {
    if (!thread) return 'Direct Chat';
    if (thread.type === 'direct') {
      const peerUid = thread.participant_user_ids.find((id) => id !== myUserId);
      return (
        getBusinessByUserId(peerUid)?.name ||
        getDisplayBusinessName(null, peerUid, getDisplayOwnerName(peerUid, null, 'Direct Chat'))
      );
    }
    return thread.name || 'Group Chat';
  };

  const activeThreadPresence = getThreadPresence(activeChat);
  const activeDirectBiz = getDirectChatBusiness(activeChat);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    void markChatRead(activeChat);
    const unsub = subscribeToChatMessages(activeChat.chat_id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeChat?.chat_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current.stop();
        } catch {
          // ignore cleanup errors
        }
        mediaRecorderRef.current = null;
      }
    };
  }, []);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !textInput.trim()) return;
    const msg = textInput;
    setTextInput('');
    await sendChatMessage(activeChat, { type: 'text', text: msg });
  };

  const handleSendPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChat) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 760);
      await sendChatMessage(activeChat, { type: 'photo', mediaDataUrl: dataUrl });
    } catch {
      notifyToast('Could not attach image.', 'error');
    }
  };

  const startVoiceNote = async () => {
    if (!activeChat) return;
    setRecording(true);
    setRecordSec(1);
    recordSecRef.current = 1;
    timerRef.current = window.setInterval(() => {
      setRecordSec((s) => {
        const next = s + 1;
        recordSecRef.current = next;
        return next;
      });
    }, 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const capturedSec = Math.max(1, recordSecRef.current);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0 && blob.size < 300000) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            await sendChatMessage(activeChat, {
              type: 'voice',
              mediaDataUrl: String(reader.result),
              voiceDurationSec: capturedSec,
            });
          };
          reader.readAsDataURL(blob);
        } else {
          await sendChatMessage(activeChat, {
            type: 'voice',
            text: 'Voice note recorded',
            voiceDurationSec: capturedSec,
          });
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
    } catch {
      // Microphone not available -> still allows timed voice memo send
      mediaRecorderRef.current = null;
    }
  };

  const stopVoiceNote = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const dur = Math.max(1, recordSecRef.current || recordSec);
    setRecording(false);
    setRecordSec(0);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } else if (activeChat) {
      await sendChatMessage(activeChat, {
        type: 'voice',
        text: 'Voice message',
        voiceDurationSec: dur,
      });
    }
  };

  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = businesses.filter((b) => selectedBizIds.includes(b.business_id));
    await createGroupChat(groupName, selected);
    setShowNewGroupModal(false);
    setGroupName('');
    setSelectedBizIds([]);
  };

  if (!firebaseUser) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center max-w-xl mx-auto">
        <h1 className="font-display font-bold text-xl text-neutral-900">
          Real-Time Business Messenger
        </h1>
        <p className="text-sm text-neutral-600 mt-2">
          Sign in free to negotiate deals, share product photos, and send voice notes in 1-to-1 and group chats.
        </p>
        <button
          type="button"
          onClick={() => {
            setAuthMode('register');
            setShowAuthModal(true);
          }}
          className="mt-5 px-5 py-2.5 rounded-lg bg-[#0A4D2E] text-white text-sm font-semibold"
        >
          Join Free to Start Chatting
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar of Chat Menu: Friends & Online Statuses */}
      <section className="bg-white border border-neutral-200 rounded-xl p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="font-display font-bold text-sm text-neutral-900">
              Friends &amp; Online Status
            </h2>
            <span className="text-xs font-mono font-semibold text-[#0A4D2E] bg-[#0A4D2E]/8 px-2 py-0.5 rounded-md tabular-nums">
              {onlineFriendCount} online · {friendRosterItems.length} friends
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-0.5 bg-[#F3F5F4] rounded-lg border border-neutral-200">
              <button
                type="button"
                onClick={() => setRosterTab('friends')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  activeRosterTab === 'friends'
                    ? 'bg-white text-[#0A4D2E] shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Friends ({friendRosterItems.length})
              </button>
              <button
                type="button"
                onClick={() => setRosterTab('online')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  activeRosterTab === 'online'
                    ? 'bg-white text-[#0A4D2E] shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Online Now ({onlinePartnerItems.length})
              </button>
            </div>

            {myBusiness && (
              <button
                type="button"
                onClick={() => void toggleOnlineStatusVisibility()}
                title="Toggle your online visibility"
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  myBusiness.showOnlineStatus === false
                    ? 'border-neutral-300 bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
                    : 'border-[#0A4D2E]/30 bg-[#0A4D2E]/8 text-[#0A4D2E] hover:bg-[#0A4D2E]/15'
                }`}
              >
                {myBusiness.showOnlineStatus === false ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Status: Hidden</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Status: Online</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActivePage('friends')}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#0A4D2E]" />
              <span className="hidden sm:inline">Add Friends</span>
            </button>
          </div>
        </div>

        {visibleRosterItems.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs text-neutral-500">
            <span>
              {activeRosterTab === 'friends'
                ? 'No accepted friends yet. Connect with business owners to track their online status and message them anytime.'
                : 'No business partners are currently online.'}
            </span>
            <button
              type="button"
              onClick={() => setActivePage('friends')}
              className="font-semibold text-[#0A4D2E] hover:underline whitespace-nowrap"
            >
              Browse Friends &amp; Network
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {visibleRosterItems.map(({ business: partner, isFriend, presence }) => {
              const isActivePartner =
                activeChat?.type === 'direct' &&
                activeChat.participant_user_ids.includes(partner.user_id);
              return (
                  <button
                    key={partner.user_id}
                    type="button"
                    onClick={() => {
                      setMobileShowThread(true);
                      void startDirectChat(partner);
                    }}
                    title={`${partner.name} · ${presence.label}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border shrink-0 text-left transition-colors ${
                    isActivePartner
                      ? 'border-[#0A4D2E] bg-[#0A4D2E]/8'
                      : 'border-neutral-200 bg-[#FAFBFB] hover:bg-[#F3F5F4]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <BusinessAvatar
                      photoUrl={partner.logoDataUrl}
                      initials={partner.logoInitials}
                      color={partner.logoColor}
                      name={partner.name}
                      className="w-9 h-9 rounded-full"
                      textClassName="text-[11px]"
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                        presence.isOnline
                          ? 'bg-emerald-500'
                          : presence.hidden
                            ? 'bg-neutral-300'
                            : 'bg-neutral-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 max-w-[140px]">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {partner.name}
                      </p>
                      {isFriend && activeRosterTab === 'online' && (
                        <span className="text-[10px] font-semibold text-[#0A4D2E] bg-[#0A4D2E]/10 px-1.5 py-0.5 rounded shrink-0">
                          Friend
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        presence.isOnline ? 'text-[#0A4D2E] font-semibold' : 'text-neutral-500'
                      }`}
                    >
                      {presence.isOnline ? 'Online now' : presence.shortLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px] md:h-[72vh]">
      {/* Thread List */}
      <div className={`md:col-span-4 border-b md:border-b-0 md:border-r border-neutral-200 flex-col ${mobileShowThread && activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-base text-neutral-900">Messages</h1>
            <p className="text-[11px] text-[#0A4D2E] font-medium">
              Connected · Real-time sync
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewGroupModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New Group
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {chats.length === 0 ? (
            <div className="p-4 space-y-3">
              <p className="text-xs text-neutral-500">
                No conversations yet. Start a 1-to-1 chat with any global partner:
              </p>
              {businesses
                .filter((b) => b.business_id !== myBusiness?.business_id)
                .slice(0, 6)
                .map((b) => {
                  const p = getBusinessPresence(b, nowMs);
                  return (
                    <button
                      key={b.business_id}
                      type="button"
                      onClick={() => {
                        setMobileShowThread(true);
                        void startDirectChat(b);
                      }}
                      className="w-full flex items-center justify-between gap-2.5 p-2 rounded-lg hover:bg-[#F3F5F4] text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BusinessAvatar
                          photoUrl={b.logoDataUrl}
                          initials={b.logoInitials}
                          color={b.logoColor}
                          name={b.name}
                          className="w-8 h-8 rounded-full"
                          textClassName="text-[11px]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 truncate">{b.name}</p>
                          <p
                            className={`text-[11px] truncate ${
                              p.isOnline ? 'text-[#0A4D2E] font-medium' : 'text-neutral-500'
                            }`}
                          >
                            {p.label}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0A4D2E] shrink-0">Chat</span>
                    </button>
                  );
                })}
            </div>
          ) : (
            chats.map((thread) => {
              const unread = thread.unread_by?.includes(myUserId);
              const isSelected = activeChat?.chat_id === thread.chat_id;
              const threadPresence = getThreadPresence(thread);
              const directBiz = getDirectChatBusiness(thread);
              const threadTitle = getThreadTitle(thread);
              return (
                <button
                  key={thread.chat_id}
                  type="button"
                  onClick={() => {
                    setActiveChatId(thread.chat_id);
                    setMobileShowThread(true);
                  }}
                  className={`w-full p-3.5 text-left flex items-start justify-between gap-2.5 transition-colors ${
                    isSelected ? 'bg-[#0A4D2E]/8' : 'hover:bg-[#F3F5F4]'
                  }`}
                >
                  {thread.type === 'direct' ? (
                    <div className="relative shrink-0 mt-0.5">
                      <BusinessAvatar
                        photoUrl={directBiz?.logoDataUrl}
                        initials={directBiz?.logoInitials || threadTitle.slice(0, 2).toUpperCase()}
                        color={directBiz?.logoColor || '#0A4D2E'}
                        name={directBiz?.name || threadTitle}
                        className="w-9 h-9 rounded-full"
                        textClassName="text-xs"
                      />
                      {threadPresence && (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                            threadPresence.isOnline ? 'bg-emerald-500' : 'bg-neutral-400'
                          }`}
                        />
                      )}
                    </div>
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-[#0A4D2E]/12 text-[#0A4D2E] flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-900 truncate">
                        {threadTitle}
                      </span>
                      {thread.type === 'group' && (
                        <Users className="w-3.5 h-3.5 text-[#0A4D2E] shrink-0" />
                      )}
                    </div>
                    {threadPresence && (
                      <p
                        className={`text-[11px] mt-0.5 truncate ${
                          threadPresence.isOnline ? 'text-[#0A4D2E] font-medium' : 'text-neutral-500'
                        }`}
                      >
                        {threadPresence.label}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {thread.lastMessage || 'Open conversation'}
                    </p>
                  </div>
                  {unread && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#D4AF37] text-[#111915] text-[10px] font-bold">
                      New
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Chat Pane */}
      <div className={`md:col-span-8 flex-col bg-[#FAFBFB] ${mobileShowThread || !activeChat ? 'flex' : 'hidden md:flex'}`}>
        {activeChat ? (
          <>
            <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-neutral-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to messages"
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-neutral-600 hover:bg-neutral-100 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {activeChat.type === 'direct' ? (
                  <div className="relative shrink-0">
                    <BusinessAvatar
                      photoUrl={activeDirectBiz?.logoDataUrl}
                      initials={
                        activeDirectBiz?.logoInitials ||
                        getThreadTitle(activeChat).slice(0, 2).toUpperCase()
                      }
                      color={activeDirectBiz?.logoColor || '#0A4D2E'}
                      name={getThreadTitle(activeChat)}
                      className="w-9 h-9 rounded-full"
                      textClassName="text-xs"
                    />
                    {activeThreadPresence && (
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          activeThreadPresence.isOnline ? 'bg-emerald-500' : 'bg-neutral-400'
                        }`}
                      />
                    )}
                  </div>
                ) : (
                  <span className="w-9 h-9 rounded-full bg-[#0A4D2E]/12 text-[#0A4D2E] flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-sm text-neutral-900 truncate">
                    {getThreadTitle(activeChat)}
                  </h2>
                  <p
                    className={`text-[11px] ${
                      activeThreadPresence?.isOnline
                        ? 'text-[#0A4D2E] font-semibold'
                        : 'text-neutral-500'
                    }`}
                  >
                    {activeThreadPresence?.label || `${activeChat.participant_user_ids.length} participants`}
                  </p>
                </div>
              </div>

              {activeChat.type === 'direct' && activeDirectBiz && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void startCall(activeDirectBiz, 'audio', activeChat.chat_id)}
                    aria-label={`Audio call ${activeDirectBiz.name}`}
                    className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#0A4D2E]" />
                    <span className="hidden sm:inline">Audio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void startCall(activeDirectBiz, 'video', activeChat.chat_id)}
                    aria-label={`Video call ${activeDirectBiz.name}`}
                    className="px-3 py-2 rounded-lg bg-[#0A4D2E] text-white hover:bg-[#083D24] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {messages.map((m) => {
                const isMe = m.sender_id === myUserId;
                const senderLabel = isMe
                  ? 'You'
                  : getDisplayBusinessName(
                      null,
                      m.sender_id,
                      getDisplayOwnerName(m.sender_id, null, 'Partner')
                    );
                return (
                  <div
                    key={m.message_id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-neutral-500 mb-1 px-1">
                      {senderLabel} · {formatTimeAgo(m.createdAt)}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
                        isMe
                          ? 'bg-[#0A4D2E] text-white'
                          : 'bg-white border border-neutral-200 text-neutral-900'
                      }`}
                    >
                      {m.type === 'photo' && m.mediaDataUrl && (
                        <img
                          src={m.mediaDataUrl}
                          alt="Chat attachment"
                          className="max-h-56 rounded-lg object-cover mb-1"
                        />
                      )}
                      {m.type === 'voice' && (
                        <div className="flex items-center gap-2.5 py-0.5">
                          <Volume2 className="w-4 h-4 shrink-0" />
                          {m.mediaDataUrl ? (
                            <audio controls src={m.mediaDataUrl} className="h-8 max-w-[200px]" />
                          ) : (
                            <span className="text-xs font-mono tabular-nums">
                              Voice Note · 0:{String(m.voiceDurationSec || 3).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      )}
                      {m.text && <p className="leading-relaxed">{m.text}</p>}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSendText}
              className="p-3 sm:p-4 bg-white border-t border-neutral-200 flex items-center gap-2"
            >
              <label className="cursor-pointer p-2 rounded-lg text-neutral-600 hover:bg-neutral-100">
                <ImageIcon className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleSendPhoto} className="hidden" />
              </label>

              {recording ? (
                <button
                  type="button"
                  onClick={stopVoiceNote}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  Stop ({recordSec}s)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startVoiceNote}
                  title="Record Voice Note"
                  className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}

              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Write a business message..."
                className="flex-1 px-3.5 py-2 text-sm bg-[#F3F5F4] rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A4D2E]"
              />

              <button
                type="submit"
                disabled={!textInput.trim()}
                className="p-2.5 rounded-lg bg-[#0A4D2E] text-white hover:bg-[#083D24] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <p className="font-display font-bold text-base text-neutral-900">
              Select a conversation or start a new one
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Message any business directly from Explore, Marketplace, or create a group chat for your suppliers.
            </p>
          </div>
        )}
      </div>

      {/* New Group Chat Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base text-neutral-900">
                Create Group Chat
              </h3>
              <button type="button" onClick={() => setShowNewGroupModal(false)}>
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleCreateGroupChat} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Group Chat Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Dubai–Nairobi Air Cargo Partners"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Select Businesses to Add
                </label>
                <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100">
                  {businesses
                    .filter((b) => b.business_id !== myBusiness?.business_id)
                    .map((b) => {
                      const checked = selectedBizIds.includes(b.business_id);
                      return (
                        <label
                          key={b.business_id}
                          className="flex items-center gap-2.5 p-2.5 text-xs cursor-pointer hover:bg-neutral-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedBizIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== b.business_id)
                                  : [...prev, b.business_id]
                              )
                            }
                          />
                          <span className="font-semibold text-neutral-900">{b.name}</span>
                          <span className="text-neutral-500 ml-auto">{b.country}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
              >
                Create Group Chat
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export const GroupsView: React.FC = () => {
  const {
    firebaseUser,
    userUuid,
    userProfile,
    groups,
    joinedGroupIds,
    getBusinessByUserId,
    getDisplayOwnerName,
    createGroup,
    toggleJoinGroup,
    loadGroupDetails,
    postInGroup,
  } = useSwayPalm();

  const [selectedGroup, setSelectedGroup] = useState<BusinessGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupPosts, setGroupPosts] = useState<GroupPost[]>([]);
  const [postText, setPostText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Import & Export');
  const [location, setLocation] = useState('Global');
  const [description, setDescription] = useState('');

  const openGroup = async (group: BusinessGroup) => {
    setSelectedGroup(group);
    const details = await loadGroupDetails(group.group_id);
    setMembers(details.members);
    setGroupPosts(details.posts);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    await createGroup({ name, description, category, location });
    setShowCreateModal(false);
    setName('');
    setDescription('');
  };

  const handlePostInGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !postText.trim()) return;
    await postInGroup(selectedGroup.group_id, postText);
    setGroupPosts((prev) => [
      {
        group_post_id: `gp_${Date.now()}`,
        group_id: selectedGroup.group_id,
        user_id: userProfile?.id || userUuid || 'me',
        auth_uid: firebaseUser?.uid || 'me',
        content: postText,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setPostText('');
  };

  if (selectedGroup) {
    const isJoined = joinedGroupIds.has(selectedGroup.group_id);
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedGroup(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Groups
        </button>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <MediaArtwork
            theme={selectedGroup.coverTheme}
            title={selectedGroup.name}
            subtitle={`${selectedGroup.category} · ${selectedGroup.location || 'Global'}`}
            aspectClass="aspect-[21/7] min-h-[150px]"
          />
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-xl text-neutral-900">
                {selectedGroup.name}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
                {selectedGroup.membersCount.toLocaleString()} members · {selectedGroup.location}
              </p>
              <p className="text-sm text-neutral-700 mt-2">{selectedGroup.description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleJoinGroup(selectedGroup)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold shrink-0 ${
                isJoined
                  ? 'bg-[#F3F5F4] text-neutral-800'
                  : 'bg-[#0A4D2E] text-white hover:bg-[#083D24]'
              }`}
            >
              {isJoined ? 'Joined' : 'Join Group'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            <form
              onSubmit={handlePostInGroup}
              className="bg-white border border-neutral-200 rounded-xl p-4 flex gap-2"
            >
              <input
                type="text"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder={`Share an update in ${selectedGroup.name}...`}
                className="flex-1 px-3 py-2 text-sm bg-[#F3F5F4] rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A4D2E]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
              >
                Post
              </button>
            </form>

            {groupPosts.map((gp) => (
              <div key={gp.group_post_id} className="bg-white border border-neutral-200 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-900">
                    {getBusinessByUserId(gp.user_id)?.name ||
                      getDisplayOwnerName(gp.user_id, null, 'Member')}
                  </span>
                  <span className="text-neutral-500">{formatTimeAgo(gp.createdAt)}</span>
                </div>
                <p className="text-sm text-neutral-800 mt-2">{gp.content}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl p-4 h-fit">
            <h3 className="font-display font-bold text-sm text-neutral-900 mb-3">
              Members ({members.length})
            </h3>
            <div className="space-y-2.5">
              {members.map((m) => (
                <div key={m.user_id} className="text-xs border-b border-neutral-100 pb-2 last:border-0">
                  <p className="font-semibold text-neutral-900">
                    {getDisplayOwnerName(m.user_id, null, 'Member')}
                  </p>
                  <p className="text-neutral-500">
                    {getBusinessByUserId(m.user_id)?.name || m.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
            Business Groups & Trade Communities
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Join regional and industry communities like Women in Business Kenya, Tourism in Diani, and Importers Worldwide.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((grp) => {
          const isJoined = joinedGroupIds.has(grp.group_id);
          return (
            <div
              key={grp.group_id}
              className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <button
                  type="button"
                  onClick={() => openGroup(grp)}
                  className="w-full text-left block"
                >
                  <MediaArtwork theme={grp.coverTheme} aspectClass="aspect-[16/7]" />
                </button>
                <div className="p-4">
                  <p className="text-[11px] font-medium text-[#0A4D2E]">
                    {grp.category} · {grp.location}
                  </p>
                  <button
                    type="button"
                    onClick={() => openGroup(grp)}
                    className="text-left block mt-1"
                  >
                    <h3 className="font-display font-bold text-base text-neutral-900 hover:text-[#0A4D2E]">
                      {grp.name}
                    </h3>
                  </button>
                  <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2">
                    {grp.description}
                  </p>
                  <p className="text-xs text-neutral-500 mt-3 tabular-nums">
                    {grp.membersCount.toLocaleString()} members
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openGroup(grp)}
                  className="flex-1 py-2 px-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  Open Feed
                </button>
                <button
                  type="button"
                  onClick={() => toggleJoinGroup(grp)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    isJoined
                      ? 'bg-[#F3F5F4] text-neutral-800'
                      : 'bg-[#0A4D2E] text-white hover:bg-[#083D24]'
                  }`}
                >
                  {isJoined ? 'Joined' : 'Join Group'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-base text-neutral-900">
                Create Business Group
              </h2>
              <button type="button" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group Name (e.g. Mombasa Exporters Hub)"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City / Country"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe who should join and what deals or insights are shared..."
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
