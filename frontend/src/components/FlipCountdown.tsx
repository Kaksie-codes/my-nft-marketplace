import React, { useEffect, useState } from 'react';


interface FlipCountdownProps {
  endTime: Date;
}


const FlipCountdown: React.FC<FlipCountdownProps> = ({ endTime }) => {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = endTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTime({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTime({ d, h, m, s });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex flex-row items-center justify-center gap-0 mb-4">
      {/* Each digit+label is a flex-col, colons are centered with digits using h-12/md:h-16 */}
      <div className="flex flex-col items-center">
        <div className="bg-background text-main dark:bg-zinc-900 dark:text-white rounded-lg shadow w-10 h-12 md:w-12 md:h-16 flex items-center justify-center text-xl md:text-2xl font-mono font-bold">
          <span>{String(time.d).padStart(2, '0')}</span>
        </div>
        <span className="text-xs text-muted mt-1 select-none">Days</span>
      </div>
      <div className="flex items-center h-12 md:h-16 px-1">
        <span className="text-2xl font-bold text-muted">:</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-background text-main dark:bg-zinc-900 dark:text-white rounded-lg shadow w-10 h-12 md:w-12 md:h-16 flex items-center justify-center text-xl md:text-2xl font-mono font-bold">
          <span>{String(time.h).padStart(2, '0')}</span>
        </div>
        <span className="text-xs text-muted mt-1 select-none">Hrs</span>
      </div>
      <div className="flex items-center h-12 md:h-16 px-1">
        <span className="text-2xl font-bold text-muted">:</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-background text-main dark:bg-zinc-900 dark:text-white rounded-lg shadow w-10 h-12 md:w-12 md:h-16 flex items-center justify-center text-xl md:text-2xl font-mono font-bold">
          <span>{String(time.m).padStart(2, '0')}</span>
        </div>
        <span className="text-xs text-muted mt-1 select-none">Min</span>
      </div>
      <div className="flex items-center h-12 md:h-16 px-1">
        <span className="text-2xl font-bold text-muted">:</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-background text-main dark:bg-zinc-900 dark:text-white rounded-lg shadow w-10 h-12 md:w-12 md:h-16 flex items-center justify-center text-xl md:text-2xl font-mono font-bold">
          <span>{String(time.s).padStart(2, '0')}</span>
        </div>
        <span className="text-xs text-muted mt-1 select-none">Sec</span>
      </div>
    </div>
  );
};

export default FlipCountdown;
