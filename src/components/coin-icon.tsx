import { useId } from "react";

// เหรียญทองวาดด้วย SVG (ไม่พึ่งไฟล์รูป) — count คือจำนวนเหรียญที่วางซ้อนกัน 1-7 เหรียญ
const R = 22;

// ตำแหน่งเหรียญแต่ละกอง เรียงจากหลังไปหน้า (แถวบนวาดก่อน แถวล่างทับ)
const LAYOUTS: Record<number, [number, number][]> = {
  1: [[75, 52]],
  2: [[56, 44], [94, 58]],
  3: [[75, 34], [50, 62], [100, 62]],
  5: [[52, 32], [98, 32], [30, 66], [75, 66], [120, 66]],
  7: [[75, 22], [48, 40], [102, 40], [24, 64], [64, 68], [100, 68], [128, 62]],
};

function pickLayout(count: number) {
  const keys = Object.keys(LAYOUTS).map(Number);
  const key = keys.reduce((best, k) => (k <= count ? k : best), keys[0]);
  return LAYOUTS[key];
}

export function CoinIcon({ count = 1, className }: { count?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const face = `${id}-face`;
  const rim = `${id}-rim`;
  const coins = pickLayout(count);
  // ตัด viewBox ให้พอดีกองเหรียญ เหรียญจะเต็มกรอบไม่ว่ากองใหญ่หรือเล็ก
  const x0 = Math.min(...coins.map(([x]) => x)) - R - 2;
  const x1 = Math.max(...coins.map(([x]) => x)) + R + 2;
  const y0 = Math.min(...coins.map(([, y]) => y)) - R - 2;
  const y1 = Math.max(...coins.map(([, y]) => y)) + R + 8;

  return (
    <svg viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} className={className} role="img" aria-label="เหรียญ coin">
      <defs>
        <linearGradient id={face} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fff6c0" />
          <stop offset="0.45" stopColor="#f5c542" />
          <stop offset="1" stopColor="#b8730d" />
        </linearGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe48a" />
          <stop offset="0.5" stopColor="#d9992a" />
          <stop offset="1" stopColor="#7a4a08" />
        </linearGradient>
      </defs>
      {coins.map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx} ${cy})`}>
          <ellipse cx="0" cy={R + 3} rx={R - 2} ry="3.5" fill="#000" opacity="0.28" />
          <circle r={R} fill={`url(#${rim})`} />
          <circle r={R - 3} fill={`url(#${face})`} />
          <circle r={R - 6.5} fill="none" stroke="#9a6a14" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2 2.4" />
          {/* ดาว 4 แฉก กลางเหรียญ */}
          <path
            d="M0 -10 C1.2 -3.2 3.2 -1.2 10 0 C3.2 1.2 1.2 3.2 0 10 C-1.2 3.2 -3.2 1.2 -10 0 C-3.2 -1.2 -1.2 -3.2 0 -10Z"
            fill="#fff4cc"
            stroke="#a8730f"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d={`M${-R + 6} -6 A${R - 6} ${R - 6} 0 0 1 -4 ${-R + 5}`} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
