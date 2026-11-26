import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export type AppTab = 'analyser' | 'baseline' | 'trends' | 'research';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  isSessionRunning: boolean;
  onToggleSession: () => void;
  onOpenControlsSheet: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'analyser', label: 'Monitor' },
  { id: 'baseline', label: 'Baseline' },
  { id: 'trends', label: 'Trends' },
  { id: 'research', label: 'Benchmarks' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  isSessionRunning,
  onToggleSession,
  onOpenControlsSheet,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Compact 52px Mobile / Tablet Top Bar */}
      <div className="flex h-[52px] items-center justify-between gap-4 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => onSelectTab('analyser')}
          className="min-h-[44px] text-left text-base font-bold tracking-tight text-slate-900 truncate focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          Multimodal Stress Analyser
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'analyser' ? (
            <button
              type="button"
              onClick={onOpenControlsSheet}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <span>Controls</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleSession}
              className={`min-h-[44px] rounded-xl px-3.5 text-xs font-semibold active:scale-[0.98] transition-transform whitespace-nowrap shrink-0 ${
                isSessionRunning
                  ? 'bg-slate-900 text-white'
                  : 'bg-sky-600 text-white'
              }`}
            >
              {isSessionRunning ? 'Pause' : 'Resume'}
            </button>
          )}
        </div>
      </div>

      {/* Desktop 3-Zone Top Bar (>= 1024px) */}
      <div className="mx-auto hidden max-w-[1400px] items-center justify-between gap-8 px-6 py-3.5 lg:flex">
        {/* Zone 1: Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('analyser')}
          className="text-left text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
        >
          Multimodal Stress Analyser
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-sky-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onToggleSession}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
              isSessionRunning
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
          >
            {isSessionRunning ? 'Pause Analysis' : 'Resume Analysis'}
          </button>
        </div>
      </div>
    </header>
  );
};
