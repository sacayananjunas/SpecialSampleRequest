import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Eye, EyeOff, Loader2, Factory, FlaskConical, ShieldCheck, KeyRound } from 'lucide-react';
import Logo from '../components/Logo';
import { Field, ChoiceGroup } from '../components/FormStep';
import { useApp } from '../context/AppContext';
import { ROLE_HOME } from '../components/Layout';
import { DEPARTMENTS, SITES } from '../data/plantUnits';
import { cn } from '../lib/utils';

const DEMO = [
  { email: 'test@petrosync.com', password: 'Test1234!', who: 'Test User', role: 'Requester', icon: Factory },
  { email: 'daniel@petrosync.com', password: 'Demo1234!', who: 'Daniel Reyes', role: 'Lab Analyst', icon: FlaskConical },
  { email: 'aisha@petrosync.com', password: 'Demo1234!', who: 'Dr. Aisha Rahman', role: 'Lab Supervisor', icon: ShieldCheck },
];

function Shell({ title, subtitle, children, aside }) {
  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:px-8">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500/15 via-orange-600/15 to-red-600/10 blur-3xl" aria-hidden="true" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="glass relative mx-auto w-full max-w-md p-6 shadow-glow sm:p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </motion.div>
      {aside && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }} className="relative hidden lg:block">
          {aside}
        </motion.div>
      )}
    </div>
  );
}

function PasswordInput({ id, error, register, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} className={cn('input pr-11', error && 'input-error')} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...register} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2.5 muted hover:text-orange-500" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('That email address looks incomplete'),
  password: z.string().min(1, 'Enter your password'),
});

export function LoginPage() {
  const { user, authChecked, login, toast } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (authChecked && user) return <Navigate to={params.get('next') || ROLE_HOME[user.role]} replace />;

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      const u = await login(email, password);
      toast({ title: `Welcome back, ${u.name.replace(/^Dr\.\s*/, '').split(' ')[0]}` });
      navigate(params.get('next') || ROLE_HOME[u.role], { replace: true });
    } catch (e) {
      setServerError(e.message);
    }
  };

  return (
    <Shell
      title="Log in"
      subtitle="Track your samples from sampling point to certified result."
      aside={
        <div className="glass p-6">
          <div className="eyebrow">Demo accounts</div>
          <h2 className="mt-2 text-xl font-semibold">Try each role</h2>
          <p className="mt-1 text-sm muted">Click an account to fill in the form. Every role sees a different workflow.</p>
          <ul className="mt-4 space-y-2">
            {DEMO.map((d) => (
              <li key={d.email}>
                <button type="button" onClick={() => { setValue('email', d.email, { shouldValidate: true }); setValue('password', d.password, { shouldValidate: true }); }} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-400/60 hover:bg-amber-400/5 dark:border-white/10">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-600/10 text-orange-700 dark:text-amber-300">
                    <d.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{d.role}</span>
                    <span className="block font-mono text-xs muted">{d.email} · {d.password}</span>
                  </span>
                  <KeyRound className="h-4 w-4 muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className={cn('input', errors.email && 'input-error')} aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" error={errors.password} register={register('password')} autoComplete="current-password" />
        </Field>
        {serverError && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{serverError}</p>}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
        <p className="text-center text-sm muted">
          New to PetroSync?{' '}
          <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="font-semibold text-orange-700 hover:underline dark:text-amber-300">Create an account</Link>
        </p>
        <details className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10 lg:hidden">
          <summary className="cursor-pointer font-semibold">Demo accounts</summary>
          <ul className="mt-2 space-y-1 font-mono">
            {DEMO.map((d) => <li key={d.email}>{d.role}: {d.email} / {d.password}</li>)}
          </ul>
        </details>
      </form>
    </Shell>
  );
}

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name'),
  email: z.string().trim().min(1, 'Enter your work email').email('That email address looks incomplete'),
  password: z.string().min(8, 'Use at least 8 characters').regex(/[A-Za-z]/, 'Include at least one letter').regex(/\d/, 'Include at least one number'),
  department: z.string().min(1, 'Choose your department'),
  site: z.string().min(1, 'Choose your site'),
  role: z.enum(['requester', 'analyst', 'supervisor']),
});

const ROLE_OPTIONS = [
  { value: 'requester', label: 'Requester', hint: 'Submit and track samples' },
  { value: 'analyst', label: 'Lab Analyst', hint: 'Work the lab queue' },
  { value: 'supervisor', label: 'Lab Supervisor', hint: 'Certify results, KPIs' },
];

export function SignupPage() {
  const { user, authChecked, signup, toast } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', department: '', site: 'Bataan Refinery', role: 'requester' },
  });

  if (authChecked && user) return <Navigate to={params.get('next') || ROLE_HOME[user.role]} replace />;

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const u = await signup(data);
      toast({ title: `Welcome to PetroSync, ${u.name.split(' ')[0]}!`, message: 'Your account is ready.' });
      navigate(params.get('next') || (u.role === 'requester' ? '/new' : ROLE_HOME[u.role]), { replace: true });
    } catch (e) {
      if (e.code === 'EMAIL_TAKEN') setError('email', { message: e.message });
      else if (e.fields) Object.entries(e.fields).forEach(([k, m]) => setError(k, { message: m }));
      else setServerError(e.message);
    }
  };

  return (
    <Shell title="Create your account" subtitle="Submit Special Sample Lab Analysis Requests in minutes.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <input id="name" autoComplete="name" className={cn('input', errors.name && 'input-error')} aria-invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label="Work email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className={cn('input', errors.email && 'input-error')} aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number">
          <PasswordInput id="password" error={errors.password} register={register('password')} autoComplete="new-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" htmlFor="department" error={errors.department?.message}>
            <select id="department" className={cn('input', errors.department && 'input-error')} aria-invalid={!!errors.department} {...register('department')}>
              <option value="">Select…</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Site" htmlFor="site" error={errors.site?.message}>
            <select id="site" className="input" {...register('site')}>
              {SITES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="label">Role (demo)</span>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <ChoiceGroup
                name="role"
                options={ROLE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                columns="grid-cols-1 sm:grid-cols-3"
                render={(o) => (
                  <span>
                    <span className="block">{o.label}</span>
                    <span className="block text-[11px] font-normal muted">{o.hint}</span>
                  </span>
                )}
              />
            )}
          />
        </div>
        {serverError && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{serverError}</p>}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-sm muted">
          Already have an account?{' '}
          <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="font-semibold text-orange-700 hover:underline dark:text-amber-300">Log in</Link>
        </p>
      </form>
    </Shell>
  );
}
