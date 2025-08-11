import React from 'react';

interface Tab {
  label: string;
  count: number;
}

interface SlidingTabsProps {
  tabs: Tab[];
  active: number;
  onChange: (idx: number) => void;
}

const SlidingTabs: React.FC<SlidingTabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="container max-w-6xl flex mt-8">
      {tabs.map((tab, idx) => (
        <button
          key={tab.label}
          className={`relative flex-1 px-0 py-3 font-semibold text-main transition-colors duration-200 focus:outline-none ${
            active === idx ? 'text-primary' : 'text-muted'
          }`}
          onClick={() => onChange(idx)}
          style={{ minWidth: 0 }}
        >
          <span className="flex items-center justify-center gap-3 w-full">
            <span className="truncate">{tab.label}</span>
            <span
              className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full transition-colors
                ${active === idx ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-main'}`}
            >
              {tab.count}
            </span>
          </span>
          {active === idx && (
            <span className="absolute left-0 right-0 -bottom-[2px] h-1 bg-primary rounded-t-full transition-all duration-200" />
          )}
        </button>
      ))}
    </div>
  );
};

export default SlidingTabs;
