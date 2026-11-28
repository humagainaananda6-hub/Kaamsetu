import React from 'react';

export const AmbientBackground: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
    <div
      className="kbn-bob-slow absolute rounded-full blur-[90px] opacity-35 dark:opacity-40"
      style={{
        width: '420px',
        height: '420px',
        background: '#16C784',
        top: '-130px',
        left: '-110px',
      }}
    />
    <div
      className="kbn-bob-slow absolute rounded-full blur-[95px] opacity-30 dark:opacity-40"
      style={{
        width: '470px',
        height: '470px',
        background: '#3B82F6',
        right: '-170px',
        top: '28%',
        animationDelay: '-3s',
      }}
    />
    <div
      className="kbn-bob-slow absolute rounded-full blur-[90px] opacity-20 dark:opacity-25"
      style={{
        width: '340px',
        height: '340px',
        background: '#F472B6',
        left: '34%',
        bottom: '-180px',
        animationDelay: '-6s',
      }}
    />
  </div>
);
