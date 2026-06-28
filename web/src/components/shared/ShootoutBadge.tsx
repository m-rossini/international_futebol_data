'use client';

/** Small badge to indicate a match ended in a penalty shootout. */
export function ShootoutBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight bg-amber-100 text-amber-700"
      title="Won on penalties"
    >
      PK
    </span>
  );
}
