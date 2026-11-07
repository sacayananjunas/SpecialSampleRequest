import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, FileX } from 'lucide-react';
import { Page, EmptyState } from '../components/ui';
import { LogoMark } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { productName, unitName, containerName } from '../data/plantUnits';
import { SPECS } from '../data/specs';
import { fmtDateTime, fmtValue, verdict, fmtDate } from '../lib/utils';

const FLAG_TXT = { PASS: '✓ PASS', 'OFF-SPEC': '▲ OFF-SPEC', FAIL: '✕ FAIL', INFO: 'REPORT', PENDING: '—' };

export default function Certificate() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { requests } = useApp();
  const req = requests.find((r) => r.id === id);

  useEffect(() => {
    if (req && params.get('print')) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [req, params]);

  if (!req || req.status !== 'certified')
    return (
      <Page>
        <div className="glass">
          <EmptyState icon={FileX} title="Certificate not available yet" message="A Certificate of Analysis is issued once the lab supervisor certifies the results." action={<Link to={req ? `/requests/${req.id}` : '/requests'} className="btn-primary">Back to request</Link>} />
        </div>
      </Page>
    );

  const vd = verdict(req);
  const certEvent = [...req.custody].reverse().find((c) => /certified/i.test(c.action));
  const certAt = certEvent?.at ?? req.statusAt;
  const approver = certEvent?.by ?? 'Laboratory Supervisor';
  const analyst = Object.values(req.results)[0]?.by ?? 'Lab Analyst';

  return (
    <Page className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
        <Link to={`/requests/${req.id}`} className="inline-flex items-center gap-1 text-sm muted hover:text-orange-500">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to {req.id}
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF
        </button>
      </div>

      <article className="print-area rounded-2xl border border-slate-300 bg-white p-6 text-slate-900 shadow-xl sm:p-10" aria-label="Certificate of Analysis">
        <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-12" />
            <div>
              <div className="font-display text-2xl font-bold tracking-tight">PetroSync</div>
              <div className="text-xs text-slate-500">Central Laboratory · Bataan Refinery · ISO/IEC 17025 Accredited (demo)</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-bold uppercase tracking-wide">Certificate of Analysis</div>
            <div className="font-mono text-sm">CoA-{req.id.replace('PS-', '')}</div>
            <div className="text-xs text-slate-500">Issued {fmtDateTime(certAt)}</div>
          </div>
        </header>

        <section className="mt-5 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {[
            ['Sample ID', req.id, true],
            ['Product', productName(req.product)],
            ['Sampling point', `${unitName(req.unit)} · ${req.point}`],
            ['Batch / lot', req.batch, true],
            ['Sampled', `${fmtDateTime(req.sampledAt)} by ${req.sampledBy}`],
            ['Received', fmtDateTime(req.custody.find((c) => /received/i.test(c.action))?.at)],
            ['Container', `${req.numSamples} × ${req.volume} ${containerName(req.container)}`],
            ['Specification', SPECS[req.spec]?.name],
            ['Requested by', `${req.requester.name} (${req.requester.dept})`],
            ['Purpose', req.purpose],
          ].map(([k, v, mono]) => (
            <div key={k} className="flex gap-2 border-b border-dotted border-slate-300 py-1">
              <span className="w-32 shrink-0 text-slate-500">{k}</span>
              <span className={mono ? 'font-mono font-semibold' : 'font-medium'}>{v}</span>
            </div>
          ))}
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900 text-left text-xs uppercase tracking-wider text-white">
              <th className="px-2 py-2">Test</th>
              <th className="px-2 py-2">Method</th>
              <th className="px-2 py-2 text-right">Result</th>
              <th className="px-2 py-2">Unit</th>
              <th className="px-2 py-2 text-right">Min</th>
              <th className="px-2 py-2 text-right">Max</th>
              <th className="px-2 py-2">Flag</th>
            </tr>
          </thead>
          <tbody>
            {vd.rows.map((r) => (
              <tr key={r.testId} className="border-b border-slate-200 even:bg-slate-50">
                <td className="px-2 py-1.5">{r.test.name}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{r.test.method}</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmtValue(r.value, r.testId)}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{r.test.unit}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{r.limit?.min !== undefined ? fmtValue(r.limit.min, r.testId) : '—'}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{r.limit?.max !== undefined ? fmtValue(r.limit.max, r.testId) : '—'}</td>
                <td className={`px-2 py-1.5 font-mono text-xs font-bold ${r.flag === 'FAIL' ? 'text-red-700' : r.flag === 'OFF-SPEC' ? 'text-amber-700' : r.flag === 'PASS' ? 'text-emerald-700' : 'text-slate-500'}`}>{FLAG_TXT[r.flag]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={`mt-6 rounded-lg border-2 p-4 text-center font-display text-xl font-bold tracking-tight ${vd.onSpec ? 'border-emerald-600 text-emerald-700' : 'border-red-600 text-red-700'}`}>
          {vd.onSpec ? '✓ ON SPEC – Released' : `✕ OFF SPEC – ${vd.failed} parameter${vd.failed > 1 ? 's' : ''} failed. Not released.`}
        </div>

        <footer className="mt-8 grid items-end gap-6 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <div className="h-10 border-b border-slate-400 font-display text-lg italic text-slate-600">{analyst}</div>
            <div className="mt-1 text-xs text-slate-500">Analysed by · Lab Analyst</div>
          </div>
          <div>
            <div className="h-10 border-b border-slate-400 font-display text-lg italic text-slate-600">{approver}</div>
            <div className="mt-1 text-xs text-slate-500">Approved by · Laboratory Supervisor · {fmtDate(certAt)}</div>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeSVG value={`${window.location.origin}/requests/${req.id}/coa`} size={72} />
            <div className="mt-1 text-[9px] text-slate-500">Verify online</div>
          </div>
        </footer>
        <p className="mt-6 text-[10px] leading-snug text-slate-500">
          Results relate only to the sample as received. OFF-SPEC denotes a result outside the specification limit but within the method's reproducibility. Retesting on the retain sample is recommended. This certificate shall not be reproduced except in full without written approval of the laboratory. PetroSync · Special Sample Lab Analysis Request · Demo document, not valid for commercial use.
        </p>
      </article>
    </Page>
  );
}
