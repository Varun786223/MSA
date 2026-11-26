import React from 'react';
import { Activity, BarChart3, FlaskConical, Sliders } from 'lucide-react';
import { AppTab } from './TopBar';

interface MobileBottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const TABS: {
  id: AppTab;
  label: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}[] = [
  { id: 'analyser', label: 'Monitor', Icon: Activity },
  { id: 'baseline', label: 'Baseline', Icon: Sliders },
  { id: 'trends', label: 'Trends', Icon: BarChart3 },
  { id: 'research', label: 'Benchmarks', Icon: FlaskConical },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
    >
      <div className="grid h-[60px] grid-cols-4 items-center px-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl transition-colors active:scale-[0.97] ${
                isActive ? 'text-sky-700' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden={true} />
              <span
                className={`mt-1 text-[11px] leading-none tracking-tight ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
