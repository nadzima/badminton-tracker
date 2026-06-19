"use client";
import { WinRatePoint } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

interface Props {
  data: WinRatePoint[];
}

export default function WinTrendChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-slate-400">Minimal 2 sesi untuk menampilkan tren</p>
      </div>
    );
  }

  const W = 280;
  const H = 72;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = 16;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const pts = data.map((d, i) => ({
    x: padL + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW),
    y: padT + (1 - d.winRate) * cH,
    wr: d.winRate,
    date: d.date,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + cH).toFixed(1)} Z`;

  const avg = data.reduce((s, d) => s + d.winRate, 0) / data.length;
  const avgY = padT + (1 - avg) * cH;

  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 72 }}>
        {/* 50% reference line */}
        <line
          x1={padL} y1={padT + cH / 2}
          x2={W - padR} y2={padT + cH / 2}
          stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3"
        />
        {/* Area */}
        <path d={areaPath} fill="rgba(22,163,74,0.08)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#16a34a" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{formatDateShort(data[0].date)}</span>
        <span className="text-slate-500 font-medium">avg {Math.round(avg * 100)}%</span>
        <span>{formatDateShort(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}
