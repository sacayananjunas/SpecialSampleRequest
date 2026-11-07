import { Navigate, useLocation, Link } from 'react-router-dom';
import { DatabaseZap, RefreshCw, ShieldOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { Page, EmptyState } from './ui';

/** Glass shimmer block */
export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-xl bg-slate-200/70 dark:bg-white/[0.05]',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[skeleton_1.4s_ease-in-out_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent dark:after:via-white/[0.07]',
        className,
      )}
    />
  );
}

export function PageSkeleton({ variant = 'list' }) {
  return (
    <Page>
      <div role="status" aria-live="polite" aria-label="Loading">
        <span className="sr-only">Loading…</span>
        <div className="mb-6 flex items-start gap-3">
          <Skeleton className="hidden h-11 w-11 sm:block" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-3 w-96 max-w-full" />
          </div>
        </div>
        {variant === 'dashboard' && (
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass space-y-3 p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        )}
        {variant === 'board' ? (
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass w-[300px] shrink-0 space-y-3 p-3">
                <Skeleton className="h-4 w-32" />
                {[...Array(3)].map((__, j) => <Skeleton key={j} className="h-32 w-full" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className={cn('grid gap-4', variant === 'dashboard' ? 'lg:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3')}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass space-y-3 p-5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

export function LoadError({ error, onRetry }) {
  return (
    <Page>
      <div className="glass">
        <EmptyState
          icon={DatabaseZap}
          title={error?.code === 'DB_UNAVAILABLE' || error?.code === 'NETWORK' ? "We can't reach the database" : 'Something went wrong loading PetroSync'}
          message={error?.message}
          action={
            <button className="btn-primary" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
          }
        />
      </div>
    </Page>
  );
}

const SKELETON_FOR = { '/dashboard': 'dashboard', '/lab': 'board' };

/** Protects a route: login required, optional role list, waits for data to load. */
export function RequireAuth({ children, roles }) {
  const { user, authChecked, dataReady, bootError, retryBoot, role } = useApp();
  const location = useLocation();
  const variant = SKELETON_FOR[location.pathname] ?? 'list';
  if (!authChecked) return bootError ? <LoadError error={bootError} onRetry={retryBoot} /> : <PageSkeleton variant={variant} />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role))
    return (
      <Page>
        <div className="glass">
          <EmptyState
            icon={ShieldOff}
            title="This area is for lab staff"
            message={`You're signed in as a ${role.label}. Log in with a Lab Analyst or Lab Supervisor account to open it.`}
            action={<Link to="/requests" className="btn-primary">Go to my requests</Link>}
          />
        </div>
      </Page>
    );
  if (!dataReady) return bootError ? <LoadError error={bootError} onRetry={retryBoot} /> : <PageSkeleton variant={variant} />;
  return children;
}

export function DbBanner() {
  const { dbDown, retryBoot } = useApp();
  if (!dbDown) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300 no-print">
      <DatabaseZap className="h-4 w-4" aria-hidden="true" />
      <span>
        <strong>Can't reach the database.</strong> Changes can't be saved right now. Check your connection.
      </span>
      <button onClick={retryBoot} className="inline-flex items-center gap-1 font-semibold underline">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
