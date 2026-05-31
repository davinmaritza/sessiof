'use client';

import { useMemo, useState } from 'react';

interface AttendanceRecord {
  Tanggal: string | number;
  Bulan: string;
  Tahun: string | number;
  Status?: string;
}

interface Props {
  records: AttendanceRecord[];
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_EN_TO_NUM: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

function getDateKey(tanggal: string | number, bulan: string, tahun: string | number): string {
  const monthNum = MONTHS_EN_TO_NUM[bulan] ?? MONTHS_EN_TO_NUM[bulan.toLowerCase()] ?? 0;
  const day = String(tanggal).padStart(2, '0');
  const month = String(monthNum + 1).padStart(2, '0');
  return `${tahun}-${month}-${day}`;
}

function getIntensity(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.7) return 3;
  return 4;
}

const COLORS = [
  'rgba(91,77,199,0.08)',  // 0 - empty
  'rgba(91,77,199,0.25)',  // 1 - low
  'rgba(91,77,199,0.45)',  // 2 - medium-low
  'rgba(91,77,199,0.7)',   // 3 - medium-high
  'rgba(91,77,199,1)',     // 4 - high
];

export default function AttendanceHeatmap({ records }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { weeks, maxCount, totalDays, totalPresent } = useMemo(() => {
    // Count attendance per date
    const countMap: Record<string, number> = {};
    for (const r of records) {
      const key = getDateKey(r.Tanggal, r.Bulan, r.Tahun);
      if (r.Status === 'Alpa' || r.Status === 'Izin' || r.Status === 'Sakit') continue;
      countMap[key] = (countMap[key] || 0) + 1;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Build 52 weeks + current week (364+ days) ending today
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align start to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks: Array<Array<{ date: Date; count: number; dateKey: string } | null>> = [];
    const cursor = new Date(startDate);
    
    while (cursor <= endDate) {
      const week: Array<{ date: Date; count: number; dateKey: string } | null> = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(cursor);
        if (day > today) {
          week.push(null);
        } else {
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          week.push({ date: day, count: countMap[key] || 0, dateKey: key });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const maxCount = Math.max(...Object.values(countMap), 1);
    const totalPresent = Object.keys(countMap).filter(k => (countMap[k] || 0) > 0).length;
    
    return { weeks, maxCount, totalDays: Object.keys(countMap).length, totalPresent };
  }, [records]);

  // Determine month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const firstValid = week.find(d => d !== null);
      if (firstValid) {
        const m = firstValid.date.getMonth();
        if (m !== lastMonth) {
          labels.push({ label: MONTHS_ID[m], col: i });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [weeks]);

  const cellSize = 11;
  const gap = 2;
  const step = cellSize + gap;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Analitik Tahunan</span>
          <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">Heatmap Kehadiran</h3>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Hari Hadir</p>
            <p className="text-base font-black text-primary">{totalPresent}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Hari Data</p>
            <p className="text-base font-black text-slate-700 dark:text-zinc-200">{totalDays}</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="relative inline-block" style={{ paddingTop: 18, paddingLeft: 24 }}>
          {/* Day labels */}
          <div className="absolute left-0 top-[18px] flex flex-col" style={{ gap }}>
            {[0, 1, 2, 3, 4, 5, 6].map(d => (
              <div key={d} className="flex items-center justify-end pr-1"
                style={{ height: cellSize, fontSize: 8, color: '#94a3b8', fontWeight: 600, width: 22 }}>
                {d % 2 === 1 ? DAYS_ID[d] : ''}
              </div>
            ))}
          </div>

          {/* Month labels */}
          <div className="absolute top-0 left-6 flex" style={{ gap: 0 }}>
            {monthLabels.map((m, i) => (
              <div key={i}
                style={{
                  position: 'absolute',
                  left: m.col * step,
                  fontSize: 9,
                  color: '#94a3b8',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div
            className="flex relative"
            style={{ gap }}
            onMouseLeave={() => setTooltip(null)}
          >
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 2,
                      background: day === null
                        ? 'transparent'
                        : COLORS[getIntensity(day.count, maxCount)],
                      border: day !== null ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      cursor: day !== null && day.count > 0 ? 'pointer' : 'default',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!day) return;
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      const container = (e.target as HTMLElement).closest('.overflow-x-auto')?.getBoundingClientRect();
                      setTooltip({
                        x: rect.left - (container?.left || 0) + rect.width / 2,
                        y: rect.top - (container?.top || 0) - 8,
                        text: `${day.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}: ${day.count} hadir`
                      });
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
                background: 'rgba(15,15,25,0.92)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              {tooltip.text}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] font-semibold text-slate-400">Sedikit</span>
        {COLORS.map((color, i) => (
          <div key={i} style={{
            width: 11, height: 11, borderRadius: 2,
            background: color,
            border: '1px solid rgba(0,0,0,0.06)'
          }} />
        ))}
        <span className="text-[10px] font-semibold text-slate-400">Banyak</span>
      </div>
    </div>
  );
}
