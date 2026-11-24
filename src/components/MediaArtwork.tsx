import React from 'react';
import {
  Building2,
  Camera,
  Coffee,
  Cpu,
  Globe2,
  HeartPulse,
  Hotel,
  Scissors,
  Shirt,
  Sparkles,
} from 'lucide-react';

interface MediaArtworkProps {
  theme?: string;
  imageDataUrl?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  aspectClass?: string;
}

const THEME_CONFIG: Record<
  string,
  {
    bg: string;
    accent: string;
    patternStroke: string;
    label: string;
  }
> = {
  hero_trade: {
    bg: 'from-[#0A4D2E] via-[#0D5E38] to-[#06311D]',
    accent: '#D4AF37',
    patternStroke: 'rgba(212,175,55,0.22)',
    label: 'Global B2B Network',
  },
  hair_luxury: {
    bg: 'from-[#2A1F1A] via-[#453126] to-[#1D1511]',
    accent: '#D4AF37',
    patternStroke: 'rgba(212,175,55,0.28)',
    label: 'Virgin Hair & Beauty',
  },
  diani_resort: {
    bg: 'from-[#09473D] via-[#0F6C5D] to-[#062E28]',
    accent: '#E2C366',
    patternStroke: 'rgba(255,255,255,0.2)',
    label: 'Coastal Hospitality',
  },
  fashion_atelier: {
    bg: 'from-[#18221D] via-[#27382F] to-[#101714]',
    accent: '#D4AF37',
    patternStroke: 'rgba(212,175,55,0.24)',
    label: 'Bespoke Apparel',
  },
  electronics_hub: {
    bg: 'from-[#151D26] via-[#212E3C] to-[#0E141A]',
    accent: '#D4AF37',
    patternStroke: 'rgba(255,255,255,0.16)',
    label: 'Commercial Hardware',
  },
  coffee_export: {
    bg: 'from-[#1B3322] via-[#294B33] to-[#112216]',
    accent: '#D4AF37',
    patternStroke: 'rgba(212,175,55,0.25)',
    label: 'Direct Origin Harvest',
  },
  tours_safari: {
    bg: 'from-[#2B351D] via-[#404F2B] to-[#1C2312]',
    accent: '#E2C366',
    patternStroke: 'rgba(226,195,102,0.24)',
    label: 'Expeditions & Tours',
  },
  real_estate: {
    bg: 'from-[#1C2522] via-[#2C3B36] to-[#121816]',
    accent: '#D4AF37',
    patternStroke: 'rgba(212,175,55,0.22)',
    label: 'Commercial Property',
  },
  health_wellness: {
    bg: 'from-[#0F3D33] via-[#17584A] to-[#0A2A23]',
    accent: '#D4AF37',
    patternStroke: 'rgba(255,255,255,0.18)',
    label: 'Botanical & Health',
  },
  services_logistics: {
    bg: 'from-[#0B3B24] via-[#135636] to-[#072617]',
    accent: '#D4AF37',
    patternStroke: 'rgba(212,175,55,0.22)',
    label: 'Trade & Logistics',
  },
};

function renderThemeIllustration(theme: string, stroke: string, accent: string) {
  switch (theme) {
    case 'hair_luxury':
      return (
        <svg viewBox="0 0 400 260" className="w-full h-full opacity-90" aria-hidden="true">
          <path d="M40 220 C110 80, 170 40, 210 130 C250 220, 310 150, 370 40" fill="none" stroke={accent} strokeWidth="2.5" />
          <path d="M20 240 C95 110, 175 70, 220 155 C265 240, 325 170, 390 65" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="290" cy="80" r="44" fill="none" stroke={stroke} strokeWidth="1.2" />
          <circle cx="290" cy="80" r="24" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
    case 'diani_resort':
      return (
        <svg viewBox="0 0 400 260" className="w-full h-full opacity-90" aria-hidden="true">
          <circle cx="305" cy="72" r="34" fill={accent} opacity="0.24" />
          <path d="M0 190 Q100 168 200 188 T400 184 L400 260 L0 260 Z" fill="rgba(255,255,255,0.08)" />
          <path d="M0 212 Q120 196 240 214 T400 208" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <path d="M84 190 Q88 125 76 74" fill="none" stroke={accent} strokeWidth="3" />
          <path d="M76 74 Q42 62 24 88 M76 74 Q52 46 34 52 M76 74 Q110 52 132 76 M76 74 Q112 78 122 104" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'fashion_atelier':
      return (
        <svg viewBox="0 0 400 260" className="w-full h-full opacity-90" aria-hidden="true">
          <rect x="65" y="42" width="120" height="176" rx="4" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x="215" y="64" width="120" height="132" rx="4" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.65" />
          <line x1="40" y1="130" x2="360" y2="130" stroke={stroke} strokeWidth="1" strokeDasharray="4 6" />
        </svg>
      );
    case 'electronics_hub':
      return (
        <svg viewBox="0 0 400 260" className="w-full h-full opacity-90" aria-hidden="true">
          <rect x="92" y="54" width="216" height="138" rx="10" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x="112" y="72" width="176" height="94" rx="4" fill="rgba(255,255,255,0.05)" stroke={accent} strokeWidth="1.2" opacity="0.75" />
          <path d="M68 206 L332 206" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="200" cy="119" r="24" fill="none" stroke={accent} strokeWidth="1.5" />
        </svg>
      );
    case 'coffee_export':
      return (
        <svg viewBox="0 0 400 260" className="w-full h-full opacity-90" aria-hidden="true">
          <ellipse cx="145" cy="128" rx="34" ry="48" transform="rotate(-22 145 128)" fill="none" stroke={accent} strokeWidth="1.8" opacity="0.7" />
          <ellipse cx="245" cy="132" rx="30" ry="44" transform="rotate(18 245 132)" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M134 86 Q150 128 156 170" fill="none" stroke={accent} strokeWidth="1.4" />
          <path d="M254 92 Q242 132 236 172" fill="none" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 400 260" className="w-full h-full opacity-90" aria-hidden="true">
          <circle cx="200" cy="130" r="88" fill="none" stroke={stroke} strokeWidth="1.3" />
          <ellipse cx="200" cy="130" rx="44" ry="88" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.55" />
          <line x1="112" y1="130" x2="288" y2="130" stroke={stroke} strokeWidth="1.2" />
          <line x1="126" y1="88" x2="274" y2="88" stroke={stroke} strokeWidth="1" />
          <line x1="126" y1="172" x2="274" y2="172" stroke={stroke} strokeWidth="1" />
        </svg>
      );
  }
}

function ThemeIcon({ theme }: { theme: string }) {
  switch (theme) {
    case 'hair_luxury':
      return <Scissors className="w-5 h-5" />;
    case 'diani_resort':
      return <Hotel className="w-5 h-5" />;
    case 'fashion_atelier':
      return <Shirt className="w-5 h-5" />;
    case 'electronics_hub':
      return <Cpu className="w-5 h-5" />;
    case 'coffee_export':
      return <Coffee className="w-5 h-5" />;
    case 'tours_safari':
      return <Camera className="w-5 h-5" />;
    case 'real_estate':
      return <Building2 className="w-5 h-5" />;
    case 'health_wellness':
      return <HeartPulse className="w-5 h-5" />;
    case 'services_logistics':
      return <Globe2 className="w-5 h-5" />;
    default:
      return <Sparkles className="w-5 h-5" />;
  }
}

export const MediaArtwork: React.FC<MediaArtworkProps> = ({
  theme = 'hero_trade',
  imageDataUrl,
  title,
  subtitle,
  className = '',
  aspectClass = 'aspect-[4/3]',
}) => {
  const [imgError, setImgError] = React.useState(false);
  const cfg = THEME_CONFIG[theme] || THEME_CONFIG.hero_trade;

  if (imageDataUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-neutral-100 ${aspectClass} ${className}`}>
        <img
          src={imageDataUrl}
          alt={title || 'SwayPalm business media'}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${cfg.bg} ${aspectClass} ${className}`}
    >
      <div className="absolute inset-0">
        {renderThemeIllustration(theme, cfg.patternStroke, cfg.accent)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      <div className="relative z-10 h-full w-full p-4 flex flex-col justify-between text-white">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-[#E8D082]">
            <ThemeIcon theme={theme} />
            {cfg.label}
          </span>
        </div>
        {(title || subtitle) && (
          <div>
            {title && (
              <p className="font-display font-semibold text-sm sm:text-base leading-snug text-white line-clamp-2">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
