import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Droplet, Truck, FlaskConical, ClipboardCheck, ShieldAlert, Flame, Thermometer, Timer, Activity, CheckCircle2, ShieldCheck, Sparkles, LogIn, UserPlus, ListChecks, FilePlus2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnimatedCounter, Gauge } from '../components/ui';
import { Skeleton } from '../components/Skeleton';
import Timeline from '../components/Timeline';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { productName, unitName } from '../data/plantUnits';
import { verdict, relTime } from '../lib/utils';
import { api } from '../lib/api';

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const item = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

// Shown to visitors who are not logged in (no real request data on the public page)
const EXAMPLE = { id: 'PS-2026-00142', line: 'Kerosene / Jet Fuel · Jetty · JT-02 Loading arm B', priority: 'Critical', status: 'analysis', custody: [], testsPct: 60, href: '/signup?next=/new' };

export default function Landing() {
  const { requests, role, user, dataReady } = useApp();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let alive = true;
    api('/stats')
      .then((d) => alive && setStats(d))
      .catch(() => alive && setStatsError(true));
    return () => {
      alive = false;
    };
  }, []);

  const loggedIn = !!user && dataReady;
  const mine = loggedIn ? requests.filter((r) => r.requesterId === role.user.id) : [];
  const pool = mine.length ? mine : requests;
  const latest = loggedIn ? pool.slice(0, 3) : [];
  const live = loggedIn ? pool.find((r) => r.status !== 'certified') : null;
  const showcase = live
    ? {
        id: live.id,
        line: `${productName(live.product)} · ${unitName(live.unit)} · ${live.point}`,
        priority: live.priority,
        status: live.status,
        custody: live.custody,
        testsPct: (verdict(live).entered / Math.max(1, verdict(live).total)) * 100,
        href: `/requests/${live.id}`,
      }
    : EXAMPLE;
  const ctaTo = user ? '/new' : '/signup?next=/new';

  return (
    <div className="relative overflow-hidden">
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-600/20 to-red-600/10 blur-3xl" aria-hidden="true" />

      {/* Hero */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:pt-16">
        <motion.div variants={stagger} initial="initial" animate="animate">
          <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            PetroSync · Special Sample Lab Analysis Request
          </motion.div>
          <motion.h1 variants={item} className="mt-5 text-4xl font-bold leading-[1.05] text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            From sample point to <span className="text-gradient animate-shimmer">certified result.</span>
          </motion.h1>
          <motion.p variants={item} className="mt-5 max-w-xl text-base text-slate-600 dark:text-graphite-300 sm:text-lg">
            PetroSync connects the field, the lab and the control room. Submit petrochemical samples in minutes, follow every hand-off with full chain of custody, and get results checked automatically against EN 590, ASTM D975, D4814 and DEF STAN 91-091.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Link to={ctaTo} className="btn-primary px-6 py-3 text-base">
              Submit a Sample Request <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to={user ? '/requests' : '/login?next=/requests'} className="btn-ghost px-5 py-3 text-base">
              {user ? 'Track my requests' : 'Log in'}
            </Link>
          </motion.div>
          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs muted">
            {[[ShieldCheck, 'ISO/IEC 17025 workflows'], [Flame, 'Hazard-aware handling'], [Timer, 'Live SLA tracking']].map(([I, t]) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <I className="h-4 w-4 text-orange-500" aria-hidden="true" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero visual */}
        <motion.div initial={{ opacity: 0, y: 30, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-amber-400/20 to-orange-600/10 blur-2xl" aria-hidden="true" />
          <div className="glass relative p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">{live ? 'Your live sample' : 'Example sample'}</div>
                <Link to={showcase.href} className="font-mono text-lg font-semibold hover:text-orange-500">
                  {showcase.id}
                </Link>
                <div className="text-sm muted">
                  {showcase.line}
                </div>
              </div>
              <PriorityBadge priority={showcase.priority} />
            </div>
            <Timeline status={showcase.status} custody={showcase.custody} compact className="mt-6" />
            <div className="mt-6 grid grid-cols-3 gap-2">
              {stats ? (
                <>
                  <Gauge value={stats.onSpecRate} label="On-spec rate" decimals={1} size={110} tone="green" />
                  <Gauge value={Math.min(100, (stats.avgTurnaroundHours / 72) * 100)} label="SLA used" size={110} />
                </>
              ) : (
                <>
                  <Skeleton className="mx-auto h-[68px] w-[110px]" />
                  <Skeleton className="mx-auto h-[68px] w-[110px]" />
                </>
              )}
              <Gauge value={showcase.testsPct} label="Tests done" size={110} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {[[Thermometer, 'Flash point PMCC', 'D93 · 44.5 °C'], [Droplet, 'Water by KF', 'D6304 · 31 mg/kg']].map(([I, a, b]) => (
                <div key={a} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                  <I className="h-4 w-4 text-orange-500" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">{a}</div>
                    <div className="font-mono muted">{b}</div>
                  </div>
                  <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" aria-label="Pass" />
                </div>
              ))}
            </div>
          </div>
          <motion.div className="glass absolute -bottom-6 -left-4 hidden items-center gap-2 px-3 py-2 text-xs shadow-glow sm:flex animate-float" aria-hidden="true">
            <Truck className="h-4 w-4 text-orange-500" /> Sample en route · ETA 14 min
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Lab statistics">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: FlaskConical, label: 'Samples analyzed this month', value: stats?.samplesThisMonth },
            { icon: Timer, label: 'Average turnaround', value: stats?.avgTurnaroundHours, decimals: 1, suffix: ' h' },
            { icon: CheckCircle2, label: 'On-spec rate (certified)', value: stats?.onSpecRate, decimals: 1, suffix: '%' },
            { icon: Activity, label: 'Active requests', value: stats?.activeRequests },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="glass glass-hover p-5">
              <s.icon className="h-5 w-5 text-orange-500" aria-hidden="true" />
              <div className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                {stats ? <AnimatedCounter value={s.value} decimals={s.decimals} suffix={s.suffix} /> : statsError ? <span className="text-2xl muted">—</span> : <Skeleton className="h-9 w-24" />}
              </div>
              <div className="mt-1 text-xs font-medium muted sm:text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
        {statsError && <p role="status" className="mt-2 text-xs muted">Live lab statistics are unavailable right now. We can't reach the database.</p>}
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="eyebrow">How it works</div>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Four hand-offs. Zero lost samples.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Droplet, 'Submit', 'Pick a test package or individual ASTM methods. Cost and turnaround are calculated as you go.'],
            [Truck, 'Label & ship', 'Print a QR label with GHS pictograms. Reception scans it, and chain of custody starts.'],
            [FlaskConical, 'Analyze', 'Analysts work a live Kanban board. Critical shipment-hold samples jump the queue.'],
            [ClipboardCheck, 'Certify', 'Results are checked against spec automatically. QC signs off and the CoA is issued.'],
          ].map(([I, t, d], i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass glass-hover relative p-5">
              <div className="absolute right-4 top-4 font-mono text-4xl font-bold text-slate-200 dark:text-white/5">0{i + 1}</div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-graphite-950 shadow-glow">
                <I className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm muted">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* My recent / account */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8">
        {loggedIn ? (
          <div className="glass p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{mine.length ? 'Your latest requests' : 'Latest requests'}</h2>
              <Link to="/requests" className="-my-2 inline-flex min-h-[40px] items-center text-sm font-semibold text-orange-700 hover:underline dark:text-amber-300">
                View all
              </Link>
            </div>
            {latest.length ? (
              <ul className="mt-4 space-y-3">
                {latest.map((r) => (
                  <li key={r.id}>
                    <Link to={`/requests/${r.id}`} className="block rounded-xl border border-slate-200 p-4 transition hover:border-amber-400/50 hover:bg-amber-50/40 dark:border-white/10 dark:hover:bg-white/[0.03]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-semibold">{r.id}</span>
                          <span className="ml-2 text-sm muted">
                            {productName(r.product)} · {r.point}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={r.priority} />
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                      <Timeline status={r.status} compact className="mt-4" />
                      <div className="mt-2 text-xs muted">Submitted {relTime(r.createdAt)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm muted dark:border-white/15">
                No requests yet. Your first sample is a few clicks away.
                <div className="mt-3">
                  <Link to="/new" className="btn-primary">
                    <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Submit a Sample Request
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass p-5">
            <h2 className="text-lg font-semibold">Track every sample you send</h2>
            <p className="mt-1 text-sm muted">Log in to see your requests, results and Certificates of Analysis. Each account only sees its own samples.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Live status from sampling point to certified result', 'Automatic spec checks against EN 590, ASTM D975, D4814 and DEF STAN 91-091', 'Chain of custody and comments with the lab'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="glass p-5">
          {user ? (
            <>
              <h2 className="text-lg font-semibold">Signed in as {role.user.name}</h2>
              <p className="mt-1 text-sm muted">
                {role.label} · {role.user.dept}
              </p>
              <div className="mt-4 grid gap-2">
                <Link to="/new" className="btn-primary">
                  <FilePlus2 className="h-4 w-4" aria-hidden="true" /> New request
                </Link>
                <Link to={role.id === 'requester' ? '/requests' : role.id === 'analyst' ? '/lab' : '/dashboard'} className="btn-ghost">
                  <ListChecks className="h-4 w-4" aria-hidden="true" /> {role.id === 'requester' ? 'My requests' : role.id === 'analyst' ? 'Lab queue' : 'Dashboard'}
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Get started</h2>
              <p className="mt-1 text-sm muted">Create an account in under a minute, or log in with a demo account.</p>
              <div className="mt-4 grid gap-2">
                <Link to="/signup?next=/new" className="btn-primary">
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Create account
                </Link>
                <Link to="/login" className="btn-ghost">
                  <LogIn className="h-4 w-4" aria-hidden="true" /> Log in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
            <span className="muted">H₂S-bearing and pressurized samples must be declared. Reception will refuse undeclared hazardous containers.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
