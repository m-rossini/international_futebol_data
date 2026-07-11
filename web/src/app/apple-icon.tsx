import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#2d7a3a',
        borderRadius: '50%',
      }}
    >
      <svg viewBox="0 0 64 64" width="120" height="120">
        <circle cx="32" cy="32" r="30" fill="#fff" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <g fill="#333">
          <polygon points="32,8 37.5,14.5 34.5,21 29.5,21 26.5,14.5" />
          <polygon points="52,22 48.5,28 41.5,28 39,22 43.5,16" />
          <polygon points="48,44 43,49 36.5,46 37.5,39 44,37" />
          <polygon points="16,44 21,49 27.5,46 26.5,39 20,37" />
          <polygon points="12,22 15.5,16 21,16 23.5,22 22.5,28 15.5,28" />
        </g>
        <g fill="none" stroke="#333" strokeWidth="1.2">
          <line x1="29.5" y1="21" x2="22.5" y2="28" />
          <line x1="34.5" y1="21" x2="39" y2="22" />
          <line x1="37.5" y1="14.5" x2="43.5" y2="16" />
          <line x1="26.5" y1="14.5" x2="21" y2="16" />
          <line x1="39" y1="22" x2="44" y2="37" />
          <line x1="41.5" y1="28" x2="43" y2="49" />
          <line x1="48.5" y1="28" x2="48" y2="44" />
          <line x1="22.5" y1="28" x2="21" y2="49" />
          <line x1="15.5" y1="28" x2="16" y2="44" />
          <line x1="20" y1="37" x2="27.5" y2="46" />
          <line x1="44" y1="37" x2="36.5" y2="46" />
        </g>
      </svg>
    </div>,
    { ...size },
  );
}
