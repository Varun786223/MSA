import React, { useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { StoredReading, StressBand } from '../types/stress';
import { exportReadingsToCsv } from '../utils/stressEngine';

interface TrendsHistoryViewProps {
  readings: StoredReading[];
  onGoToAnalyser: () => void;
}

type TimeScale = 'session' | 'day' | 'week';

export const TrendsHistoryView: React.FC<TrendsHistoryViewProps> = ({
  readings,
  onGoToAnalyser,
}) => {
  const [timeScale, setTimeScale] = useState<TimeScale>('week');
  const [bandFilter, setBandFilter] = useState<'ALL' | StressBand>('ALL');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedReadings = useMemo(
    () =>
      [...readings].sort(
        (a, b) => new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime()
      ),
    [readings]
  );

  const timeFiltered = useMemo(() => {
    const now = Date.now();
    if (timeScale === 'session') return sortedReadings.slice(-8);
    if (timeScale === 'day') {
      const dayCutoff = now - 24 * 3600 * 1000;
      const withinDay = sortedReadings.filter((r) => new Date(r.timestampIso).getTime() >= dayCutoff);
      return withinDay.length > 0 ? withinDay : sortedReadings.slice(-4);
    }
    return sortedReadings;
  }, [sortedReadings, timeScale]);

  const tableRows = useMemo(() => {
    const base = [...timeFiltered].reverse();
    if (bandFilter === 'ALL') return base;
    return base.filter((r) => r.band === bandFilter);
  }, [timeFiltered, bandFilter]);

  const avgIndex = useMemo(() => {
    if (!timeFiltered.length) return 0;
    return Math.round(timeFiltered.reduce((a, r) => a + r.index, 0) / timeFiltered.length);
  }, [timeFiltered]);

  const sustainedHighCount = useMemo(
    () => timeFiltered.filter((r) => r.index >= 60 && r.confounderLabels.length === 0).length,
    [timeFiltered]
  );

  const hoveredReading = useMemo(
    () => timeFiltered.find((r) => r.id === hoveredId) ?? timeFiltered[timeFiltered.length - 1] ?? null,
    [timeFiltered, hoveredId]
  );

  const handleDownloadCsv = () => {
    const csv = exportReadingsToCsv(sortedReadings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stress-readings-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const chartW = 860;
  const chartH = 260;
  const padL = 42;
  const padR = 24;
  const padT = 16;
  const padB = 34;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const points = timeFiltered.map((r, i) => {
    const x =
      timeFiltered.length === 1
        ? padL + innerW / 2
        : padL + (i / (timeFiltered.length - 1)) * innerW;
    const y = padT + ((100 - r.index) / 100) * innerH;
    return { reading: r, x, y };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Longitudinal Trend & History
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Each observation preserves timestamp, confidence, confounders, and user-entered context.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: 'session', label: 'Session' },
                { id: 'day', label: '24 Hours' },
                { id: 'week', label: 'Week' },
              ] as { id: TimeScale; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeScale(t.id)}
                className={`min-h-[40px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  timeScale === t.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={sortedReadings.length === 0}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {sustainedHighCount >= 2 && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
          <div>
            <span className="font-semibold text-slate-900">Support Note:</span>{' '}
            Multiple unconfounded readings in this window sit in the High or Very High range relative to your baseline. Consider checking in with someone trusted or a qualified professional.
          </div>
        </div>
      )}

      {timeFiltered.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">No Stored Readings Yet</h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-600">
            Record observations from the Monitor tab to build your multi-day trend.
          </p>
          <button
            type="button"
            onClick={onGoToAnalyser}
            className="mt-4 min-h-[44px] rounded-xl bg-sky-600 px-5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            Open Live Monitor
          </button>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <section className="lg:col-span-9 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Stress Index Trajectory (0–100)
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Mean: <strong className="font-mono text-slate-900 tabular-nums">{avgIndex}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Count: <strong className="font-mono text-slate-900 tabular-nums">{timeFiltered.length}</strong></span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full min-w-[540px] cursor-crosshair"
                  role="img"
                  aria-label="Longitudinal stress index trend chart"
                >
                  {[
                    { y0: 0, y1: 20, fill: '#ecfdf5', label: 'Calm' },
                    { y0: 20, y1: 40, fill: '#f7fee7', label: 'Mild' },
                    { y0: 40, y1: 60, fill: '#fffbeb', label: 'Moderate' },
                    { y0: 60, y1: 80, fill: '#fff7ed', label: 'High' },
                    { y0: 80, y1: 100, fill: '#fff1f2', label: 'Very High' },
                  ].map((band) => {
                    const top = padT + ((100 - band.y1) / 100) * innerH;
                    const height = ((band.y1 - band.y0) / 100) * innerH;
                    return (
                      <g key={band.label}>
                        <rect x={padL} y={top} width={innerW} height={height} fill={band.fill} />
                        <line x1={padL} x2={padL + innerW} y1={top} y2={top} stroke="#e2e8f0" strokeWidth="1" />
                        <text x={padL - 8} y={top + height / 2 + 3} textAnchor="end" className="fill-slate-400 font-mono text-[10px]">
                          {band.y0}–{band.y1}
                        </text>
                      </g>
                    );
                  })}

                  {points.length > 1 && (
                    <polyline fill="none" stroke="#0f172a" strokeWidth="2" points={polylineStr} />
                  )}

                  {points.map(({ reading, x, y }) => {
                    const hasConfounder = reading.confounderLabels.length > 0;
                    const isSelected = hoveredReading?.id === reading.id;
                    const dateLabel = new Date(reading.timestampIso).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <g
                        key={reading.id}
                        onMouseEnter={() => setHoveredId(reading.id)}
                        onClick={() => setHoveredId(reading.id)}
                        className="cursor-pointer"
                      >
                        {isSelected && (
                          <line x1={x} x2={x} y1={padT} y2={padT + innerH} stroke="#0284c7" strokeDasharray="3 3" strokeWidth="1" />
                        )}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 7 : 5}
                          fill={hasConfounder ? '#d97706' : '#0284c7'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text x={x} y={chartH - 10} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                          {dateLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>Blue nodes: Unconfounded observations</span>
                <span aria-hidden="true">·</span>
                <span>Amber nodes: Confounder flagged</span>
              </div>
            </section>

            <aside className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
              {hoveredReading ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-500">Selected Reading</div>
                    <div className="mt-1 font-mono text-xs text-slate-700">
                      {new Date(hoveredReading.timestampIso).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3 border-y border-slate-100 py-3">
                    <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                      {hoveredReading.index}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {hoveredReading.band}
                    </span>
                    <span className="ml-auto font-mono text-xs text-slate-500 tabular-nums">
                      {hoveredReading.confidence}% conf.
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">Tag: </span>
                      <span className="text-slate-600">{hoveredReading.userTag}</span>
                    </div>
                    {hoveredReading.contextNote && (
                      <div>
                        <span className="font-semibold text-slate-800">Context: </span>
                        <span className="text-slate-600">{hoveredReading.contextNote}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-slate-800">Top Signals: </span>
                      <span className="text-slate-600">{hoveredReading.topSignals.join(', ')}</span>
                    </div>
                    {hoveredReading.confounderLabels.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
                        Confounder: {hoveredReading.confounderLabels.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                Tap any node or row to inspect its baseline shift and context.
              </div>
            </aside>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Stored Session Log</h2>
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
                {(['ALL', 'Calm', 'Mild', 'Moderate', 'High', 'Very High'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBandFilter(b)}
                    className={`min-h-[38px] rounded-lg px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      bandFilter === b
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {b === 'ALL' ? 'All' : b}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Index</th>
                    <th className="py-2.5 px-3 font-semibold">Band</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Conf.</th>
                    <th className="py-2.5 px-3 font-semibold">Top Signals</th>
                    <th className="py-2.5 px-3 font-semibold">Confounder</th>
                    <th className="py-2.5 pl-3 font-semibold">User Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setHoveredId(row.id)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="py-3 pr-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {new Date(row.timestampIso).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {row.index}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">{row.band}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                        {row.confidence}%
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {row.topSignals.slice(0, 2).join(' · ')}
                      </td>
                      <td className="py-3 px-3 text-amber-800">
                        {row.confounderLabels.length > 0 ? row.confounderLabels.join(', ') : '—'}
                      </td>
                      <td className="py-3 pl-3 text-slate-700">
                        {row.userTag}
                        {row.sleepHoursSnapshot ? ` · ${row.sleepHoursSnapshot}h sleep` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
