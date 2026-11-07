'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * Dismissible banner at the top of the home page explaining what automated
 * usage is allowed and what is rate-limited. Stored dismissal in
 * localStorage so it only shows once per browser.
 */
export function AbuseNoticeBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('abuse-notice-dismissed') === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissed(true);
      }
    } catch {
      // localStorage unavailable — show the banner once.
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="w-full max-w-3xl mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
      <div className="flex items-start gap-3">
        <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
        <div className="text-sm leading-relaxed">
          <strong>Fair-use notice.</strong> This site is free for personal and research use.
          Automated bulk collection, AI training crawls, and repeated calls to the simulation or Ask
          Me endpoints are <strong>rate-limited</strong> and may be blocked.{' '}
          <a href="/about" className="underline underline-offset-2 hover:text-amber-800">
            Read the usage policy
          </a>
          .
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem('abuse-notice-dismissed', '1');
            } catch {
              /* ignore */
            }
          }}
          className="ml-auto flex-shrink-0 text-amber-600 hover:text-amber-800"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
