import Link from "next/link";

interface TopListProps {
  title: string;
  viewAllHref?: string;
  items: Array<{
    rank: number;
    name: string;
    value: string | number;
    sub?: string;
    href?: string;
    tooltip?: string;
    imageUrl?: string;
  }>;
  maxValue?: number;
  barColor?: string;
}

export function TopList({
  title,
  viewAllHref,
  items,
  barColor = "#1A56DB",
  maxValue,
}: TopListProps) {
  const max = maxValue || (items.length > 0 ? Math.max(...items.map((i) => Number(i.value))) : 1);

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">{title}</h3>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-[13px] text-[#1A56DB] font-medium">
            View All →
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.rank} className="flex items-center gap-3">
            <span className="text-[#ADB5BD] font-bold w-6 text-[13px]">
              {item.rank}
            </span>
            {item.href ? (
              <Link href={item.href} className="flex-1 text-[14px] hover:text-[#1A56DB] flex items-center gap-1.5">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                )}
                {item.name}
              </Link>
            ) : (
              <span className="flex-1 text-[14px] flex items-center gap-1.5">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-4.5 h-3 object-cover rounded-sm shrink-0" />
                )}
                {item.name}
              </span>
            )}
            <div className="flex-1 h-6 bg-[#F8F9FA] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (Number(item.value) / max) * 100)}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
            <span className="text-[14px] font-semibold w-16 text-right">
              {item.value}
            </span>
            {item.sub && (
              <span className="text-[13px] text-[#ADB5BD]">{item.sub}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
