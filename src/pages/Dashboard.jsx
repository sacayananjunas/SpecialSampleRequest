import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { LayoutDashboard, Inbox, Timer, XCircle, AlarmClock, RotateCcw, Siren, ArrowRight, Table2, BarChart3 } from 'lucide-react';
import { Page, PageHeader, Card, Countdown, Gauge, Select, EmptyState } from '../components/ui';
import { PageSkeleton, LoadError } from '../components/Skeleton';
import { api } from '../lib/api';
import KpiCard from '../components/KpiCard';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { productName, unitName } from '../data/plantUnits';
import { cn } from '../lib/utils';

// Validated categorical palette (dataviz reference instance), light / dark steps
const CAT = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
};
const OTHER = { light: '#a3a29b', dark: '#6b6a64' };
const BRAND = { light: '#eb6834', dark: '#d95926' };
const CRIT = { light: '#d03b3b', dark: '#e05252' };

function ChartTip({ active, payload, label, unit = '', fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-graphite-850/95">
      {label !== undefined && <div className="mb-1 font-semibold">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.payload?.fill }} aria-hidden="true" />
          <span className="muted">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-slate-900 dark:text-white">{fmt ? fmt(p.value) : p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children, table, className }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs muted">{subtitle}</p>}
        </div>
        {table && (
          <button onClick={() => setAsTable((x) => !x)} className="rounded-lg p-2 muted hover:bg-slate-100 hover:text-orange-500 dark:hover:bg-white/5" aria-label={asTable ? `Show ${title} as chart` : `Show ${title} as table`} aria-pressed={asTable}>
            {asTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          </button>
        )}
      </div>
      {asTable ? (
        <div className="max-h-64 overflow-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider muted">
                {table.cols.map((c) => <th key={c} className="border-b border-slate-200 py-1.5 dark:border-white/10">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className={cn('border-b border-slate-100 py-1.5 dark:border-white/5', j > 0 && 'font-mono')}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { theme, requests } = useApp();
  const mode = theme === 'dark' ? 'dark' : 'light';
  const axis = { stroke: 'var(--chart-text)', fontSize: 11, tickLine: false, axisLine: false };
  const [series, setSeries] = useState(null);
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [reload, setReload] = useState(0);

  // Reload whenever the selected trend series changes, or the request list changes (status moves, results...)
  useEffect(() => {
    let alive = true;
    setTrendLoading(true);
    api(`/dashboard${series ? `?series=${encodeURIComponent(series)}` : ''}`)
      .then((d) => {
        if (!alive) return;
        setM(d);
        setError(null);
        if (!series) setSeries(d.selectedSeries);
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setTrendLoading(false));
    return () => {
      alive = false;
    };
  }, [series, requests, reload]);

  if (error && !m) return <LoadError error={error} onRetry={() => setReload((x) => x + 1)} />;
  if (!m) return <PageSkeleton variant="dashboard" />;

  const trend = m.trend;
  const S = m.series.find((x) => x.id === m.selectedSeries) ?? m.series[0];
  const exceed = trend.filter((d) => (S.min ? d.value < S.limit : d.value > S.limit)).length;
  const avail = m.instrumentsAvailable;
  const total = m.total;
  const donut = m.byProduct;
  const k = m.kpis;

  return (
    <Page>
      <PageHeader icon={LayoutDashboard} eyebrow="Supervisor view" title="Lab Performance" subtitle="Throughput, turnaround and product quality across all units, updated live from the request queue." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard index={0} icon={Inbox} label="Requests this week" value={k.requestsThisWeek} delta={k.requestsDelta} hint={k.requestsDelta !== undefined ? 'vs last week' : 'last 7 days'} />
        <KpiCard index={1} icon={Timer} label="Avg turnaround" value={k.avgTat} decimals={1} suffix=" h" delta={k.avgTatDelta} goodWhen="down" hint={k.avgTatDelta !== undefined ? 'vs last week' : 'submit → certified'} tone="sky" />
        <KpiCard index={2} icon={XCircle} label="Off-spec rate" value={k.offRate} decimals={1} suffix="%" hint="of completed requests" tone="red" />
        <KpiCard index={3} icon={AlarmClock} label="Overdue" value={k.overdue} hint={`${k.active} active`} tone={k.overdue ? 'red' : 'green'} />
        <KpiCard index={4} icon={RotateCcw} label="Retest rate" value={k.retestRate} decimals={1} suffix="%" hint="of all requests" tone="green" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ChartCard title="Requests by product" subtitle={`${total} requests · top 5 + other`} table={{ cols: ['Product', 'Requests'], rows: donut.map((d) => [d.name, d.value]) }}>
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke="none" cornerRadius={4} isAnimationActive animationDuration={900}>
                    {donut.map((d, i) => <Cell key={d.name} fill={d.other ? OTHER[mode] : CAT[mode][i]} />)}
                  </Pie>
                  <Tooltip content={<ChartTip unit=" requests" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-3xl font-bold">{total}</div>
                  <div className="text-[11px] muted">requests</div>
                </div>
              </div>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm" aria-label="Legend">
              {donut.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.other ? OTHER[mode] : CAT[mode][i] }} aria-hidden="true" />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="font-mono text-xs">{d.value}</span>
                  <span className="w-10 text-right font-mono text-xs muted">{Math.round((d.value / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard title="Turnaround trend" subtitle="Average hours, submit → certified · week ending" table={{ cols: ['Week', 'Avg TAT (h)'], rows: m.tatTrend.map((d) => [d.week, d.hours ?? '—']) }}>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={m.tatTrend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="tatFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={BRAND[mode]} stopOpacity={0.3} />
                    <stop offset="1" stopColor={BRAND[mode]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="week" {...axis} />
                <YAxis {...axis} />
                <ReferenceLine y={24} stroke="var(--chart-text)" strokeDasharray="4 4" label={{ value: 'Urgent SLA 24 h', position: 'insideTopRight', fill: 'var(--chart-text)', fontSize: 10 }} />
                <Tooltip content={<ChartTip unit=" h" />} cursor={{ stroke: 'var(--chart-text)', strokeDasharray: '3 3' }} />
                <Area type="monotone" connectNulls dataKey="hours" name="Avg turnaround" stroke={BRAND[mode]} strokeWidth={2} fill="url(#tatFill)" dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg)' }} activeDot={{ r: 5 }} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card className="flex flex-col">
          <h2 className="font-semibold">Service health</h2>
          <p className="text-xs muted">SLA compliance and instrument availability</p>
          <div className="mt-4 grid flex-1 grid-cols-2 place-items-center gap-2">
            <Gauge value={m.slaPct} label="SLA met (certified)" tone={m.slaPct > 85 ? 'green' : 'amber'} size={150} />
            <Gauge value={avail} label="Instruments available" tone={avail > 70 ? 'green' : 'red'} size={150} />
          </div>
          <Link to="/lab" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:underline dark:text-amber-300">
            Open Lab Queue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Workload by test method" subtitle="Pending tests in the active queue" table={{ cols: ['Method', 'Pending tests'], rows: m.workload.map((d) => [d.method, d.n]) }}>
          {m.workload.length ? (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={m.workload} layout="vertical" margin={{ top: 0, right: 24, left: 10, bottom: 0 }} barCategoryGap={6}>
                  <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" {...axis} allowDecimals={false} />
                  <YAxis type="category" dataKey="method" {...axis} width={64} tick={{ fontFamily: 'JetBrains Mono', fontSize: 11, fill: 'var(--chart-text)' }} />
                  <Tooltip content={<ChartTip unit=" tests" />} cursor={{ fill: 'rgba(249,115,22,.08)' }} />
                  <Bar dataKey="n" name="Pending" fill={CAT[mode][0]} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', fill: 'var(--chart-text)', fontSize: 11 }} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Queue is clear" message="No pending tests right now." />
          )}
        </ChartCard>

        <ChartCard title="Off-spec results by unit" subtitle="Requests with ≥1 failed parameter · last 30 days" table={{ cols: ['Unit', 'Off-spec'], rows: m.offByUnit.map((d) => [d.unit, d.n]) }}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={m.offByUnit} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="unit" {...axis} interval={0} tick={{ fontSize: 10, fill: 'var(--chart-text)' }} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip content={<ChartTip unit=" off-spec" />} cursor={{ fill: 'rgba(249,115,22,.08)' }} />
                <Bar dataKey="n" name="Off-spec" fill={BRAND[mode]} radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold">Property trend</h2>
              <p className="text-xs muted">
                {S.method} · daily results, last 60 days ·{' '}
                <span className={cn('font-semibold', exceed ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
                  {exceed ? `${exceed} exceedance${exceed > 1 ? 's' : ''}` : 'no exceedances'}
                </span>
              </p>
            </div>
            <Select id="trend-series" label="Unit / property" value={series ?? S.id} onChange={setSeries} options={m.series.map((x) => ({ value: x.id, label: x.label }))} className="sm:w-72" />
          </div>
          <div className={cn('h-72 transition-opacity', trendLoading && 'opacity-50')} aria-busy={trendLoading}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" {...axis} interval={9} />
                <YAxis {...axis} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTip unit={S.unit ? ` ${S.unit}` : ''} />} cursor={{ stroke: 'var(--chart-text)', strokeDasharray: '3 3' }} />
                <ReferenceLine y={S.limit} stroke={CRIT[mode]} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Spec limit · ${S.limitLabel}`, position: 'insideTopLeft', fill: CRIT[mode], fontSize: 11, fontWeight: 600 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={S.label.split(' · ')[1]}
                  stroke={CAT[mode][0]}
                  strokeWidth={2}
                  animationDuration={1400}
                  dot={(p) => {
                    const bad = S.min ? p.payload.value < S.limit : p.payload.value > S.limit;
                    return bad ? <circle key={p.index} cx={p.cx} cy={p.cy} r={4.5} fill={CRIT[mode]} stroke="var(--bg)" strokeWidth={2} /> : <g key={p.index} />;
                  }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs muted">Red markers are results outside the spec limit (dashed line).</p>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 font-semibold">
            <Siren className="h-4 w-4 text-red-500" aria-hidden="true" /> Overdue & at-risk
          </h2>
          <p className="text-xs muted">Active requests due within 8 hours or past SLA</p>
          {m.atRisk.length ? (
            <ul className="mt-3 space-y-2">
              {m.atRisk.map((r) => (
                <li key={r.id}>
                  <Link to={`/requests/${r.id}`} className={cn('flex items-center gap-3 rounded-xl border p-3 transition hover:border-amber-400/60', new Date(r.dueAt) < new Date() ? 'border-red-500/40 bg-red-500/5' : 'border-slate-200 dark:border-white/10')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{r.id}</span>
                        <PriorityBadge priority={r.priority} className="!text-[10px]" />
                      </div>
                      <div className="truncate text-xs muted">{productName(r.product)} · {unitName(r.unit)} · {r.point}</div>
                      <StatusBadge status={r.status} className="mt-1 !text-[10px]" />
                    </div>
                    <Countdown to={r.dueAt} className="shrink-0 flex-col !items-end" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="All on track" message="No requests are close to breaching their SLA." />
          )}
        </Card>
      </div>
    </Page>
  );
}
