"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TopList } from "@/components/shared/TopList";
import { formatNumber } from "@/lib/utils";
import type { TopScorerItem } from "@/lib/types";

const API = "/api/proxy";

export function TopScorersClient() {
  const searchParams = useSearchParams();
  const [topN, setTopN] = useState(Number(searchParams.get("top_n") || 50));
  const [scorers, setScorers] = useState<TopScorerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/top_scorers?top_n=${topN}`).then((r) => r.json());
      setScorers(res.scorers || []);
    } catch (err) {
      console.error("Failed to load top scorers:", err);
    }
    setLoading(false);
  }, [topN]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const items = scorers.map((s) => ({
    rank: s.rank,
    name: s.player,
    value: formatNumber(s.goals),
  }));

  return (
    <div>
      <h1 className="page-title mb-2">Top Scorers</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        All-time international goal scorers leaderboard.
      </p>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#6C757D]">Top:</span>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#1A56DB]"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="skeleton h-4 w-6 rounded" />
              <div className="skeleton h-5 w-40 rounded" />
              <div className="skeleton h-6 flex-1 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <TopList
          title="⚽ All-Time Top Scorers"
          items={items}
          maxValue={items[0] ? Number(items[0].value) : 1}
          barColor="#FD7E14"
        />
      )}
    </div>
  );
}
