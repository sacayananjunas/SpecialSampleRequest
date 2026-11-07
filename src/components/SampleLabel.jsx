import { QRCodeSVG } from 'qrcode.react';
import { GhsPictogram, pictogramsFor } from './HazardBadge';
import { productName, unitName, containerName } from '../data/plantUnits';
import { fmtDateTime } from '../lib/utils';

/** Printable sample label (always black on white, ~100 × 70 mm) */
export default function SampleLabel({ req }) {
  const qrPayload = JSON.stringify({ id: req.id, p: req.product, u: req.unit, pt: req.point, pr: req.priority, url: `${window.location.origin}/requests/${req.id}` });
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-xl border-2 border-black bg-white p-4 font-sans text-black shadow-xl" style={{ aspectRatio: '10 / 7' }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
          <div className="font-display text-sm font-bold tracking-tight">PetroSync · LAB SAMPLE</div>
          <div className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${req.priority === 'Critical' ? 'bg-black text-white' : 'border border-black'}`}>
            {req.priority === 'Critical' ? 'CRITICAL – SHIPMENT HOLD' : req.priority}
          </div>
        </div>
        <div className="flex flex-1 gap-3 pt-2">
          <div className="flex flex-col items-center justify-between">
            <QRCodeSVG value={qrPayload} size={104} level="M" />
            <div className="mt-1 font-mono text-[8px]">Scan to open request</div>
          </div>
          <div className="min-w-0 flex-1 text-[10.5px] leading-snug">
            <div className="font-mono text-lg font-bold leading-tight tracking-tight">{req.id}</div>
            <div className="font-semibold">{productName(req.product)}</div>
            <div>{unitName(req.unit)} · {req.point}</div>
            <div>Batch <span className="font-mono">{req.batch}</span></div>
            <div>Sampled <span className="font-mono">{fmtDateTime(req.sampledAt)}</span></div>
            <div>{containerName(req.container)} · {req.volume} · ×{req.numSamples}</div>
            <div className="font-semibold">Storage: {req.storage}{req.h2s ? ` · H₂S ${req.h2sPpm} ppm` : ''}</div>
          </div>
        </div>
        <div className="flex items-end justify-between border-t border-black pt-1.5">
          <div className="flex gap-1">
            {pictogramsFor(req).map((p) => (
              <GhsPictogram key={p} type={p} size={30} />
            ))}
          </div>
          <div className="text-right text-[8px] leading-tight">
            Special Sample Lab
            <br />
            Analysis Request
          </div>
        </div>
      </div>
    </div>
  );
}
