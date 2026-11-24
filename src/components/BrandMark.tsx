import React, { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';

export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="36" height="36" rx="9" fill="#0A4D2E" />
    <path
      d="M18 28V16.5"
      stroke="#D4AF37"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M18 16.5C14.2 12.2 9.8 11.4 6.8 13.4C10.5 15.2 13.8 16.2 18 16.5Z"
      fill="#FFFFFF"
    />
    <path
      d="M18 16.5C21.8 12.2 26.2 11.4 29.2 13.4C25.5 15.2 22.2 16.2 18 16.5Z"
      fill="#FFFFFF"
    />
    <path
      d="M18 15C15.5 10 11.8 7.5 8.5 8C11.8 10.8 14.5 12.8 18 15Z"
      fill="#D4AF37"
    />
    <path
      d="M18 15C20.5 10 24.2 7.5 27.5 8C24.2 10.8 21.5 12.8 18 15Z"
      fill="#D4AF37"
    />
    <circle cx="18" cy="10.2" r="2" fill="#FFFFFF" />
  </svg>
);

export const VerifiedBadge: React.FC<{ plan?: string; className?: string }> = ({
  plan,
  className = 'w-4 h-4',
}) => {
  const isGold = plan === 'premium';
  return (
    <span
      title={isGold ? 'Verified Gold Business' : 'Verified Business'}
      className={`inline-flex items-center shrink-0 ${
        isGold ? 'text-[#D4AF37]' : 'text-[#0A4D2E]'
      }`}
    >
      <BadgeCheck className={className} />
    </span>
  );
};

export const BusinessAvatar: React.FC<{
  photoUrl?: string;
  initials?: string;
  color?: string;
  name?: string;
  className?: string;
  textClassName?: string;
}> = ({
  photoUrl,
  initials = 'SP',
  color = '#0A4D2E',
  name = 'Business profile',
  className = 'w-10 h-10 rounded-lg',
  textClassName = 'text-xs',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  const showPhoto = Boolean(photoUrl && photoUrl.trim().length > 0 && !imgFailed);

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden font-bold text-white select-none ${textClassName} ${className}`}
      style={{ backgroundColor: showPhoto ? '#E5EBE7' : color }}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
};
