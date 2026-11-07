import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import {
  KanbanSquare, PackageCheck, Play, PencilLine, Flag, ClipboardCheck, BadgeCheck, ExternalLink, Siren, AlertTriangle, Cpu, GripVertical,
  Search, Timer, FlaskConical, Activity,
} from 'lucide-react';
import { Page, PageHeader, Modal, Countdown } from '../components/ui';
import { PriorityBadge, FlagBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { INSTRUMENT_STATES } from '../data/instruments';
import { productName, unitName } from '../data/plantUnits';
import { testById } from '../data/testCatalog';
import { specLimit } from '../data/specs';
import { STATUSES, statusIndex, verdict, cn, evaluate, fmtValue } from '../lib/utils';

const ISSUES = ['Container leaking', 'Insufficient volume', 'Sample contaminated with water', 'Seal broken', 'Label missing / illegible', 'Wrong container type'];

const COL_ACCENT = {
  submitted: 'from-sky-400 to-sky-600',
  received: 'from-violet-400 to-violet-600',
  analysis: 'from-amber-300 to-orange-600',
  qc: 'from-fuchsia-400 to-fuchsia-600',
  certified: 'from-emerald-400 to-emerald-600',
};

const prioRank = { Critical: 0, Urgent: 1, Routine: 2 };

export default function LabQueue() {
  const { requests, moveStatus, roleId, toast, instruments, setInstrumentStatus } = useApp();
  const [activeId, setActiveId] = useState(null);
  const [resultsFor, setResultsFor] = useState(null);
  const [issueFor, setIssueFor] = useState(null);
  const [q, setQ] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return requests.filter((r) => !s || `${r.id} ${productName(r.product)} ${r.point}`.toLowerCase().includes(s));
  }, [requests, q]);

  const columns = useMemo(() => {
    const by = Object.fromEntries(STATUSES.map((s) => [s.id, []]));
    filtered.forEach((r) => by[r.status]?.push(r));
    Object.keys(by).forEach((k) => {
      if (k === 'certified') by[k].sort((a, b) => b.statusAt.localeCompare(a.statusAt));
      else by[k].sort((a, b) => prioRank[a.priority] - prioRank[b.priority] || a.dueAt.localeCompare(b.dueAt));
    });
    return by;
  }, [filtered]);

  const active = requests.filter((r) => r.status !== 'certified');
  const critical = active.filter((r) => r.priority === 'Critical');
  const overdue = active.filter((r) => new Date(r.dueAt) < new Date());

  const tryMove = async (req, to) => {
    if (req.status === to) return;
    const vd = verdict(req);
    if (to === 'certified' && roleId !== 'supervisor') {
      toast({ tone: 'error', title: 'Supervisor sign-off required', message: 'Only a Lab Supervisor can certify and release results. Switch role to try it.' });
      return;
    }
    if (statusIndex(to) >= 3 && !vd.complete) {
      toast({ tone: 'error', title: `${req.id} isn't ready for ${to === 'qc' ? 'QC review' : 'certification'}`, message: `${vd.total - vd.entered} result(s) still missing. Use “Enter results” first.` });
      return;
    }
    if (statusIndex(to) >= 2 && statusIndex(req.status) < 1) {
      toast({ tone: 'warning', title: 'Receive the sample first', message: 'Chain of custody requires the sample to be received before analysis.' });
      return;
    }
    // Optimistic: the card moves instantly, and snaps back with an error toast if the server refuses
    const ok = await moveStatus(req.id, to, statusIndex(to) < statusIndex(req.status) ? 'Moved back on Kanban' : 'Moved on Kanban');
    if (ok) toast({ title: `${req.id} → ${STATUSES.find((s) => s.id === to).label}`, duration: 2500 });
  };

  const onDragEnd = ({ active: a, over }) => {
    setActiveId(null);
    if (!over) return;
    const req = requests.find((r) => r.id === a.id);
    if (req) tryMove(req, over.id);
  };

  const dragged = requests.find((r) => r.id === activeId);

  const cycleInstrument = async (id) => {
    const inst = instruments.find((i) => i.id === id);
    const next = INSTRUMENT_STATES[(INSTRUMENT_STATES.indexOf(inst.status) + 1) % INSTRUMENT_STATES.length];
    if (await setInstrumentStatus(id, next)) toast({ tone: next === 'Down' ? 'warning' : 'info', title: `${inst.name} → ${next}`, duration: 2200 });
  };

  return (
    <Page className="max-w-[1600px]">
      <PageHeader
        icon={KanbanSquare}
        eyebrow="Analyst view"
        title="Lab Queue"
        subtitle="Drag cards between columns or use quick actions. Critical shipment-hold samples are pinned to the top."
        actions={
          <label className="relative">
            <span className="sr-only">Search queue</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by ID, product, tank…" className="input w-64 pl-9" />
          </label>
        }
      />

      {/* Summary + instruments */}
      <div className="mb-5 grid gap-3 lg:grid-cols-[auto_1fr]">
        <div className="grid grid-cols-3 gap-3">
          {[
            [Activity, 'In queue', active.length, ''],
            [Siren, 'Critical', critical.length, 'text-red-500'],
            [Timer, 'Overdue', overdue.length, overdue.length ? 'text-red-500' : ''],
          ].map(([I, l, n, c]) => (
            <div key={l} className="glass px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider muted">
                <I className={cn('h-3.5 w-3.5', c)} aria-hidden="true" /> {l}
              </div>
              <div className={cn('font-display text-2xl font-bold', c)}>{n}</div>
            </div>
          ))}
        </div>
        <div className="glass p-3" aria-label="Instrument status">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider muted">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" /> Instrument status
            </div>
            <span className="text-[10px] muted">Click to change status</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {instruments.map((i) => <InstrumentChip key={i.id} inst={i} onClick={() => cycleInstrument(i.id)} />)}
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements: {
            onDragStart: ({ active: a }) => `Picked up ${a.id}.`,
            onDragOver: ({ active: a, over }) => (over ? `${a.id} is over ${STATUSES.find((s) => s.id === over.id)?.label}.` : `${a.id} is not over a column.`),
            onDragEnd: ({ active: a, over }) => (over ? `${a.id} dropped in ${STATUSES.find((s) => s.id === over.id)?.label}.` : `${a.id} dropped.`),
            onDragCancel: ({ active: a }) => `Dragging ${a.id} cancelled.`,
          },
        }}
      >
        <div className="flex snap-x gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {STATUSES.map((s) => (
            <Column key={s.id} status={s} items={columns[s.id]} onMove={tryMove} onResults={setResultsFor} onIssue={setIssueFor} roleId={roleId} />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 200 }}>{dragged ? <QueueCard req={dragged} overlay /> : null}</DragOverlay>
      </DndContext>

      {resultsFor && <ResultsModal req={requests.find((r) => r.id === resultsFor)} onClose={() => setResultsFor(null)} onMove={tryMove} />}
      {issueFor && <IssueModal req={requests.find((r) => r.id === issueFor)} onClose={() => setIssueFor(null)} />}
    </Page>
  );
}

function InstrumentChip({ inst, onClick }) {
  const st = {
    Online: ['bg-emerald-500', 'text-emerald-700 dark:text-emerald-300', ''],
    'In Use': ['bg-sky-500', 'text-sky-700 dark:text-sky-300', 'animate-pulse'],
    'Calibration Due': ['bg-amber-500', 'text-amber-700 dark:text-amber-300', ''],
    Down: ['bg-red-500', 'text-red-700 dark:text-red-300', 'animate-pulse'],
  }[inst.status];
  return (
    <button onClick={onClick} className="rounded-xl border border-slate-200 bg-white/60 p-2.5 text-left transition hover:border-amber-400/60 dark:border-white/10 dark:bg-white/[0.02]" aria-label={`${inst.name}: ${inst.status}. Click to change.`}>
      <div className="flex items-center gap-1.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', st[0], st[2])} aria-hidden="true" />
        <span className="truncate text-xs font-semibold">{inst.name}</span>
      </div>
      <div className={cn('mt-0.5 text-[11px] font-semibold', st[1])}>{inst.status}</div>
      <div className="truncate text-[10px] muted">{inst.detail}</div>
    </button>
  );
}

function Column({ status, items, onMove, onResults, onIssue, roleId }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const [showAll, setShowAll] = useState(false);
  const limit = status.id === 'certified' && !showAll ? 6 : Infinity;
  return (
    <section ref={setNodeRef} aria-label={`${status.label} column, ${items.length} samples`} className={cn('glass flex w-[300px] shrink-0 snap-start flex-col !rounded-2xl p-3 transition', isOver && 'border-orange-500 shadow-glow')}>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full bg-gradient-to-br', COL_ACCENT[status.id])} aria-hidden="true" />
          <h2 className="text-sm font-semibold">{status.label}</h2>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-xs dark:bg-white/10">{items.length}</span>
      </div>
      <div className={cn('flex min-h-[200px] flex-1 flex-col gap-2.5 rounded-xl p-0.5 transition', isOver && 'bg-amber-400/5')}>
        {items.slice(0, limit).map((r) => (
          <DraggableCard key={r.id} req={r} onMove={onMove} onResults={onResults} onIssue={onIssue} roleId={roleId} />
        ))}
        {items.length > limit && (
          <button onClick={() => setShowAll(true)} className="rounded-lg py-2 text-xs font-semibold text-orange-700 hover:bg-amber-400/10 dark:text-amber-300">
            Show {items.length - limit} more
          </button>
        )}
        {!items.length && (
          <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-xs muted dark:border-white/10">
            Nothing here.
            <br />
            Drop a sample card to move it.
          </div>
        )}
      </div>
    </section>
  );
}

function DraggableCard(props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.req.id });
  return (
    <div ref={setNodeRef} className={cn(isDragging && 'opacity-30')}>
      <QueueCard {...props} handle={{ ...attributes, ...listeners }} />
    </div>
  );
}

function QueueCard({ req, overlay, handle, onMove, onResults, onIssue, roleId }) {
  const vd = verdict(req);
  const crit = req.priority === 'Critical' && req.status !== 'certified';
  const st = req.status;
  return (
    <motion.article
      layout={!overlay}
      className={cn(
        'group relative rounded-xl border bg-white p-3 shadow-sm transition dark:bg-graphite-850',
        crit ? 'border-red-500/60 shadow-[0_0_0_1px_rgba(239,68,68,.25),0_8px_24px_-8px_rgba(239,68,68,.45)]' : 'border-slate-200 dark:border-white/10',
        overlay && 'rotate-2 scale-105 shadow-glow',
      )}
      aria-label={`${req.id}, ${productName(req.product)}, ${req.priority}`}
    >
      {crit && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-red-500" aria-hidden="true" />}
      <div className="flex items-start gap-1.5">
        <button {...handle} className="-my-1.5 -ml-2.5 cursor-grab touch-none rounded-lg p-2 muted hover:text-orange-500 active:cursor-grabbing" aria-label={`Drag ${req.id}. Press space to pick up, arrow keys to move.`}>
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/requests/${req.id}`} className="-my-1.5 inline-block py-1.5 font-mono text-sm font-semibold hover:text-orange-500">{req.id}</Link>
            <PriorityBadge priority={req.priority} className="!px-2 !text-[10px]" />
          </div>
          <div className="mt-0.5 truncate text-sm">{productName(req.product)}</div>
          <div className="truncate font-mono text-[11px] muted">{unitName(req.unit)} · {req.point}</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="progressbar" aria-valuenow={vd.entered} aria-valuemax={vd.total} aria-label="Results entered">
            <div className={cn('h-full rounded-full', vd.failed ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-orange-500')} style={{ width: `${(vd.entered / Math.max(1, vd.total)) * 100}%` }} />
          </div>
          <span className="font-mono text-[10px] muted">{vd.entered}/{vd.total}</span>
          {vd.failed > 0 && <FlagBadge flag="FAIL" className="!px-1.5 !py-0 !text-[9px]" />}
        </div>
        {st !== 'certified' && <Countdown to={req.dueAt} label={false} />}
      </div>

      {crit && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300">
          <Siren className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" /> Shipment hold · <Countdown to={req.dueAt} className="!text-[11px]" />
        </div>
      )}
      {req.issues?.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {req.issues[req.issues.length - 1].type}
        </div>
      )}

      {!overlay && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/5">
          {st === 'submitted' && <QA icon={PackageCheck} onClick={() => onMove(req, 'received')}>Mark received</QA>}
          {st === 'received' && <QA icon={Play} onClick={() => onMove(req, 'analysis')}>Start analysis</QA>}
          {(st === 'analysis' || st === 'received') && <QA icon={PencilLine} onClick={() => onResults(req.id)}>Enter results</QA>}
          {st === 'analysis' && vd.complete && <QA icon={ClipboardCheck} onClick={() => onMove(req, 'qc')}>Send to QC</QA>}
          {st === 'qc' && roleId === 'supervisor' && <QA icon={BadgeCheck} onClick={() => onMove(req, 'certified')}>Certify</QA>}
          {st === 'qc' && roleId !== 'supervisor' && <QA icon={PencilLine} onClick={() => onResults(req.id)}>Edit results</QA>}
          {st !== 'certified' && <QA icon={Flag} onClick={() => onIssue(req.id)} tone="warn">Flag issue</QA>}
          <Link to={`/requests/${req.id}`} className="-my-1 ml-auto rounded-lg p-2 muted hover:text-orange-500" aria-label={`Open ${req.id}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}
    </motion.article>
  );
}

function QA({ icon: I, children, onClick, tone }) {
  return (
    <button onClick={onClick} className={cn('inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition', tone === 'warn' ? 'border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300' : 'border-slate-200 hover:border-orange-500/50 hover:text-orange-600 dark:border-white/10 dark:hover:text-amber-300')}>
      <I className="h-3 w-3" aria-hidden="true" /> {children}
    </button>
  );
}

function ResultsModal({ req, onClose, onMove }) {
  const { enterResults, toast } = useApp();
  const [vals, setVals] = useState(() => Object.fromEntries(req.tests.map((t) => [t, req.results?.[t]?.value ?? ''])));
  const [touched, setTouched] = useState({});
  if (!req) return null;

  const errorFor = (tid) => {
    const v = vals[tid];
    if (v === '' || v === null) return null;
    const t = testById(tid);
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Enter a number';
    if (n < t.range[0] || n > t.range[1]) return `Outside ${t.method} range (${t.range[0]}–${t.range[1]} ${t.unit}). Check dilution or units.`;
    if (tid === 'copper' && !Number.isInteger(n)) return 'Copper strip class is a whole number 1–4';
    return null;
  };
  const errors = req.tests.filter((t) => errorFor(t));
  const filled = req.tests.filter((t) => vals[t] !== '' && !errorFor(t)).length;

  const save = async (sendQC) => {
    setTouched(Object.fromEntries(req.tests.map((t) => [t, true])));
    if (errors.length) {
      toast({ tone: 'error', title: `${errors.length} result(s) failed validation`, message: 'Fix the highlighted values before saving.' });
      return;
    }
    onClose();
    const updated = await enterResults(req.id, vals);
    if (!updated) return; // error toast already shown, values rolled back
    toast({ title: `Results saved for ${req.id}`, message: `${filled} of ${req.tests.length} parameters entered.` });
    if (sendQC) onMove(updated, 'qc');
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={FlaskConical}
      title={`Enter results · ${req.id}`}
      footer={
        <>
          <span className="mr-auto self-center font-mono text-xs muted">{filled}/{req.tests.length} valid</span>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-ghost" onClick={() => save(false)}>Save draft results</button>
          <button className="btn-primary" disabled={filled !== req.tests.length} onClick={() => save(true)}>Save & send to QC</button>
        </>
      }
    >
      <p className="mb-3 text-sm muted">
        {productName(req.product)} · {req.point}. Values are checked against method ranges, and the spec flag updates live.
      </p>
      <div className="space-y-2">
        {req.tests.map((tid) => {
          const t = testById(tid);
          const lim = specLimit(req.spec, tid);
          const err = (touched[tid] || vals[tid] !== '') && errorFor(tid);
          const flag = err ? 'PENDING' : evaluate(vals[tid] === '' ? null : vals[tid], lim);
          return (
            <div key={tid} className={cn('grid items-start gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_160px_110px]', err ? 'border-red-400/60 bg-red-500/5' : 'border-slate-200 dark:border-white/10')}>
              <div>
                <label htmlFor={`r-${tid}`} className="text-sm font-semibold">{t.name}</label>
                <div className="font-mono text-[11px] muted">
                  {t.method} · spec {lim?.min !== undefined ? `≥ ${fmtValue(lim.min, tid)}` : ''}{lim?.min !== undefined && lim?.max !== undefined ? ' / ' : ''}{lim?.max !== undefined ? `≤ ${fmtValue(lim.max, tid)}` : ''}{!lim || (lim.min === undefined && lim.max === undefined) ? 'report only' : ''}
                </div>
                {err && <p role="alert" id={`r-${tid}-err`} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{err}</p>}
              </div>
              <div className="relative">
                <input
                  id={`r-${tid}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={vals[tid]}
                  onChange={(e) => setVals((v) => ({ ...v, [tid]: e.target.value }))}
                  onBlur={() => setTouched((x) => ({ ...x, [tid]: true }))}
                  className={cn('input pr-16 text-right font-mono', err && 'input-error')}
                  aria-invalid={!!err}
                  aria-describedby={err ? `r-${tid}-err` : undefined}
                  placeholder="—"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] muted">{t.unit}</span>
              </div>
              <div className="flex items-center sm:justify-end sm:pt-2">
                <FlagBadge flag={flag} />
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function IssueModal({ req, onClose }) {
  const { flagIssue, toast } = useApp();
  const [type, setType] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  if (!req) return null;
  const submit = async () => {
    if (!type) {
      setErr('Choose what is wrong with the sample');
      return;
    }
    onClose();
    if (await flagIssue(req.id, type, note)) toast({ tone: 'warning', title: `Issue flagged on ${req.id}`, message: `${type}. ${req.requester.name} has been notified.` });
  };
  return (
    <Modal open onClose={onClose} title={`Flag issue · ${req.id}`} icon={Flag} size="sm" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Flag issue</button></>}>
      <fieldset>
        <legend className="label">What's wrong?</legend>
        <div className="space-y-1.5" role="radiogroup" aria-invalid={!!err}>
          {ISSUES.map((i) => (
            <label key={i} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm', type === i ? 'border-orange-500 bg-amber-400/10' : 'border-slate-200 dark:border-white/10')}>
              <input type="radio" name="issue" value={i} checked={type === i} onChange={() => { setType(i); setErr(''); }} className="accent-orange-500" />
              {i}
            </label>
          ))}
        </div>
        {err && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{err}</p>}
      </fieldset>
      <label htmlFor="issue-note" className="label mt-4">Note for requester (optional)</label>
      <textarea id="issue-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="e.g. ~40 mL received, need 250 mL for D86" />
    </Modal>
  );
}


