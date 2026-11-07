import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Factory, Droplet, FlaskConical, Target, ShieldAlert, ClipboardCheck, ArrowLeft, ArrowRight, Check, Search, Package, ListPlus,
  Upload, FileText, X, Printer, Save, Send, Timer, DollarSign, Trash2, Eye, Plus, AlertTriangle, PartyPopper,
} from 'lucide-react';
import FormStep, { Field, ChoiceGroup, Toggle } from '../components/FormStep';
import { Page, ConfirmDialog } from '../components/ui';
import SampleLabel from '../components/SampleLabel';
import { HazardBadge, hazardList } from '../components/HazardBadge';
import { PriorityBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import {
  SITES, DEPARTMENTS, PROCESS_UNITS, PRODUCTS, CONTAINERS, PURPOSES, FLAM_CLASSES, STORAGE, PRIORITIES, GAS_PRODUCTS,
  productName, unitName, containerName,
} from '../data/plantUnits';
import { TEST_CATALOG, PACKAGES, testById, packageById } from '../data/testCatalog';
import { SPEC_OPTIONS, SPECS } from '../data/specs';
import { cn, estimate, fmtMoney, fmtHours, fmtDateTime } from '../lib/utils';


const STEPS = [
  { title: 'Requester & source', short: 'Source', icon: Factory, desc: 'Who is asking, and where the sample was drawn.' },
  { title: 'Sample details', short: 'Sample', icon: Droplet, desc: 'What is in the container and how it was sampled.' },
  { title: 'Analysis requested', short: 'Analysis', icon: FlaskConical, desc: 'Pick a ready-made test package or build your own from the catalog.' },
  { title: 'Purpose & specification', short: 'Spec', icon: Target, desc: 'Why you need it and which spec the results are checked against.' },
  { title: 'Handling & safety', short: 'Safety', icon: ShieldAlert, desc: 'Declare hazards so reception can handle your sample safely.' },
  { title: 'Review & submit', short: 'Review', icon: ClipboardCheck, desc: 'Double-check, attach documents and send it to the lab.' },
];

const req = (msg) => z.string().trim().min(1, msg);

const schemas = [
  z.object({
    requesterName: z.string().trim().min(2, 'Tell us who is requesting this analysis'),
    dept: req('Choose your department'),
    site: req('Choose the plant or site'),
    unit: req('Choose the process unit the sample came from'),
    point: req('Enter the sampling point or tank number, e.g. TK-205'),
    batch: z.string().optional(),
    costCenter: z.string().trim().regex(/^CC-\d{4}$/, 'Cost center should look like CC-4100'),
  }),
  z
    .object({
      product: req('Choose the product or sample type'),
      numSamples: z.coerce.number({ invalid_type_error: 'Enter how many containers you are sending' }).int('Use a whole number').min(1, 'At least one sample is needed').max(20, 'For more than 20 samples, please split the request'),
      sampledAt: req('When was the sample taken?'),
      sampledBy: z.string().trim().min(2, 'Who drew the sample?'),
      volume: req('How much sample is in each container?'),
      container: req('Choose the container type'),
    })
    .superRefine((v, ctx) => {
      if (v.sampledAt && new Date(v.sampledAt).getTime() > Date.now() + 5 * 60e3) ctx.addIssue({ path: ['sampledAt'], code: 'custom', message: "Sampling time can't be in the future" });
      if (v.product === 'lpg' && !['cylinder', 'fpc'].includes(v.container)) ctx.addIssue({ path: ['container'], code: 'custom', message: 'LPG samples must be in a pressure cylinder (floating-piston preferred)' });
      if (v.product === 'natgas' && !['cylinder', 'gasbag'].includes(v.container)) ctx.addIssue({ path: ['container'], code: 'custom', message: 'Natural gas must be in a pressure cylinder or gas bag' });
      if (!GAS_PRODUCTS.includes(v.product) && v.product && v.container === 'gasbag') ctx.addIssue({ path: ['container'], code: 'custom', message: 'Gas bags are only for gaseous samples. Use a glass bottle or can.' });
      if (v.product === 'gasoline' && v.container === 'glass') ctx.addIssue({ path: ['container'], code: 'custom', message: 'Gasoline for RVP must be in an epoxy-lined can to avoid light-end loss' });
    }),
  z.object({ tests: z.array(z.string()).min(1, 'Pick a test package or at least one individual test') }),
  z.object({ purpose: req('What is this analysis for?'), spec: req('Choose a specification to compare results against') }),
  z
    .object({
      product: z.string().optional(),
      flamClass: req('Select the flammability class (check the SDS)'),
      h2s: z.boolean(),
      h2sPpm: z.any(),
      pressurized: z.boolean(),
      norm: z.boolean(),
      storage: req('Choose a storage condition'),
      retain: z.boolean(),
      instructions: z.string().optional(),
      priority: req('Choose a priority'),
    })
    .superRefine((v, ctx) => {
      if (v.h2s) {
        const n = Number(v.h2sPpm);
        if (v.h2sPpm === '' || v.h2sPpm === undefined || v.h2sPpm === null) ctx.addIssue({ path: ['h2sPpm'], code: 'custom', message: 'H₂S ppm is required when H₂S is present' });
        else if (!Number.isFinite(n) || n <= 0) ctx.addIssue({ path: ['h2sPpm'], code: 'custom', message: 'Enter a positive H₂S concentration in ppm' });
      }
      if (GAS_PRODUCTS.includes(v.product) && !v.pressurized) ctx.addIssue({ path: ['pressurized'], code: 'custom', message: `${v.product === 'lpg' ? 'LPG' : 'Natural gas'} samples are pressurized. Please declare it.` });
      if (v.priority === 'Critical' && (!v.instructions || v.instructions.trim().length < 8)) ctx.addIssue({ path: ['instructions'], code: 'custom', message: 'Critical – Shipment Hold needs a note for the lab (vessel / hold reason)' });
    }),
  z.object({ confirm: z.literal(true, { errorMap: () => ({ message: 'Please confirm the sample is labelled and all hazards are declared' }) }) }),
];

const localNow = () => {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60e3);
  return d.toISOString().slice(0, 16);
};

const defaults = (user) => ({
  requesterName: user.name, dept: user.dept === 'Central Laboratory' ? '' : user.dept, site: user.site, unit: '', point: '', batch: '', costCenter: '',
  product: '', numSamples: '1', sampledAt: localNow(), sampledBy: '', volume: '1 L', container: '',
  packageId: '', tests: [],
  purpose: '', spec: '',
  flamClass: '', h2s: false, h2sPpm: '', pressurized: false, norm: false, storage: 'Ambient', retain: true, instructions: '', priority: 'Routine',
  attachments: [], confirm: false,
});

const RECOMMENDED_CONTAINER = { lpg: 'fpc', natgas: 'cylinder', gasoline: 'can', naphtha: 'can', polymer: 'glass' };
const RECOMMENDED_SPEC = { diesel: 'EN590', gasoline: 'D4814', jet: 'DEFSTAN', crude: 'CRUDE', lpg: 'LPG' };
const FLAM_BY_PRODUCT = { 'Cat 1': FLAM_CLASSES[0], 'Cat 1 (gas)': FLAM_CLASSES[0], 'Cat 3': FLAM_CLASSES[2], 'Cat 4': FLAM_CLASSES[3] };

export default function NewRequest() {
  const { role, addRequest, toast } = useApp();
  const DRAFT_KEY = `petrosync:draft:${role.user.id}`; // drafts are per user, in this browser only
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const stepRef = useRef(0);
  stepRef.current = step;

  const form = useForm({
    defaultValues: defaults(role.user),
    mode: 'onTouched',
    // Validate only the current step's schema; `raw` keeps every form value (zod would strip other steps' fields)
    resolver: (values, ctx, opts) => zodResolver(schemas[stepRef.current], undefined, { raw: true })(values, ctx, opts),
  });
  const { register, control, handleSubmit, watch, setValue, trigger, reset, getValues, formState: { errors, isSubmitting } } = form;
  const v = watch();

  // ---------- autosave draft ----------
  const restored = useRef(false);
  const prevProduct = useRef('');
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d?.values) return;
      prevProduct.current = d.values.product || '';
      reset({ ...defaults(role.user), ...d.values, confirm: false });
      setStep(Math.min(d.step ?? 0, 5));
      setSavedAt(d.savedAt);
      toast({ tone: 'info', title: 'Draft restored', message: `Picked up where you left off (${fmtDateTime(d.savedAt)}).`, action: { label: 'Start fresh instead', onClick: () => discardDraft() } });
    } catch { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (submitted) return;
    const sub = watch((values) => {
      clearTimeout(window.__psDraftT);
      window.__psDraftT = setTimeout(() => {
        const at = new Date().toISOString();
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: { ...values, confirm: false }, step: stepRef.current, savedAt: at }));
          setSavedAt(at);
        } catch { /* storage full */ }
      }, 700);
    });
    return () => sub.unsubscribe();
  }, [watch, submitted]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...JSON.parse(raw), step }));
    } catch { /* ignore */ }
  }, [step]);

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    reset(defaults(role.user));
    setStep(0);
    setSavedAt(null);
    toast({ tone: 'info', title: 'Draft discarded', message: 'Starting a fresh request.' });
  };

  // ---------- smart defaults on product change ----------
  useEffect(() => {
    if (prevProduct.current === v.product || !v.product) return;
    prevProduct.current = v.product;
    const p = PRODUCTS.find((x) => x.id === v.product);
    setValue('container', RECOMMENDED_CONTAINER[v.product] ?? 'glass');
    setValue('flamClass', FLAM_BY_PRODUCT[p.flam] ?? 'Not classified');
    setValue('pressurized', GAS_PRODUCTS.includes(v.product));
    setValue('norm', ['gasoline', 'naphtha'].includes(v.product));
    if (GAS_PRODUCTS.includes(v.product)) setValue('volume', '500 mL');
    if (!getValues('spec') && RECOMMENDED_SPEC[v.product]) setValue('spec', RECOMMENDED_SPEC[v.product]);
    if (!getValues('tests').length) {
      const pkg = PACKAGES.find((x) => x.product === v.product);
      if (pkg) toast({ tone: 'info', title: `Tip: "${pkg.name}" fits ${p.name}`, message: 'You can pick it in step 3.', duration: 3500 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.product]);

  const est = useMemo(() => estimate(v.tests, v.numSamples, v.priority), [v.tests, v.numSamples, v.priority]);

  const next = async () => {
    const ok = await trigger();
    if (!ok) {
      toast({ tone: 'error', title: 'A few fields need attention', message: 'Check the highlighted fields below.', duration: 3000 });
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 50);
      return;
    }
    setDir(1);
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };
  const goto = (i) => {
    if (i < step) {
      setDir(-1);
      setStep(i);
    }
  };

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      numSamples: Number(values.numSamples),
      sampledAt: new Date(values.sampledAt).toISOString(),
      h2sPpm: values.h2s ? Number(values.h2sPpm) : '',
      packageId: values.packageId || null,
    };
    delete payload.confirm;
    try {
      const record = await addRequest(payload);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setSubmitted(record);
      toast({ title: `Request ${record.id} submitted`, message: 'Saved to the lab system. Print the label and attach it to the container.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast({ tone: 'error', title: 'Request not submitted', message: `${e.message} Your draft is still saved.`, duration: 7000 });
    }
  };

  if (submitted) return <SuccessView req={submitted} onAnother={() => { reset(defaults(role.user)); setSubmitted(null); setStep(0); setSavedAt(null); }} />;

  const pct = ((step + 1) / STEPS.length) * 100;
  const S = STEPS[step];

  return (
    <Page>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">New request</div>
          <h1 className="text-2xl font-bold sm:text-3xl">Special Sample Lab Analysis Request</h1>
        </div>
        <div className="flex items-center gap-2 text-xs muted">
          <AnimatePresence mode="wait">
            {savedAt && (
              <motion.span key={savedAt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-1.5" aria-live="polite">
                <Save className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> Draft autosaved {fmtDateTime(savedAt).slice(-5)}
              </motion.span>
            )}
          </AnimatePresence>
          {savedAt && (
            <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-white/5" onClick={() => setConfirmDiscard(true)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Discard
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="glass mb-6 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold">
          <span>
            Step {step + 1} of {STEPS.length} · <span className="text-orange-700 dark:text-amber-300">{S.title}</span>
          </span>
          <span className="font-mono muted">{Math.round(pct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Form progress">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 shadow-[0_0_14px_rgba(249,115,22,.6)]" animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
        <ol className="mt-4 grid grid-cols-6 gap-1">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => goto(i)}
                disabled={i >= step}
                aria-current={i === step ? 'step' : undefined}
                className={cn('flex w-full flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-semibold transition sm:text-xs', i < step && 'cursor-pointer hover:bg-amber-400/10', i > step && 'cursor-default')}
              >
                <span className={cn('grid h-7 w-7 place-items-center rounded-full border-2 transition', i < step ? 'border-orange-500 bg-orange-500 text-white' : i === step ? 'border-orange-500 text-orange-700 dark:text-amber-300' : 'border-slate-300 text-slate-400 dark:border-white/15')}>
                  {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : <s.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                </span>
                <span className={cn('hidden sm:block', i === step ? 'text-slate-900 dark:text-white' : 'muted')}>{s.short}</span>
                <span className="sr-only">{i < step ? '(completed, go back)' : ''}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="glass min-w-0 p-5 sm:p-7">
          <AnimatePresence mode="wait" custom={dir}>
            <FormStep key={step} title={S.title} description={S.desc} icon={S.icon} direction={dir}>
              {step === 0 && <Step1 register={register} errors={errors} v={v} setValue={setValue} />}
              {step === 1 && <Step2 register={register} errors={errors} v={v} control={control} />}
              {step === 2 && <Step3 v={v} setValue={setValue} errors={errors} trigger={trigger} />}
              {step === 3 && <Step4 v={v} control={control} errors={errors} register={register} />}
              {step === 4 && <Step5 v={v} control={control} errors={errors} register={register} />}
              {step === 5 && <Step6 v={v} est={est} setValue={setValue} register={register} errors={errors} goto={goto} />}
            </FormStep>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
            <button type="button" onClick={back} disabled={step === 0} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </button>
            {step < 5 ? (
              <button type="button" onClick={next} className="btn-primary">
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting} className="btn-primary px-6">
                <Send className={cn('h-4 w-4', isSubmitting && 'animate-pulse')} aria-hidden="true" /> {isSubmitting ? 'Submitting…' : 'Submit request'}
              </button>
            )}
          </div>
        </form>

        <EstimateCard v={v} est={est} />
      </div>

      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} onConfirm={discardDraft} danger title="Discard this draft?" message="All information entered so far will be cleared. This can't be undone." confirmLabel="Discard draft" />
    </Page>
  );
}

// ---------------- Steps ----------------
function inputCls(err) {
  return cn('input', err && 'input-error');
}

function Step1({ register, errors, v, setValue }) {
  const unit = PROCESS_UNITS.find((u) => u.id === v.unit);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Requester name" htmlFor="requesterName" error={errors.requesterName?.message} required>
        <input id="requesterName" className={inputCls(errors.requesterName)} aria-invalid={!!errors.requesterName} {...register('requesterName')} autoComplete="name" />
      </Field>
      <Field label="Department" htmlFor="dept" error={errors.dept?.message} required>
        <select id="dept" className={inputCls(errors.dept)} aria-invalid={!!errors.dept} {...register('dept')}>
          <option value="">Select department…</option>
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Plant / site" htmlFor="site" error={errors.site?.message} required>
        <select id="site" className={inputCls(errors.site)} aria-invalid={!!errors.site} {...register('site')}>
          <option value="">Select site…</option>
          {SITES.map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Cost center" htmlFor="costCenter" error={errors.costCenter?.message} hint="Format CC-0000" required>
        <input id="costCenter" placeholder="CC-4100" className={cn(inputCls(errors.costCenter), 'font-mono uppercase')} aria-invalid={!!errors.costCenter} {...register('costCenter', { setValueAs: (x) => x.toUpperCase() })} />
      </Field>
      <div className="sm:col-span-2">
        <span className="label">
          Process unit<span className="text-orange-500" aria-hidden="true">*</span>
        </span>
        <div role="radiogroup" aria-label="Process unit" aria-invalid={!!errors.unit} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROCESS_UNITS.map((u) => (
            <label key={u.id} className={cn('cursor-pointer rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-amber-400', v.unit === u.id ? 'border-orange-500 bg-gradient-to-br from-amber-400/15 to-orange-600/10 shadow-glow' : 'border-slate-300 hover:border-amber-400/60 dark:border-white/10', errors.unit && 'border-red-400/60')}>
              <input type="radio" value={u.id} className="sr-only" {...register('unit', { onChange: () => setValue('point', '') })} />
              <div className="font-display text-sm font-semibold">{u.name}</div>
              <div className="text-[11px] muted">{u.full}</div>
            </label>
          ))}
        </div>
        {errors.unit && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.unit.message}</p>}
      </div>
      <Field label="Sampling point / tank no." htmlFor="point" error={errors.point?.message} required>
        <input id="point" list="points" placeholder={unit ? unit.points[0] : 'e.g. TK-205'} className={cn(inputCls(errors.point), 'font-mono')} aria-invalid={!!errors.point} {...register('point')} />
        <datalist id="points">{unit?.points.map((p) => <option key={p} value={p} />)}</datalist>
      </Field>
      <Field label="Batch / lot no." htmlFor="batch" hint="Optional">
        <input id="batch" placeholder="B-2611-A" className="input font-mono" {...register('batch')} />
      </Field>
    </div>
  );
}

function Step2({ register, errors, v, control }) {
  return (
    <div className="grid gap-5">
      <div>
        <span className="label">
          Product / sample type<span className="text-orange-500" aria-hidden="true">*</span>
        </span>
        <Controller
          control={control}
          name="product"
          render={({ field }) => <ChoiceGroup name="product" options={PRODUCTS.map((p) => ({ value: p.id, label: p.name }))} value={field.value} onChange={field.onChange} error={errors.product} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />}
        />
        {errors.product && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.product.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Number of samples" htmlFor="numSamples" error={errors.numSamples?.message} required>
          <input id="numSamples" type="number" min="1" max="20" inputMode="numeric" className={cn(inputCls(errors.numSamples), 'font-mono')} aria-invalid={!!errors.numSamples} {...register('numSamples')} />
        </Field>
        <Field label="Sampling date / time" htmlFor="sampledAt" error={errors.sampledAt?.message} required>
          <input id="sampledAt" type="datetime-local" className={cn(inputCls(errors.sampledAt), 'font-mono')} aria-invalid={!!errors.sampledAt} {...register('sampledAt')} />
        </Field>
        <Field label="Sampled by" htmlFor="sampledBy" error={errors.sampledBy?.message} required>
          <input id="sampledBy" list="samplers" placeholder="Name / inspector" className={inputCls(errors.sampledBy)} aria-invalid={!!errors.sampledBy} {...register('sampledBy')} />
          <datalist id="samplers">
            {['J. Dela Cruz (Field Operator)', 'SGS Inspector', 'Intertek Inspector'].map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <Field label="Volume per container" htmlFor="volume" error={errors.volume?.message} required>
          <select id="volume" className={cn(inputCls(errors.volume), 'font-mono')} aria-invalid={!!errors.volume} {...register('volume')}>
            {['100 mL', '250 mL', '500 mL', '1 L', '2 L', '4 L', '5 kg'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
      </div>
      <div>
        <span className="label">
          Container type<span className="text-orange-500" aria-hidden="true">*</span>
        </span>
        <Controller
          control={control}
          name="container"
          render={({ field }) => <ChoiceGroup name="container" options={CONTAINERS.map((c) => ({ value: c.id, label: c.name }))} value={field.value} onChange={field.onChange} error={errors.container} columns="grid-cols-1 sm:grid-cols-3 lg:grid-cols-5" />}
        />
        {errors.container ? (
          <p role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {errors.container.message}
          </p>
        ) : (
          v.product && <p className="mt-1.5 text-xs muted">Recommended for {productName(v.product)}: {containerName(RECOMMENDED_CONTAINER[v.product] ?? 'glass')}</p>
        )}
      </div>
    </div>
  );
}

function Step3({ v, setValue, errors, trigger }) {
  const [tab, setTab] = useState(v.packageId || !v.tests.length ? 'pkg' : 'custom');
  const [q, setQ] = useState('');
  const [onlyFit, setOnlyFit] = useState(true);
  const pkgs = [...PACKAGES].sort((a, b) => (b.product === v.product) - (a.product === v.product));
  const choosePkg = (p) => {
    setValue('packageId', p.id);
    setValue('tests', [...p.tests], { shouldDirty: true });
    if (!v.spec) setValue('spec', p.spec);
    trigger('tests');
  };
  const toggleTest = (id) => {
    const tests = v.tests.includes(id) ? v.tests.filter((t) => t !== id) : [...v.tests, id];
    setValue('tests', tests, { shouldDirty: true });
    trigger('tests');
  };
  const list = TEST_CATALOG.filter((t) => (!onlyFit || !v.product || t.types.includes(v.product)) && `${t.name} ${t.method}`.toLowerCase().includes(q.toLowerCase()));
  const unfit = v.tests.filter((t) => v.product && !testById(t)?.types.includes(v.product));

  return (
    <div>
      <div className="mb-4 inline-flex rounded-xl border border-slate-300 p-1 dark:border-white/10" role="tablist">
        {[['pkg', 'Test packages', Package], ['custom', 'Individual tests', ListPlus]].map(([id, label, I]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition', tab === id ? 'bg-gradient-to-r from-amber-400 to-orange-600 text-graphite-950' : 'muted hover:text-orange-500')}>
            <I className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {tab === 'pkg' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {pkgs.map((p) => {
            const e = estimate(p.tests, 1, 'Routine');
            const active = v.packageId === p.id;
            const fit = !v.product || p.product === v.product;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => choosePkg(p)}
                aria-pressed={active}
                className={cn('relative rounded-2xl border p-4 text-left transition', active ? 'border-orange-500 bg-gradient-to-br from-amber-400/15 to-orange-600/10 shadow-glow' : 'border-slate-300 hover:-translate-y-0.5 hover:border-amber-400/60 dark:border-white/10', !fit && !active && 'opacity-60')}
              >
                {active && <Check className="absolute right-3 top-3 h-5 w-5 text-orange-500" aria-hidden="true" />}
                {fit && v.product && <span className="mb-1 inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Recommended</span>}
                <div className="pr-6 font-display font-semibold">{p.name}</div>
                <div className="mt-0.5 text-xs muted">{productName(p.product)} · vs {SPECS[p.spec].short}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tests.slice(0, 6).map((t) => <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/5">{testById(t).method.replace('ASTM ', '')}</span>)}
                  {p.tests.length > 6 && <span className="rounded-md px-1.5 py-0.5 font-mono text-[10px] muted">+{p.tests.length - 6}</span>}
                </div>
                <div className="mt-3 flex gap-4 font-mono text-xs">
                  <span><DollarSign className="inline h-3 w-3 text-orange-500" aria-hidden="true" />{fmtMoney(e.base).slice(1)}</span>
                  <span><Timer className="inline h-3 w-3 text-orange-500" aria-hidden="true" /> {fmtHours(e.maxTat)} analysis</span>
                  <span>{p.tests.length} tests</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search tests</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or method, e.g. D445" className="input pl-9" />
            </label>
            {v.product && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyFit} onChange={(e) => setOnlyFit(e.target.checked)} className="h-4 w-4 accent-orange-500" />
                Only tests for {productName(v.product)}
              </label>
            )}
          </div>
          <ul className="max-h-[420px] divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 scrollbar-thin dark:divide-white/5 dark:border-white/10">
            {list.map((t) => {
              const on = v.tests.includes(t.id);
              return (
                <li key={t.id}>
                  <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-amber-50/60 dark:hover:bg-white/[0.03]', on && 'bg-amber-400/10')}>
                    <input type="checkbox" checked={on} onChange={() => toggleTest(t.id)} className="h-4 w-4 accent-orange-500" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="font-mono text-[11px] muted">{t.method} · min {t.minVol}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div>{fmtMoney(t.price)}</div>
                      <div className="muted">{fmtHours(t.tat)}</div>
                    </div>
                  </label>
                </li>
              );
            })}
            {!list.length && <li className="p-6 text-center text-sm muted">No tests match “{q}”. Try a method number like D86.</li>}
          </ul>
        </div>
      )}

      {errors.tests && (
        <p role="alert" className="mt-3 flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {errors.tests.message}
        </p>
      )}
      {unfit.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>
            Heads up: {unfit.map((t) => testById(t).name).join(', ')} {unfit.length > 1 ? 'are' : 'is'} not usually run on {productName(v.product)}. The lab may contact you.
          </span>
        </p>
      )}
      {v.tests.length > 0 && (
        <div className="mt-4">
          <div className="label">Selected ({v.tests.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {v.tests.map((t) => (
              <span key={t} className="chip border-amber-400/40 bg-amber-400/10 text-orange-700 dark:text-amber-200">
                {testById(t).name}
                <button type="button" onClick={() => { setValue('packageId', ''); toggleTest(t); }} aria-label={`Remove ${testById(t).name}`} className="rounded-full hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step4({ v, control, errors }) {
  return (
    <div className="grid gap-6">
      <div>
        <span className="label">
          Purpose<span className="text-orange-500" aria-hidden="true">*</span>
        </span>
        <Controller control={control} name="purpose" render={({ field }) => <ChoiceGroup name="purpose" options={PURPOSES} value={field.value} onChange={field.onChange} error={errors.purpose} />} />
        {errors.purpose && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.purpose.message}</p>}
      </div>
      <div>
        <span className="label">
          Target specification<span className="text-orange-500" aria-hidden="true">*</span>
        </span>
        <Controller
          control={control}
          name="spec"
          render={({ field }) => (
            <ChoiceGroup
              name="spec"
              options={SPEC_OPTIONS.map((s) => ({ value: s.id, label: s.label }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.spec}
              columns="grid-cols-1 sm:grid-cols-2"
              render={(o) => (
                <span>
                  <span className="block">{o.label}</span>
                  <span className="block text-[11px] font-normal muted">{Object.keys(SPECS[o.value].limits).length} parameters with limits</span>
                </span>
              )}
            />
          )}
        />
        {errors.spec && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.spec.message}</p>}
      </div>
      {v.spec && v.tests.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-white/10">
          <div className="font-semibold">Spec coverage</div>
          <p className="mt-0.5 text-xs muted">
            {v.tests.filter((t) => SPECS[v.spec].limits[t]?.min !== undefined || SPECS[v.spec].limits[t]?.max !== undefined).length} of {v.tests.length} selected tests have limits in {SPECS[v.spec].short}. The rest are reported for information.
          </p>
        </div>
      )}
    </div>
  );
}

function Step5({ v, control, errors, register }) {
  return (
    <div className="grid gap-5">
      <Field label="Flammability class" htmlFor="flamClass" error={errors.flamClass?.message} hint={v.product ? `Pre-filled from ${productName(v.product)}. Verify against the SDS.` : undefined} required>
        <select id="flamClass" className={inputCls(errors.flamClass)} aria-invalid={!!errors.flamClass} {...register('flamClass')}>
          <option value="">Select class…</option>
          {FLAM_CLASSES.map((f) => <option key={f}>{f}</option>)}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller control={control} name="h2s" render={({ field }) => <Toggle id="h2s" label="H₂S present" description="Sour samples get special handling" checked={field.value} onChange={field.onChange} />} />
        <Controller
          control={control}
          name="pressurized"
          render={({ field }) => (
            <div>
              <Toggle id="pressurized" label="Pressurized sample" description="Cylinders, LPG, gas" checked={field.value} onChange={field.onChange} />
              {errors.pressurized && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.pressurized.message}</p>}
            </div>
          )}
        />
        <Controller control={control} name="norm" render={({ field }) => <Toggle id="norm" label="NORM / benzene hazard" description="Naturally occurring radioactive material or benzene >0.1%" checked={field.value} onChange={field.onChange} />} />
        <Controller control={control} name="retain" render={({ field }) => <Toggle id="retain" label="Retain sample required" description="Lab keeps a retain for 90 days" checked={field.value} onChange={field.onChange} />} />
      </div>
      <AnimatePresence>
        {v.h2s && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Field label="H₂S concentration (ppm)" htmlFor="h2sPpm" error={errors.h2sPpm?.message} required>
              <input id="h2sPpm" type="number" step="0.1" min="0" inputMode="decimal" placeholder="e.g. 45" className={cn(inputCls(errors.h2sPpm), 'font-mono sm:max-w-xs')} aria-invalid={!!errors.h2sPpm} {...register('h2sPpm')} />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
      <div>
        <span className="label">Storage</span>
        <Controller control={control} name="storage" render={({ field }) => <ChoiceGroup name="storage" options={STORAGE} value={field.value} onChange={field.onChange} />} />
      </div>
      <div>
        <span className="label">
          Priority<span className="text-orange-500" aria-hidden="true">*</span>
        </span>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <ChoiceGroup
              name="priority"
              options={PRIORITIES}
              value={field.value}
              onChange={field.onChange}
              render={(o) => (
                <span>
                  <span className="block">{o === 'Critical' ? 'Critical – Shipment Hold' : o}</span>
                  <span className="block text-[11px] font-normal muted">{{ Routine: '72 h SLA', Urgent: '24 h SLA · +25%', Critical: '8 h SLA · +50%' }[o]}</span>
                </span>
              )}
            />
          )}
        />
      </div>
      <Field label="Special instructions" htmlFor="instructions" error={errors.instructions?.message} hint={v.priority === 'Critical' ? 'Required for Critical: vessel name, hold reason, contact.' : 'Optional'}>
        <textarea id="instructions" rows={3} className={inputCls(errors.instructions)} aria-invalid={!!errors.instructions} placeholder="e.g. MT Pacific Star on hold at Jetty 2 — call ext. 2231 with preliminary results" {...register('instructions')} />
      </Field>
    </div>
  );
}

function Step6({ v, est, setValue, register, errors, goto }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const addFiles = (files) => {
    const list = [...v.attachments, ...[...files].map((f) => ({ name: f.name, size: f.size }))];
    setValue('attachments', list.slice(0, 8), { shouldDirty: true });
  };
  const mock = (name, size) => setValue('attachments', [...v.attachments, { name, size }], { shouldDirty: true });
  const eta = new Date(Date.now() + est.hours * 3600e3);
  const haz = hazardList(v);
  const Section = ({ title, step, children }) => (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button type="button" onClick={() => goto(step)} className="text-xs font-semibold text-orange-700 hover:underline dark:text-amber-300">Edit</button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">{children}</dl>
    </div>
  );
  const Row = ({ k, val, mono }) => (
    <>
      <dt className="muted">{k}</dt>
      <dd className={cn('font-medium', mono && 'font-mono')}>{val || '—'}</dd>
    </>
  );
  return (
    <div className="grid gap-4 print-area">
      <div className="grid gap-3 sm:grid-cols-3">
        {[[DollarSign, 'Estimated cost', fmtMoney(est.cost)], [Timer, 'Estimated turnaround', fmtHours(est.hours)], [Check, 'Expected completion', fmtDateTime(eta.toISOString())]].map(([I, k, val]) => (
          <div key={k} className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-orange-600/5 p-4">
            <I className="h-4 w-4 text-orange-500" aria-hidden="true" />
            <div className="mt-1 text-xs muted">{k}</div>
            <div className="font-mono text-lg font-semibold">{val}</div>
          </div>
        ))}
      </div>
      <Section title="Requester & source" step={0}>
        <Row k="Requester" val={`${v.requesterName} · ${v.dept}`} />
        <Row k="Site / unit" val={`${v.site} · ${unitName(v.unit)}`} />
        <Row k="Sampling point" val={v.point} mono />
        <Row k="Batch / cost center" val={`${v.batch || '—'} · ${v.costCenter}`} mono />
      </Section>
      <Section title="Sample" step={1}>
        <Row k="Product" val={productName(v.product)} />
        <Row k="Samples × volume" val={`${v.numSamples} × ${v.volume}`} mono />
        <Row k="Container" val={containerName(v.container)} />
        <Row k="Sampled" val={`${fmtDateTime(v.sampledAt)} · ${v.sampledBy}`} />
      </Section>
      <Section title="Analysis, purpose & spec" step={2}>
        <Row k="Package" val={packageById(v.packageId)?.name ?? 'Custom selection'} />
        <Row k="Tests" val={`${v.tests.length} tests`} />
        <Row k="Purpose" val={v.purpose} />
        <Row k="Specification" val={SPECS[v.spec]?.name} />
      </Section>
      <Section title="Handling & safety" step={4}>
        <Row k="Priority" val={<PriorityBadge priority={v.priority} long />} />
        <Row k="Storage / retain" val={`${v.storage} · ${v.retain ? 'Retain' : 'No retain'}`} />
        <dt className="muted">Hazards</dt>
        <dd className="flex flex-wrap gap-1">{haz.length ? haz.map(([t, l]) => <HazardBadge key={l} type={t}>{l}</HazardBadge>) : 'None declared'}</dd>
      </Section>

      <div className="no-print">
        <div className="label">Attach documents</div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          className={cn('rounded-xl border-2 border-dashed p-5 text-center transition', drag ? 'border-orange-500 bg-amber-400/10' : 'border-slate-300 dark:border-white/15')}
        >
          <Upload className="mx-auto h-6 w-6 text-orange-500" aria-hidden="true" />
          <p className="mt-2 text-sm">
            Drag SDS or sampling sheet here, or{' '}
            <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-orange-700 underline dark:text-amber-300">browse</button>
          </p>
          <p className="text-xs muted">Mock upload: files stay in your browser (PDF, JPG, up to 8)</p>
          <input ref={fileRef} type="file" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} aria-label="Upload documents" />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={() => mock(`SDS_${productName(v.product).split(' ')[0]}.pdf`, 284000)}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> SDS (mock)</button>
            <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={() => mock(`Sampling_sheet_${(v.point || 'SP').split(' ')[0]}.pdf`, 96000)}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Sampling sheet (mock)</button>
          </div>
        </div>
        {v.attachments.length > 0 && (
          <ul className="mt-3 space-y-2">
            {v.attachments.map((a, i) => (
              <li key={a.name + i} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
                <FileText className="h-4 w-4 text-orange-500" aria-hidden="true" />
                <span className="flex-1 truncate">{a.name}</span>
                <span className="font-mono text-xs muted">{Math.round(a.size / 1024)} KB</span>
                <button type="button" onClick={() => setValue('attachments', v.attachments.filter((_, j) => j !== i))} aria-label={`Remove ${a.name}`} className="rounded p-1 muted hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="no-print">
        <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4', errors.confirm ? 'border-red-400/70 bg-red-500/5' : 'border-slate-300 dark:border-white/10')}>
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-orange-500" aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? 'confirm-error' : undefined} {...register('confirm')} />
          <span className="text-sm">
            I confirm the sample is correctly labelled, the container is sealed, and all hazards (H₂S, pressure, benzene/NORM) are declared accurately.
          </span>
        </label>
        {errors.confirm && <p id="confirm-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.confirm.message}</p>}
        <button type="button" onClick={() => window.print()} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold muted hover:text-orange-500">
          <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print request form
        </button>
      </div>
    </div>
  );
}

function EstimateCard({ v, est }) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Request estimate">
      <div className="glass relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" aria-hidden="true" />
        <div className="eyebrow">Live estimate</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs muted">Cost</div>
            <motion.div key={est.cost} initial={{ scale: 1.15, opacity: 0.55 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-2xl font-semibold">
              {fmtMoney(est.cost)}
            </motion.div>
          </div>
          <div>
            <div className="text-xs muted">Turnaround</div>
            <div className="font-mono text-2xl font-semibold">{est.count ? fmtHours(est.hours) : '—'}</div>
          </div>
        </div>
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="muted">Product</span><span className="font-medium">{v.product ? productName(v.product) : '—'}</span></div>
          <div className="flex justify-between"><span className="muted">Unit / point</span><span className="font-mono text-xs">{v.unit ? `${unitName(v.unit)} · ${v.point || '…'}` : '—'}</span></div>
          <div className="flex justify-between"><span className="muted">Tests</span><span className="font-mono">{est.count} × {v.numSamples || 1}</span></div>
          <div className="flex items-center justify-between"><span className="muted">Priority</span><PriorityBadge priority={v.priority} /></div>
        </div>
        {v.tests.length > 0 && (
          <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto border-t border-slate-200 pt-3 text-xs scrollbar-thin dark:border-white/10">
            {v.tests.map((t) => {
              const x = testById(t);
              return (
                <li key={t} className="flex justify-between gap-2">
                  <span className="truncate">{x.name}</span>
                  <span className="shrink-0 font-mono muted">{fmtMoney(x.price)} · {x.tat}h</span>
                </li>
              );
            })}
          </ul>
        )}
        {!v.tests.length && <p className="mt-4 text-xs muted">Pick tests in step 3 to see cost and turnaround.</p>}
      </div>
    </aside>
  );
}

function SuccessView({ req: r, onAnother }) {
  return (
    <Page>
      <div className="relative mx-auto max-w-3xl">
        <div className="pointer-events-none absolute inset-x-0 -top-10 flex justify-center" aria-hidden="true">
          {[...Array(14)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-2 w-2 rounded-sm"
              style={{ background: ['#fbbf24', '#f97316', '#ea580c', '#34d399'][i % 4] }}
              initial={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
              animate={{ y: 120 + (i % 5) * 30, x: (i - 7) * 32, opacity: 0, rotate: 360 }}
              transition={{ duration: 1.6, delay: i * 0.03, ease: 'easeOut' }}
            />
          ))}
        </div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-6 text-center sm:p-8 no-print">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,.5)]">
            <PartyPopper className="h-8 w-8" aria-hidden="true" />
          </motion.div>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Request submitted</h1>
          <p className="mt-1 muted">Your sample ID is</p>
          <div className="mt-1 font-mono text-3xl font-bold text-gradient">{r.id}</div>
          <p className="mx-auto mt-3 max-w-md text-sm muted">
            Print this label and attach it to the container before it leaves the {unitName(r.unit)}. The lab is notified, and reception will scan the QR code on arrival.
          </p>
        </motion.div>
        <div className="mt-6 print-area">
          <SampleLabel req={r} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 no-print">
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Print label
          </button>
          <Link to={`/requests/${r.id}`} className="btn-ghost">
            <Eye className="h-4 w-4" aria-hidden="true" /> View request
          </Link>
          <button className="btn-ghost" onClick={onAnother}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New request
          </button>
        </div>
      </div>
    </Page>
  );
}
