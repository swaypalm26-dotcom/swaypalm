import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  RefreshCw,
  Share,
  ShieldCheck,
  Smartphone,
  Terminal,
  WifiOff,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { getLiveAppUrl } from '../lib/urls';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Suppress floating/header install triggers when already running as an installed standalone app
  if (isInstalled && variant !== 'card') {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuideModal(true);
  };

  if (variant === 'card') {
    return (
      <>
        <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A4D2E]/10 text-[#0A4D2E] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900">
                SwayPalm Mobile & Desktop App
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                {isInstalled
                  ? 'Installed and running in standalone app mode with offline caching.'
                  : 'Install SwayPalm directly to your phone home screen or desktop for full-screen app launch and offline access.'}
              </p>
            </div>
          </div>

          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A4D2E] whitespace-nowrap shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              App Installed
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void handleInstallClick()}
              className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              Install App
            </button>
          )}
        </div>

        {showGuideModal && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />
        )}
      </>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="w-full py-2.5 px-3.5 rounded-xl bg-white border border-neutral-200 hover:border-[#0A4D2E]/40 text-left flex items-center gap-3 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-[#0A4D2E] text-[#D4AF37] flex items-center justify-center shrink-0">
            <Download className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-neutral-900 truncate">
              Install SwayPalm App
            </span>
            <span className="block text-[11px] text-neutral-500 truncate">
              {isInstallable ? 'Ready for 1-tap install' : 'Phone & desktop shortcut'}
            </span>
          </span>
        </button>

        {showGuideModal && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />
        )}
      </>
    );
  }

  // Header button: render when native prompt is ready or on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleInstallClick()}
        aria-label="Install SwayPalm App"
        className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#0A4D2E]/30 bg-[#0A4D2E]/8 hover:bg-[#0A4D2E] hover:text-white text-[#0A4D2E] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {showGuideModal && (
        <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />
      )}
    </>
  );
};

export const PlayStoreLaunchKitCard: React.FC = () => {
  const origin = getLiveAppUrl();
  const host = origin.replace(/^https?:\/\//i, '').split('/')[0];

  const [packageId, setPackageId] = useState('com.swaypalm.app');
  const [sha256, setSha256] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const normalizedPkg = packageId.trim() || 'com.swaypalm.app';
  const normalizedSha =
    sha256.trim() ||
    '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00';

  const bubblewrapCommands = [
    'npm install -g @bubblewrap/cli',
    `bubblewrap init --manifest ${origin}/manifest.json`,
    'bubblewrap build',
  ].join('\n');

  const downloadJsonFile = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTwaManifest = () => {
    downloadJsonFile('twa-manifest.json', {
      packageId: normalizedPkg,
      host,
      name: 'SwayPalm',
      launcherName: 'SwayPalm',
      display: 'standalone',
      themeColor: '#0B3D2E',
      themeColorDark: '#06311D',
      navigationColor: '#0B3D2E',
      navigationColorDark: '#06311D',
      navigationDividerColor: '#D4AF37',
      backgroundColor: '#0B3D2E',
      enableNotifications: true,
      startUrl: '/',
      iconUrl: `${origin}/pwa-512x512.png`,
      maskableIconUrl: `${origin}/pwa-maskable-512x512.png`,
      monochromeIconUrl: `${origin}/pwa-192x192.png`,
      splashScreenFadeOutDuration: 300,
      signingKey: {
        path: './android.keystore',
        alias: 'swaypalm',
      },
      appVersionName: '1.0.0',
      appVersionCode: 1,
      shortcuts: [],
      generatorApp: 'swaypalm-twa-kit',
      webManifestUrl: `${origin}/manifest.json`,
      fallbackType: 'customtabs',
      enableSiteSettingsShortcut: 'true',
      isChromeOSOnly: false,
      orientation: 'portrait-primary',
      fingerprints: sha256.trim() ? [{ value: sha256.trim() }] : [],
    });
  };

  const handleDownloadAssetLinks = () => {
    downloadJsonFile('assetlinks.json', [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: normalizedPkg,
          sha256_cert_fingerprints: [normalizedSha],
        },
      },
    ]);
  };

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard?.writeText(bubblewrapCommands);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // ignore clipboard fallback
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A4D2E] text-[#D4AF37] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-neutral-900">
              Google Play Store Launch Kit (Android TWA)
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
              SwayPalm serves a Play-ready Web Manifest, 512px maskable icons, Service Worker, and{' '}
              <code className="font-mono text-[11px] bg-[#F3F5F4] px-1.5 py-0.5 rounded">
                /.well-known/assetlinks.json
              </code>{' '}
              so you can wrap it as an Android App Bundle (.aab) via Trusted Web Activity and publish on Google Play Console.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A4D2E] whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          TWA Ready
        </span>
      </div>

      {/* Readiness Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {[
          { label: 'Web App Manifest', value: '/manifest.json' },
          { label: 'App Icons & Maskable', value: '192px & 512px PNG' },
          { label: 'Digital Asset Links', value: '/.well-known/assetlinks.json' },
          { label: 'Console Step', value: 'Upload signed .aab' },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-lg bg-[#F3F5F4] border border-neutral-200/70">
            <p className="text-[11px] text-neutral-500">{item.label}</p>
            <p className="font-semibold text-neutral-900 mt-0.5 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Package & Fingerprint Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Android Application ID (Package Name)
          </label>
          <input
            type="text"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            placeholder="com.swaypalm.app"
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono focus:outline-none focus:border-[#0A4D2E]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Play Console SHA-256 App Signing Fingerprint
          </label>
          <input
            type="text"
            value={sha256}
            onChange={(e) => setSha256(e.target.value)}
            placeholder="AA:BB:CC:... (from Play Console > App Integrity)"
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono focus:outline-none focus:border-[#0A4D2E]"
          />
        </div>
      </div>

      {/* Bubblewrap CLI Commands */}
      <div className="rounded-xl bg-[#111915] text-neutral-100 p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#D4AF37] inline-flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Generate Android .aab with Bubblewrap CLI
          </span>
          <button
            type="button"
            onClick={() => void handleCopyCommands()}
            className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-semibold inline-flex items-center gap-1 text-white"
          >
            {copiedCmd ? <Check className="w-3 h-3 text-[#D4AF37]" /> : <Copy className="w-3 h-3" />}
            {copiedCmd ? 'Copied' : 'Copy Commands'}
          </button>
        </div>
        <pre className="text-[11px] font-mono text-neutral-200 overflow-x-auto leading-relaxed">
          {bubblewrapCommands}
        </pre>
      </div>

      {/* Downloads & Asset Links verification */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTwaManifest}
            className="px-3.5 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            Download twa-manifest.json
          </button>
          <button
            type="button"
            onClick={handleDownloadAssetLinks}
            className="px-3.5 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download assetlinks.json
          </button>
          <a
            href="/.well-known/assetlinks.json"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0A4D2E] hover:underline"
          >
            Inspect Live Asset Links
          </a>
        </div>
        <span className="text-[11px] text-neutral-500">
          Set <code className="font-mono">PLAY_SHA256_FINGERPRINT</code> in env secrets after Play Console signing setup.
        </span>
      </div>
    </div>
  );
};

const InstallGuideModal: React.FC<{ isIOS: boolean; onClose: () => void }> = ({
  isIOS,
  onClose,
}) => (
  <div
    role="dialog"
    aria-label="Install SwayPalm App"
    className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
  >
    <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-[#0A4D2E] text-[#D4AF37] flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </span>
          <h3 className="font-display font-bold text-base text-neutral-900">
            Install SwayPalm App
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close install instructions"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIOS ? (
        <ol className="mt-4 space-y-2.5 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <span className="font-mono font-bold text-[#0A4D2E]">1.</span>
            <span>
              Tap the <strong className="inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5 inline" /></strong> button in your Safari toolbar.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono font-bold text-[#0A4D2E]">2.</span>
            <span>
              Scroll down and choose <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono font-bold text-[#0A4D2E]">3.</span>
            <span>
              Tap <strong>Add</strong> to launch SwayPalm full-screen like a native iOS app.
            </span>
          </li>
        </ol>
      ) : (
        <div className="mt-4 space-y-2.5 text-sm text-neutral-700">
          <p>
            Install SwayPalm directly onto your phone or computer:
          </p>
          <ol className="space-y-2 text-xs text-neutral-600">
            <li>
              <strong className="text-neutral-900">Android (Chrome):</strong> Open the browser menu (⋮) and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </li>
            <li>
              <strong className="text-neutral-900">Desktop (Chrome / Edge):</strong> Click the <strong>Install SwayPalm</strong> icon in the right side of the browser address bar.
            </li>
          </ol>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full py-2.5 px-4 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold"
      >
        Got it
      </button>
    </div>
  </div>
);

export const OfflineIndicator: React.FC = () => {
  const isBrowserOnline = useOnlineStatus();
  const {
    networkStatus,
    networkError,
    isRetryingNetwork,
    retryNetworkConnection,
    dismissNetworkError,
  } = useSwayPalm();

  const isOffline = !isBrowserOnline || networkStatus === 'offline';
  const showDegraded = !isOffline && networkStatus === 'degraded' && Boolean(networkError);

  if (!isOffline && !showDegraded) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-16 md:bottom-5 left-4 z-50 max-w-md flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg border ${
        isOffline
          ? 'bg-amber-700 border-amber-600'
          : 'bg-red-900 border-red-800'
      }`}
    >
      {isOffline ? (
        <WifiOff className="w-4 h-4 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
      )}
      <span className="leading-snug">
        {isOffline
          ? 'Offline Mode — Cached data active'
          : networkError || 'Connection issue — unable to reach SwayPalm servers.'}
      </span>
      <button
        type="button"
        disabled={isRetryingNetwork}
        onClick={() => void retryNetworkConnection()}
        className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
      >
        <RefreshCw className={`w-3 h-3 ${isRetryingNetwork ? 'animate-spin' : ''}`} />
        {isRetryingNetwork ? 'Retrying…' : 'Retry'}
      </button>
      {!isOffline && (
        <button
          type="button"
          onClick={dismissNetworkError}
          aria-label="Dismiss network notice"
          className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/15 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
