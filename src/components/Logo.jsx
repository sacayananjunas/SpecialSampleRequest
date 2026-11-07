import { useId } from 'react';
import { cn } from '../lib/utils';

export function LogoMark({ className = 'h-9 w-9' }) {
  const gid = `ps-g-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset=".55" stopColor="#fb923c" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" className="fill-graphite-900 dark:fill-graphite-850" />
      <rect x=".5" y=".5" width="63" height="63" rx="15.5" fill="none" stroke={`url(#${gid})`} strokeOpacity=".5" />
      <path d="M32 10s-14 16.4-14 26.3a14 14 0 0 0 28 0C46 26.4 32 10 32 10z" fill={`url(#${gid})`} />
      <path d="M25.5 37.5a6.5 6.5 0 0 0 6.5 6.5" stroke="#fff" strokeOpacity=".8" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ className, sub = true, size = 'md' }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'} />
      <div className="leading-none">
        <div
          className={cn(
            'font-display font-bold tracking-tight text-gradient animate-shimmer',
            size === 'lg' ? 'text-3xl' : 'text-xl',
          )}
        >
          PetroSync
        </div>
        {sub && <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] muted">Special Sample Lab Analysis Request</div>}
      </div>
    </div>
  );
}
