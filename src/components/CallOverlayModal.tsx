import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneIncoming,
  PhoneOff,
  ShieldCheck,
  Video,
  VideoOff,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { BusinessAvatar, VerifiedBadge } from './BrandMark';

function formatCallDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const CallOverlayModal: React.FC = () => {
  const {
    userUuid,
    userProfile,
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    callConnectionState,
    isMicMuted,
    isCameraEnabled,
    callElapsedSec,
    callMediaNotice,
    getBusinessById,
    getBusinessByUserId,
    getDisplayBusinessName,
    getDisplayOwnerName,
    acceptIncomingCall,
    declineIncomingCall,
    endCurrentCall,
    toggleMicMute,
    toggleCameraVideo,
    settingPrefs,
  } = useSwayPalm();

  const [minimized, setMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Reset minimized state whenever a new call session starts or ends
  useEffect(() => {
    if (!activeCall) {
      setMinimized(false);
    }
  }, [activeCall?.call_id]);

  // Attach local camera stream to preview video element
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = localStream || null;
  }, [localStream, activeCall?.call_id, minimized, isCameraEnabled]);

  // Attach remote video stream to stage video element
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = remoteStream || null;
  }, [remoteStream, activeCall?.call_id, minimized]);

  // Keep dedicated hidden <audio> bound so remote audio persists even if minimized
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;
    audioEl.srcObject = remoteStream || null;
  }, [remoteStream, activeCall?.call_id]);

  // Subtle Web Audio chime while an incoming call is ringing
  useEffect(() => {
    if (!incomingCall || activeCall || !settingPrefs.ringtoneEnabled) return;
    let ctx: AudioContext | null = null;

    const playChime = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!ctx) ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        [523.25, 659.25].forEach((freq, idx) => {
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.16);
          gain.gain.setValueAtTime(0.001, now + idx * 0.16);
          gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.16 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.16);
          osc.stop(now + idx * 0.16 + 0.3);
        });
      } catch {
        // Ignore audio context autoplay restrictions cleanly
      }
    };

    playChime();
    const timer = window.setInterval(playChime, 2600);
    return () => {
      window.clearInterval(timer);
      if (ctx) {
        ctx.close().catch(() => {});
      }
    };
  }, [incomingCall?.call_id, Boolean(activeCall), settingPrefs.ringtoneEnabled]);

  // 1. Incoming Call Banner / Modal (when no active call is open)
  if (incomingCall && !activeCall) {
    const callerBiz =
      getBusinessById(incomingCall.caller_business_id) ||
      getBusinessByUserId(incomingCall.caller_user_id);
    const callerName =
      callerBiz?.name ||
      getDisplayBusinessName(
        incomingCall.caller_business_id,
        incomingCall.caller_user_id,
        getDisplayOwnerName(incomingCall.caller_user_id, null, 'Business Caller')
      );
    const callerInitials =
      callerBiz?.logoInitials || callerName.slice(0, 2).toUpperCase();

    return (
      <div
        role="dialog"
        aria-label="Incoming business call"
        className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#0D1410] text-white border border-[#D4AF37]/50 rounded-2xl shadow-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <BusinessAvatar
            photoUrl={callerBiz?.logoDataUrl}
            initials={callerInitials}
            color={callerBiz?.logoColor || '#0A4D2E'}
            name={callerName}
            className="w-12 h-12 rounded-xl ring-2 ring-[#D4AF37]/60"
            textClassName="text-sm"
          />
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#D4AF37]">
              <PhoneIncoming className="w-3.5 h-3.5" />
              <span>
                Incoming {incomingCall.callType === 'video' ? 'Video' : 'Audio'} Call
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="font-display font-bold text-base truncate">
                {callerName}
              </p>
              {callerBiz?.verified && (
                <VerifiedBadge plan={callerBiz.plan} className="w-4 h-4 shrink-0" />
              )}
            </div>
            {callerBiz && (
              <p className="text-xs text-neutral-300 truncate">
                {callerBiz.category} · {callerBiz.city}, {callerBiz.country}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void declineIncomingCall()}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </button>

          {incomingCall.callType === 'video' && (
            <button
              type="button"
              onClick={() => void acceptIncomingCall(false)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              title="Answer with audio only"
            >
              <Phone className="w-4 h-4" />
              Audio
            </button>
          )}

          <button
            type="button"
            onClick={() => void acceptIncomingCall(incomingCall.callType === 'video')}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#0A4D2E] hover:bg-[#0C5E38] border border-[#D4AF37]/50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {incomingCall.callType === 'video' ? (
              <Video className="w-4 h-4 text-[#D4AF37]" />
            ) : (
              <Phone className="w-4 h-4 text-[#D4AF37]" />
            )}
            Accept
          </button>
        </div>
      </div>
    );
  }

  if (!activeCall) return null;

  const myUserId = userProfile?.id || userUuid;
  const isCaller = Boolean(myUserId && activeCall.caller_user_id === myUserId);
  const remoteBizId = isCaller ? activeCall.callee_business_id : activeCall.caller_business_id;
  const remoteUserId = isCaller ? activeCall.callee_user_id : activeCall.caller_user_id;
  const remoteBiz =
    getBusinessById(remoteBizId) || getBusinessByUserId(remoteUserId);
  const remoteName =
    remoteBiz?.name ||
    getDisplayBusinessName(
      remoteBizId,
      remoteUserId,
      getDisplayOwnerName(remoteUserId, null, 'Business Partner')
    );
  const remoteInitials =
    remoteBiz?.logoInitials || remoteName.slice(0, 2).toUpperCase();

  const hasRemoteVideo = Boolean(
    remoteStream &&
      remoteStream.getVideoTracks().some((track) => track.readyState === 'live')
  );
  const hasLocalVideo = Boolean(
    isCameraEnabled &&
      localStream &&
      localStream.getVideoTracks().some((track) => track.enabled)
  );

  const statusText =
    callConnectionState === 'ringing'
      ? 'Ringing…'
      : callConnectionState === 'connecting'
        ? 'Connecting…'
        : callConnectionState === 'preview'
          ? `Local Preview · ${formatCallDuration(callElapsedSec)}`
          : callConnectionState === 'connected'
            ? `${formatCallDuration(callElapsedSec)} · Connected`
            : 'Preparing call…';

  if (minimized) {
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay className="hidden" />
        <div
          role="region"
          aria-label="Minimized active call"
          className="fixed bottom-16 md:bottom-5 left-4 z-50 bg-[#0D1410] text-white border border-[#D4AF37]/50 rounded-2xl shadow-xl px-3.5 py-2.5 flex items-center gap-3 max-w-xs sm:max-w-sm"
        >
          <BusinessAvatar
            photoUrl={remoteBiz?.logoDataUrl}
            initials={remoteInitials}
            color={remoteBiz?.logoColor || '#0A4D2E'}
            name={remoteName}
            className="w-10 h-10 rounded-lg"
            textClassName="text-xs"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate">{remoteName}</p>
            <p className="text-[11px] text-[#D4AF37] tabular-nums truncate">
              {statusText}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleMicMute}
              aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isMicMuted ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMinimized(false)}
              aria-label="Expand call window"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void endCurrentCall()}
              aria-label="End call"
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={`${activeCall.callType === 'video' ? 'Video' : 'Audio'} call with ${remoteName}`}
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6"
    >
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      <div className="relative w-full max-w-2xl bg-[#0D1410] text-white border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A4D2E] text-[#D4AF37] text-[11px] font-bold whitespace-nowrap">
              {activeCall.callType === 'video' ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
              {activeCall.callType === 'video' ? 'Video Call' : 'Audio Call'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-neutral-300 tabular-nums truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              {statusText}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize call window"
            className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-neutral-200 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Minimize</span>
          </button>
        </div>

        {/* Media Notice */}
        {callMediaNotice && (
          <div className="px-4 py-2 bg-[#D4AF37]/15 border-b border-[#D4AF37]/30 text-[11px] text-[#F4D97C] text-center">
            {callMediaNotice}
          </div>
        )}

        {/* Main Video / Voice Stage */}
        <div className="relative h-[340px] sm:h-[420px] bg-gradient-to-b from-[#0D1410] via-[#0A4D2E]/35 to-[#0D1410] flex items-center justify-center overflow-hidden">
          {hasRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center text-center px-6">
              <BusinessAvatar
                photoUrl={remoteBiz?.logoDataUrl}
                initials={remoteInitials}
                color={remoteBiz?.logoColor || '#0A4D2E'}
                name={remoteName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-4 ring-[#D4AF37]/40 shadow-xl"
                textClassName="text-2xl"
              />
              <div className="flex items-center gap-1.5 mt-4">
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white">
                  {remoteName}
                </h2>
                {remoteBiz?.verified && (
                  <VerifiedBadge plan={remoteBiz.plan} className="w-5 h-5" />
                )}
              </div>
              {remoteBiz && (
                <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                  {remoteBiz.category} · {remoteBiz.city}, {remoteBiz.country}
                </p>
              )}
              <p className="mt-3 text-xs font-semibold text-[#D4AF37] tabular-nums">
                {statusText}
              </p>
            </div>
          )}

          {/* Local Camera PiP */}
          {hasLocalVideo && (
            <div className="absolute bottom-3 right-3 w-28 h-40 sm:w-36 sm:h-28 rounded-xl overflow-hidden border-2 border-[#D4AF37]/70 bg-black shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold bg-black/60 px-1.5 py-0.5 rounded text-white">
                You
              </span>
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="px-5 py-4 bg-[#0B120E] border-t border-white/10 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={toggleMicMute}
            aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isMicMuted
                ? 'bg-red-600/90 text-white hover:bg-red-600'
                : 'bg-white/12 text-white hover:bg-white/20'
            }`}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {activeCall.callType === 'video' && (
            <button
              type="button"
              onClick={() => void toggleCameraVideo()}
              aria-label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                !isCameraEnabled
                  ? 'bg-amber-600/90 text-white hover:bg-amber-600'
                  : 'bg-white/12 text-white hover:bg-white/20'
              }`}
            >
              {isCameraEnabled ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => void endCurrentCall()}
            aria-label="End call"
            title="End call"
            className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
