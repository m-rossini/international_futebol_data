interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: "success" | "danger" | "warning" | "muted";
}

const subColorMap: Record<string, string> = {
  success: "text-[#198754]",
  danger: "text-[#DC3545]",
  warning: "text-[#FD7E14]",
  muted: "text-[#ADB5BD]",
};

export function StatsCard({ label, value, sub, subColor = "muted" }: StatsCardProps) {
  return (
    <div className="card p-5">
      <div className="text-[13px] text-[#6C757D] mb-2">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && (
        <div className={`text-[12px] mt-1 ${subColorMap[subColor]}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
