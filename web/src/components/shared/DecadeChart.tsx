"use client";

import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { GoalsPerYearItem } from "@/lib/types";

interface DecadeDatum {
  decade: string;
  goals: number;
  matches: number;
  ratio: number;
}

function aggregateDecades(yearly: GoalsPerYearItem[]): DecadeDatum[] {
  const map = new Map<number, { goals: number; matches: number }>();
  yearly.forEach((y) => {
    const d = Math.floor(y.year / 10) * 10;
    if (!map.has(d)) map.set(d, { goals: 0, matches: 0 });
    const entry = map.get(d)!;
    entry.goals += y.goals;
    entry.matches += y.matches;
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, v]) => ({
      decade: `${decade}s`,
      goals: v.goals,
      matches: v.matches,
      ratio: v.matches > 0 ? +(v.goals / v.matches).toFixed(2) : 0,
    }));
}

interface Props {
  yearly: GoalsPerYearItem[];
}

export function DecadeChart({ yearly }: Props) {
  const decades = useMemo(() => aggregateDecades(yearly), [yearly]);

  if (decades.length === 0) return null;

  const data = [
    {
      id: "Goals/Match",
      data: decades.map((d) => ({ x: d.decade, y: d.ratio })),
    },
  ];

  const globalAvg = decades.reduce((sum, d) => sum + d.goals, 0) / decades.reduce((sum, d) => sum + d.matches, 0);
  const avgLine = +globalAvg.toFixed(2);

  return (
    <div style={{ height: 280 }}>
      <ResponsiveLine
        data={data}
        margin={{ top: 10, right: 30, bottom: 50, left: 50 }}
        xScale={{ type: "point" }}
        yScale={{
          type: "linear",
          min: 0,
          max: "auto",
        }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: "Decade",
          legendOffset: 38,
          legendPosition: "middle",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Goals / Match",
          legendOffset: -44,
          legendPosition: "middle",
        }}
        colors={["#DC3545"]}
        lineWidth={3}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        enableArea={true}
        areaOpacity={0.08}
        areaBaselineValue={avgLine}
        useMesh={true}
        enableGridX={false}
        enableGridY={true}
        markers={[
          {
            axis: "y",
            value: avgLine,
            lineStyle: { stroke: "#ADB5BD", strokeWidth: 1, strokeDasharray: "6 4" },
            legend: `Avg ${avgLine}`,
            legendPosition: "top-right",
            textStyle: { fill: "#ADB5BD", fontSize: 11 },
          },
        ]}
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
              padding: "8px 12px",
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{point.data.xFormatted}</div>
            <div>{point.data.yFormatted} goals / match</div>
          </div>
        )}
      />
    </div>
  );
}
