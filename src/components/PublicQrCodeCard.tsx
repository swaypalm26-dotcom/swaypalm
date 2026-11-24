import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, QrCode, Share2, X } from 'lucide-react';
import { getWebsiteBaseUrl } from '../lib/urls';

interface PublicQrCodeCardProps {
  compact?: boolean;
}

export const PublicQrCodeCard: React.FC<PublicQrCodeCardProps> = ({ compact = false }) => {
  const publicUrl = getWebsiteBaseUrl();
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [svg, png] = await Promise.all([
          QRCode.toString(publicUrl, {
            type: 'svg',
            width: 240,
            margin: 2,
            color: { dark: '#0A4D2E', light: '#FFFFFF' },
            errorCorrectionLevel: 'M',
          }),
          QRCode.toDataURL(publicUrl, {
            width: 512,
            margin: 2,
            color: { dark: '#0A4D2E', light: '#FFFFFF' },
            errorCorrectionLevel: 'M',
          }),
        ]);
        if (!active) return;
        setQrSvg(svg);
        setQrPngUrl(png);
      } catch {
        // ignore QR encoding edge errors
      }
    })();
    return () => {
      active = false;
    };
  }, [publicUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'SwayPalm26 — Global Business Network & Marketplace',
          text: 'Open SwayPalm26 to connect with verified businesses, shop, and chat.',
          url: publicUrl,
        });
        return;
      } catch {
        // user cancelled or unsupported
      }
    }
    await handleCopy();
  };

  const handleDownloadQr = () => {
    if (!qrPngUrl) return;
    const link = document.createElement('a');
    link.href = qrPngUrl;
    link.download = 'swaypalm26-public-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={
        compact
          ? 'space-y-4'
          : 'bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 space-y-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0A4D2E] text-[#D4AF37] flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900">
              Public SwayPalm26 Link &amp; QR Code
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              Scan with any Android or iPhone camera to open the public SwayPalm26 site over HTTPS.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#F3F5F4] border border-neutral-200">
        <div className="w-44 h-44 bg-white p-2.5 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-center shrink-0">
          {qrPngUrl ? (
            <img
              src={qrPngUrl}
              alt={`QR Code for ${publicUrl}`}
              className="w-full h-full object-contain"
            />
          ) : qrSvg ? (
            <div
              className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <span className="text-xs text-neutral-400">Generating QR...</span>
          )}
        </div>

        <div className="flex-1 min-w-0 w-full space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Public Production URL
            </p>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block px-3 py-2 rounded-lg bg-white border border-neutral-200 font-mono text-xs font-semibold text-[#0A4D2E] hover:underline break-all"
            >
              {publicUrl}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="px-3 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Link Copied' : 'Copy Public Link'}
            </button>

            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0A4D2E]" />
              Share
            </button>

            <button
              type="button"
              disabled={!qrPngUrl}
              onClick={handleDownloadQr}
              className="px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-[#0A4D2E]" />
              Download QR PNG
            </button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0A4D2E] hover:underline inline-flex items-center gap-1"
            >
              Open
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ShareQrModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Share SwayPalm26 Public Link and QR Code"
      className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xl relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share QR dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
        >
          <X className="w-4 h-4" />
        </button>
        <PublicQrCodeCard compact />
      </div>
    </div>
  );
};
