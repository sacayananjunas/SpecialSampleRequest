import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, FilePlus2, ListChecks, BookOpen, KanbanSquare, LayoutDashboard, Sun, Moon, ChevronDown, LogOut, LogIn, UserPlus, Mail, Building2 } from 'lucide-react';
import Logo from './Logo';
import Toasts from './Toasts';
import { DbBanner } from './Skeleton';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

const NAV = {
  home: { to: '/', label: 'Home', icon: Home, end: true },
  new: { to: '/new', label: 'New Request', icon: FilePlus2 },
  requests: { to: '/requests', label: 'Requests', icon: ListChecks },
  myrequests: { to: '/requests', label: 'My Requests', icon: ListChecks },
  lab: { to: '/lab', label: 'Lab Queue', icon: KanbanSquare },
  dash: { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  catalog: { to: '/catalog', label: 'Test Catalog', icon: BookOpen },
  login: { to: '/login', label: 'Log in', icon: LogIn },
  signup: { to: '/signup', label: 'Sign up', icon: UserPlus },
};

export const NAV_BY_ROLE = {
  guest: ['home', 'login', 'signup'],
  requester: ['home', 'new', 'myrequests', 'catalog'],
  analyst: ['lab', 'requests', 'new', 'catalog', 'home'],
  supervisor: ['dash', 'lab', 'requests', 'catalog', 'home'],
};

export const ROLE_HOME = { requester: '/requests', analyst: '/lab', supervisor: '/dashboard' };

function UserMenu() {
  const { role, logout, toast } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const doLogout = async () => {
    setOpen(false);
    // Leave the protected page first, so its "please log in" redirect doesn't race us
    navigate('/');
    await logout();
    toast({ tone: 'info', title: 'You are logged out', message: 'See you next time.' });
  };
  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white/70 py-1.5 pl-1.5 pr-2.5 text-left transition hover:border-amber-400/60 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 font-display text-xs font-bold text-graphite-950">{role.user.initials}</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-xs font-semibold">{role.user.name}</span>
            <span className="block text-[11px] muted">{role.label}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 muted transition', open && 'rotate-180')} aria-hidden="true" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="glass absolute right-0 z-50 mt-2 w-72 !bg-white p-3 dark:!bg-graphite-850">
              <div className="font-semibold">{role.user.name}</div>
              <div className="text-xs muted">{role.user.title} · {role.label}</div>
              <div className="mt-2 space-y-1 text-xs muted">
                <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> {role.user.email}</div>
                <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" aria-hidden="true" /> {role.user.dept} · {role.user.site}</div>
              </div>
              <div className="my-3 h-px bg-slate-200 dark:bg-white/10" />
              <button role="menuitem" onClick={doLogout} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <button onClick={doLogout} className="hidden h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white/70 px-3 text-sm font-semibold transition hover:border-red-400/60 hover:text-red-500 dark:border-white/10 dark:bg-white/[0.03] md:inline-flex">
        <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
      </button>
    </div>
  );
}

function GuestActions() {
  return (
    <div className="flex items-center gap-2">
      <Link to="/login" className="btn-ghost !py-2">Log in</Link>
      <Link to="/signup" className="btn-primary hidden !py-2 sm:inline-flex">Sign up</Link>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  return (
    <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white/70 transition hover:border-amber-400/60 hover:text-orange-500 dark:border-white/10 dark:bg-white/[0.03]" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export default function Layout() {
  const { roleId, requests, user } = useApp();
  const location = useLocation();
  const items = NAV_BY_ROLE[roleId ?? 'guest'].map((k) => NAV[k]);
  const activeCritical = requests.filter((r) => r.priority === 'Critical' && r.status !== 'certified').length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-amber-400 focus:px-3 focus:py-2 focus:text-graphite-950">
        Skip to content
      </a>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-graphite-950/70 lg:flex no-print">
        <div className="px-5 pb-6 pt-6">
          <NavLink to="/" aria-label="PetroSync home">
            <Logo />
          </NavLink>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3">
          {items.map((it) => (
            <NavLink
              key={it.to + it.label}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-graphite-300 dark:hover:bg-white/[0.04]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-400/15 to-orange-600/5 shadow-glow" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                  )}
                  <it.icon className={cn('relative h-[18px] w-[18px]', isActive && 'text-orange-500 dark:text-amber-300')} aria-hidden="true" />
                  <span className="relative">{it.label}</span>
                  {it.to === '/lab' && activeCritical > 0 && (
                    <span className="relative ml-auto rounded-full bg-red-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white animate-pulse-ring" aria-label={`${activeCritical} critical samples`}>
                      {activeCritical}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-orange-600/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-amber-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Central Lab · Bataan
          </div>
          <p className="mt-1 text-xs muted">Sample reception open 24/7. Critical samples: call ext. 4410.</p>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-graphite-950/60 no-print">
        <DbBanner />
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="lg:hidden" aria-label="PetroSync home">
            <Logo sub={false} />
          </NavLink>
          <div className="hidden text-sm muted lg:block">
            <span className="font-display font-semibold text-slate-800 dark:text-graphite-100">PetroSync</span> · Special Sample Lab Analysis Request
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? <UserMenu /> : <GuestActions />}
          </div>
        </div>
      </header>

      <main id="main" className="pb-safe lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs muted sm:px-6 lg:px-8 no-print">
          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-6 dark:border-white/[0.06] sm:flex-row">
            <span>
              <span className="font-display font-semibold text-gradient">PetroSync</span> · Special Sample Lab Analysis Request
            </span>
            <span>© 2026 PetroSync Laboratory Services</span>
          </div>
        </footer>
      </main>

      {/* Bottom nav (mobile) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/10 dark:bg-graphite-950/90 lg:hidden no-print">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
          {items.map((it) => (
            <NavLink
              key={it.to + it.label}
              to={it.to}
              end={it.end}
              className={({ isActive }) => cn('relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium', isActive ? 'text-orange-700 dark:text-amber-300' : 'muted')}
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="bnav" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-600" />}
                  <it.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="truncate">{it.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Toasts />
    </div>
  );
}
