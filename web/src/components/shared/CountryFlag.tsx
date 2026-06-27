"use client";

import { getCountryCode, FLAG_BASE_URL } from "@/lib/countryFlags";

interface Props {
  countryName: string;
  size?: number;
  className?: string;
}

export function CountryFlag({ countryName, size = 16, className = "" }: Props) {
  const code = getCountryCode(countryName);

  if (!code) return null;

  return (
    <img
      src={`${FLAG_BASE_URL}/${code}.svg`}
      alt={countryName}
      width={size}
      height={size}
      className={`inline-block align-middle rounded-sm shrink-0 ${className}`}
      loading="lazy"
      style={{ width: size, height: (size * 3) / 4 }}
      onError={(e) => {
        // Hide broken images silently
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
