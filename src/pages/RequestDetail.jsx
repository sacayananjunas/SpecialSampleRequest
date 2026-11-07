import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, RotateCcw, Printer, CheckCircle2, XCircle, Hourglass, MessageSquare, Send, Truck, User, FlaskConical,
  ShieldCheck, PackageCheck, AlertTriangle, FileText, ClipboardCheck, ArrowRight, SearchX, Tag, Paperclip,
} from 'lucide-react';
import { Page, Card, Modal, ConfirmDialog, EmptyState, Countdown } from '../components/ui';
import Timeline from '../components/Timeline';
import { ResultsTable } from '../components/SpecResultRow';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { HazardBadge, hazardList } from '../components/HazardBadge';
import SampleLabel from '../components/SampleLabel';
import { useApp } from '../context/AppContext';
import { productName, unitName, containerName } from '../data/plantUnits';
import { SPECS } from '../data/specs';
import { STATUSES, statusIndex, fmtDateTime, relTime, verdict, cn, estimate, fmtMoney } from '../lib/utils';

export function VerdictBanner({ req }) {
  const vd = verdict(req);
  let tone, Icon, title, sub;
  if (!vd.entered) {
    tone = 'neutral'; Icon = Hourglass; title = 'AWAITING RESULTS'; sub = `${vd.total} tests queued · checked against ${vd.specName}`;
  } else if (!vd.complete) {
    tone = vd.failed ? 'bad' : 'neutral'; Icon = vd.failed ? AlertTriangle : Hourglass;
    title = vd.failed ? `PRELIMINARY – ${vd.failed} parameter${vd.failed > 1 ? 's' : ''} out of spec` : 'IN PROGRESS – preliminary results on spec';
    sub = `${vd.entered} of ${vd.total} results entered`;
  } else if (vd.onSpec) {
    tone = 'good'; Icon = CheckCircle2;
    title = req.status === 'certified' ? 'ON SPEC – Released' : 'ON SPEC – pending QC certification';
    sub = `All ${vd.total} parameters meet ${vd.specName}`;
  } else {
    tone = 'bad'; Icon = XCircle;
    title = `OFF SPEC – ${vd.failed} parameter${vd.failed > 1 ? 's' : ''} failed`;
    sub = `${vd.total - vd.failed} of ${vd.total} parameters meet ${vd.specName}. ${req.status === 'certified' ? 'Product not released.' : 'Pending QC review.'}`;
  }
  const cls = {
    good: 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-800 dark:text-emerald-200',
    bad: 'border-red-500/40 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-800 dark:text-red-200',
    neutral: 'border-slate-300 bg-slate-100/60 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-graphite-200',
  }[tone];
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn('flex items-center gap-4 rounded-2xl border p-4 sm:p-5', cls)} role="status">
      <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl', tone === 'good' ? 'bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,.5)]' : tone === 'bad' ? 'bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,.5)]' : 'bg-slate-200 dark:bg-white/10')}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <div className="font-display text-lg font-bold tracking-tight sm:text-xl">{title}</div>
        <div className="text-sm opacity-80">{sub}</div>
      </div>
    </motion.div>
  );
}

const CUSTODY_ICON = (a) => (/submitted/i.test(a) ? Send : /received/i.test(a) ? PackageCheck : /analysis|Results entered/i.test(a) ? FlaskConical : /certif|QC/i.test(a) ? ShieldCheck : /issue/i.test(a) ? AlertTriangle : /retain/i.test(a) ? Tag : Truck);

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests, addComment, moveStatus, requestRetest, role, roleId, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const req = requests.find((r) => r.id === id);
  const [label, setLabel] = useState(false);
  const [retest, setRetest] = useState(false);
  const [comment, setComment] = useState('');
  const [commentErr, setCommentErr] = useState('');

  if (!req)
    return (
      <Page>
        <div className="glass">
          <EmptyState icon={SearchX} title={`We couldn't find ${id}`} message="The sample ID may be mistyped, or the request was removed when demo data was reset." action={<Link to="/requests" className="btn-primary">Back to requests</Link>} />
        </div>
      </Page>
    );

  const vd = verdict(req);
  const hz = hazardList(req);
  const idx = statusIndex(req.status);
  const est = estimate(req.tests, req.numSamples, req.priority);
  const retests = requests.filter((r) => r.retestOf === req.id);

  const doRetest = async () => {
    const created = await requestRetest(req.id);
    if (!created) return;
    toast({ title: "Retest " + created.id + " created", message: created.tests.length + " parameter(s) will be re-run from the retain sample." });
    navigate("/requests/" + created.id);
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (comment.trim().length < 2) {
      setCommentErr('Write a short message before sending');
      return;
    }
    const text = comment.trim();
    setComment('');
    setCommentErr('');
    if (!(await addComment(req.id, text))) {
      setComment(text); // keep what they typed so they can retry
      return;
    }
    toast({ title: 'Comment posted', message: roleId === 'requester' ? 'The lab has been notified.' : 'The requester has been notified.', duration: 2500 });
  };

  const nextStatus = STATUSES[idx + 1];
  const canAdvance = (roleId === 'analyst' && idx < 3) || (roleId === 'supervisor' && idx < 4);
  const needResults = nextStatus?.id === 'qc' && !vd.complete;

  return (
    <Page>
      <Link to="/requests" className="mb-2 inline-flex min-h-[40px] items-center gap-1 text-sm muted hover:text-orange-500">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All requests
      </Link>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow">{req.packageName}</div>
          <h1 className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{req.id}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{productName(req.product)}</span>
            <span className="muted">·</span>
            <span className="muted">{unitName(req.unit)}</span>
            <span className="font-mono text-xs muted">{req.point}</span>
            <PriorityBadge priority={req.priority} long />
            <StatusBadge status={req.status} />
            {req.status !== 'certified' && <Countdown to={req.dueAt} />}
          </div>
          {req.retestOf && (
            <div className="mt-2 text-xs muted">
              Retest of <Link className="font-mono font-semibold text-orange-700 hover:underline dark:text-amber-300" to={`/requests/${req.retestOf}`}>{req.retestOf}</Link>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setLabel(true)}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Label
          </button>
          <button className="btn-ghost" onClick={() => setRetest(true)} disabled={idx < 3}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Request Retest
          </button>
          <button
            className="btn-primary"
            disabled={req.status !== 'certified'}
            title={req.status !== 'certified' ? 'Available once results are certified' : undefined}
            onClick={() => navigate(`/requests/${req.id}/coa?print=1`)}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download Certificate of Analysis (CoA)
          </button>
        </div>
      </div>

      {req.issues?.length > 0 && (
        <div className="mb-4 space-y-2">
          {req.issues.map((iss, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <span className="font-semibold">Lab flagged an issue: {iss.type}.</span>{' '}
                <span className="muted">{iss.by} · {fmtDateTime(iss.at)}{iss.note ? ` · ${iss.note}` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card className="mb-5">
        <Timeline status={req.status} custody={req.custody} />
        {canAdvance && nextStatus && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
            <span className="text-sm muted">
              {needResults ? `Enter all ${vd.total} results in the Lab Queue before sending to QC review.` : <>Next step: <span className="font-semibold text-slate-800 dark:text-graphite-100">{nextStatus.label}</span></>}
            </span>
            <div className="flex gap-2">
              {roleId !== 'requester' && <Link to="/lab" className="btn-ghost">Open Lab Queue</Link>}
              <button className="btn-primary" disabled={needResults || busy} onClick={async () => { setBusy(true); const ok = await moveStatus(req.id, nextStatus.id); setBusy(false); if (ok) toast({ title: req.id + " → " + nextStatus.label }); }}>
                {nextStatus.id === 'certified' ? 'Certify & release' : `Move to ${nextStatus.short}`} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <VerdictBanner req={req} />
          <Card className="!p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
              <h2 className="text-lg font-semibold">Results</h2>
              <span className="text-xs muted">vs {SPECS[req.spec]?.name}</span>
            </div>
            <div className="p-2 sm:p-3">
              <ResultsTable rows={vd.rows} />
            </div>
            <p className="px-5 pb-4 text-xs muted">
              <strong>PASS</strong> within limits · <strong>OFF-SPEC</strong> outside the limit but within method reproducibility (retest advised) · <strong>FAIL</strong> clearly outside limits · <strong>REPORT</strong> no limit, for information.
            </p>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Request information</h2>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Requester', `${req.requester.name}`, req.requester.dept],
                ['Site', req.site],
                ['Process unit', unitName(req.unit), req.point],
                ['Batch / lot', req.batch, null, true],
                ['Cost center', req.costCenter, null, true],
                ['Purpose', req.purpose],
                ['Samples', `${req.numSamples} × ${req.volume}`, containerName(req.container)],
                ['Sampled', fmtDateTime(req.sampledAt), req.sampledBy],
                ['Specification', SPECS[req.spec]?.short],
                ['Storage', req.storage, req.retain ? 'Retain sample required' : 'No retain'],
                ['Estimated cost', fmtMoney(est.cost), `${req.tests.length} tests`],
                ['Due', fmtDateTime(req.dueAt)],
              ].map(([k, val, sub, mono]) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider muted">{k}</dt>
                  <dd className={cn('font-medium', mono && 'font-mono')}>{val}</dd>
                  {sub && <dd className="text-xs muted">{sub}</dd>}
                </div>
              ))}
            </dl>
            {hz.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200 pt-4 dark:border-white/10">
                {hz.map(([t, l]) => <HazardBadge key={l} type={t}>{l}</HazardBadge>)}
              </div>
            )}
            {req.instructions && (
              <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
                <div className="text-[11px] font-semibold uppercase tracking-wider muted">Special instructions</div>
                {req.instructions}
              </div>
            )}
            {req.attachments?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {req.attachments.map((a) => (
                  <span key={a.name} className="chip border-slate-300 dark:border-white/10">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {a.name}
                  </span>
                ))}
              </div>
            )}
            {retests.length > 0 && (
              <div className="mt-4 text-sm">
                Retests:{' '}
                {retests.map((r) => (
                  <Link key={r.id} to={`/requests/${r.id}`} className="mr-2 font-mono font-semibold text-orange-700 hover:underline dark:text-amber-300">{r.id}</Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <ClipboardCheck className="h-5 w-5 text-orange-500" aria-hidden="true" /> Chain of custody
            </h2>
            <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5 dark:border-white/10">
              {req.custody.map((c, i) => {
                const I = CUSTODY_ICON(c.action);
                return (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                    <span className="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border-2 border-orange-500 bg-white text-orange-700 dark:bg-graphite-900 dark:text-amber-300">
                      <I className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <div className="text-sm font-semibold">{c.action}</div>
                    <div className="text-xs muted">
                      <User className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      {c.by} · {c.role}
                    </div>
                    {c.note && <div className="text-xs muted">{c.note}</div>}
                    <time className="font-mono text-[11px] muted" dateTime={c.at}>{fmtDateTime(c.at)}</time>
                  </motion.li>
                );
              })}
            </ol>
          </Card>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-orange-500" aria-hidden="true" /> Comments
              <span className="ml-auto font-mono text-xs muted">{req.comments.length}</span>
            </h2>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1 scrollbar-thin" aria-live="polite">
              {req.comments.length === 0 && <p className="py-4 text-center text-sm muted">No comments yet. Ask the lab anything about this sample.</p>}
              {req.comments.map((c) => {
                const mine = c.by === role.user.name;
                const lab = c.role === 'Lab';
                return (
                  <div key={c.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm', mine ? 'rounded-br-md bg-gradient-to-br from-amber-400 to-orange-500 text-graphite-950' : lab ? 'rounded-bl-md border border-sky-400/30 bg-sky-400/10' : 'rounded-bl-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]')}>
                      <div className={cn('mb-0.5 text-[11px] font-semibold', mine ? 'text-graphite-900/80' : 'muted')}>
                        {c.by} · {c.role} · {relTime(c.at)}
                      </div>
                      {c.text}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={sendComment} className="mt-4">
              <label htmlFor="comment" className="sr-only">Write a comment</label>
              <div className="flex gap-2">
                <input id="comment" value={comment} onChange={(e) => { setComment(e.target.value); setCommentErr(''); }} placeholder={roleId === 'requester' ? 'Message the lab…' : 'Message the requester…'} className={cn('input', commentErr && 'input-error')} aria-invalid={!!commentErr} aria-describedby={commentErr ? 'comment-err' : undefined} />
                <button type="submit" className="btn-primary !px-3" aria-label="Send comment">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {commentErr && <p id="comment-err" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{commentErr}</p>}
            </form>
          </Card>

          <Card className="text-sm">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-orange-500" aria-hidden="true" /> Documents
            </h2>
            <button className="flex w-full items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/5" disabled={req.status !== 'certified'} onClick={() => navigate(`/requests/${req.id}/coa`)}>
              Certificate of Analysis <span className="font-mono text-xs muted">{req.status === 'certified' ? 'PDF' : 'pending'}</span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setLabel(true)}>
              Sample label (QR) <span className="font-mono text-xs muted">print</span>
            </button>
          </Card>
        </div>
      </div>

      <Modal open={label} onClose={() => setLabel(false)} title="Sample label" icon={Tag} footer={<><button className="btn-ghost" onClick={() => setLabel(false)}>Close</button><button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print label</button></>}>
        <div className="print-area py-2">
          <SampleLabel req={req} />
        </div>
      </Modal>

      <ConfirmDialog
        open={retest}
        onClose={() => setRetest(false)}
        onConfirm={doRetest}
        title="Request a retest?"
        message={vd.failed ? `A new request will be created to re-run the ${vd.failed} failed parameter(s) on the retain sample, at Urgent priority.` : 'A new request will be created to re-run all tests on the retain sample.'}
        confirmLabel="Create retest"
      />
    </Page>
  );
}
