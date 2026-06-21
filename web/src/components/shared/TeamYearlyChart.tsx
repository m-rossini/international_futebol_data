"use client";

import { useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { TeamYearlyItem } from "@/lib/types";

type MetricKey = "wins" | "losses" | "draws" | "goals_for" | "goals_against";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "wins", label: "Wins", color: "#198754" },
  { key: "losses", label: "Losses", color: "#DC3545" },
  { key: "draws", label: "Draws", color: "#FD7E14" },
  { key: "goals_for", label: "Goals For", color: "#1A56DB" },
  { key: "goals_against", label: "Goals Against", color: "#6C757D" },
];

interface Props {
  yearly: TeamYearlyItem[];
}

export function TeamYearlyChart({ yearly }: Props) {
  const [metric, setMetric] = useState<MetricKey>("wins");

  const selected = METRICS.find((m) => m.key === metric)!;

  const data = [
    {
      id: selected.label,
      color: selected.color,
      data: yearly.map((y) => ({ x: y.year, y: y[metric] })),
    },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">📈 Performance Over Time</h3>
        <div className="flex gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-2.5 py-1 text-[12px] rounded-md font-medium transition-colors ${
                metric === m.key
                  ? "text-white"
                  : "text-[#6C757D] hover:text-[#212529] hover:bg-[#E9ECEF]"
              }`}
              style={metric === m.key ? { backgroundColor: m.color } : undefined}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveLine
          data={data}
          margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
          xScale={{
            type: "linear",
            min: "auto",
            max: "auto",
          }}
          yScale={{
            type: "linear",
            min: 0,
            max: "auto",
            stacked: false,
          }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: "Year",
            legendOffset: 32,
            legendPosition: "middle",
            format: (v) => String(v),
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: selected.label,
            legendOffset: -44,
            legendPosition: "middle",
          }}
          colors={[selected.color]}
          pointSize={5}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          pointLabelYOffset={-12}
          enableArea={true}
          areaOpacity={0.15}
          useMesh={true}
          enableGridX={false}
          enableGridY={true}
          lineWidth={2}
          theme={{
            axis: {
              ticks: { text: { fontSize: 11, fill: "#6C757D" } },
              legend: { text: { fontSize: 12, fill: "#212529" } },
            },
            grid: { line: { stroke: "#E9ECEF", strokeWidth: 1 } },
          }}
          tooltip={({ point }) => (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E9ECEF",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
              }}
            >
              <strong>{point.data.xFormatted}</strong>: {point.data.yFormatted}
            </div>
          )}
          enableSlices="x"
          sliceTooltip={({ slice }) => (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E9ECEF",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
              }}
            >
              <strong>{slice.points[0].data.xFormatted}</strong>
              {slice.points.map((pt) => (
                <div key={pt.id}>
                  {pt.serieId}: {pt.data.yFormatted}
                </div>
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}
