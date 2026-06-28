'use client';

import { useState } from 'react';
import { getCountryCode, FLAG_BASE_URL } from '@/lib/countryFlags';

interface Props {
  countryName: string;
  size?: number;
  className?: string;
}

function Placeholder({ size, className }: { size: number; className: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm bg-gray-100 text-gray-400 ${className}`}
      style={{ width: size, height: (size * 3) / 4, minWidth: size }}
      title="Flag not available"
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 21V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2Z" />
      </svg>
    </span>
  );
}

export function CountryFlag({ countryName, size = 16, className = '' }: Props) {
  const [broken, setBroken] = useState(false);

  const code = getCountryCode(countryName);

  if (!code || broken) {
    return <Placeholder size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${FLAG_BASE_URL}/${code}.svg`}
      alt={countryName}
      width={size}
      height={size}
      className={`inline-block align-middle rounded-sm shrink-0 ${className}`}
      loading="lazy"
      style={{ width: size, height: (size * 3) / 4 }}
      onError={() => setBroken(true)}
    />
  );
}
