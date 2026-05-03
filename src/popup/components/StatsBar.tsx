import React, { useEffect, useState } from 'react';
import { t } from '../../utils/i18n';

interface Stats {
  total: number;
  thisWeek: number;
  mastered: number;
  reviewDue: number;
}

interface StatsBarProps {
  refreshKey: number;
}

export default function StatsBar({ refreshKey }: StatsBarProps) {
  const [stats, setStats] = useState<Stats>({ total: 0, thisWeek: 0, mastered: 0, reviewDue: 0 });

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }).then((res) => {
      if (res?.stats) setStats(res.stats);
    });
  }, [refreshKey]);

  const items = [
    { label: t('stats.total'), value: stats.total, color: 'text-[var(--color-text)]' },
    { label: t('stats.thisWeek'), value: stats.thisWeek, color: 'text-[var(--color-text)]' },
    { label: t('stats.mastered'), value: stats.mastered, color: 'text-green-600 dark:text-green-400' },
    { label: t('stats.reviewDue'), value: stats.reviewDue, color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="flex items-center justify-around px-5 py-2.5 bg-[var(--color-surface)]">
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <div className="w-px h-6 bg-[var(--color-border)]" />}
          <div className="text-center px-2">
            <div className={`text-base font-semibold tabular-nums ${item.color}`}>{item.value}</div>
            <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">{item.label}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
