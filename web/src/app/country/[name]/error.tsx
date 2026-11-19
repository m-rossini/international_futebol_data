'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CountryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/countries" className="text-gray-400 hover:text-blue-600">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Country unavailable</h1>
      </div>
      <p className="text-sm text-red-500 mt-4">Error: {error.message}</p>
      <button onClick={() => reset()} className="mt-4 text-sm text-blue-600 hover:underline">
        Try again
      </button>
    </div>
  );
}
