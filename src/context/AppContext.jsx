import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ROLES } from '../data/people';
import { hydrateCatalog } from '../data/catalog';
import { api, setApiHandlers } from '../lib/api';
import { statusLabel } from '../lib/utils';

const AppCtx = createContext(null);
const THEME_KEY = 'petrosync:theme';

const safeGet = (k) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const safeSet = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* storage unavailable */ }
};

const ROLE_LABEL = { requester: 'Requester', analyst: 'Lab Analyst', supervisor: 'Lab Supervisor' };

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [requests, setRequests] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [dbDown, setDbDown] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [theme, setTheme] = useState(() => (safeGet(THEME_KEY) === 'light' ? 'light' : 'dark'));
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    safeSet(THEME_KEY, theme);
  }, [theme]);

  const toast = useCallback((opts) => {
    const id = ++toastId.current;
    const t = { id, tone: 'success', duration: 4500, ...(typeof opts === 'string' ? { title: opts } : opts) };
    setToasts((x) => [...x, t]);
    if (t.duration) setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.duration);
    return id;
  }, []);
  const dismissToast = useCallback((id) => setToasts((x) => x.filter((y) => y.id !== id)), []);

  const errorToast = useCallback((e, title = 'That didn’t work') => toast({ tone: 'error', title, message: e.message, duration: 6000 }), [toast]);

  // ---------- session + data loading ----------
  const loadData = useCallback(async (u) => {
    setDataReady(false);
    setBootError(null);
    try {
      const lab = u.role !== 'requester';
      const [catalog, list, inst] = await Promise.all([api('/catalog'), api('/requests'), lab ? api('/instruments') : Promise.resolve({ instruments: [] })]);
      hydrateCatalog(catalog);
      setRequests(list.requests);
      setInstruments(inst.instruments);
      setDataReady(true);
    } catch (e) {
      setBootError(e);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const { user: u } = await api('/auth/me');
      setUser(u);
      if (u) await loadData(u);
      setBootError(null);
    } catch (e) {
      setBootError(e);
    } finally {
      setAuthChecked(true);
    }
  }, [loadData]);

  useEffect(() => {
    setApiHandlers({
      onUnavailable: setDbDown,
      onUnauthenticated: () => {
        setUser(null);
        setRequests([]);
        setDataReady(false);
      },
    });
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email, password) => {
    const { user: u } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(u);
    loadData(u);
    return u;
  }, [loadData]);

  const signup = useCallback(async (data) => {
    const { user: u } = await api('/auth/signup', { method: 'POST', body: data });
    setUser(u);
    loadData(u);
    return u;
  }, [loadData]);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* clear locally anyway */ }
    setUser(null);
    setRequests([]);
    setInstruments([]);
    setDataReady(false);
  }, []);

  // ---------- request actions ----------
  const replace = useCallback((r) => setRequests((list) => (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [r, ...list])), []);
  const refreshRequests = useCallback(async () => {
    const { requests: list } = await api('/requests');
    setRequests(list);
  }, []);

  const addRequest = useCallback(async (payload) => {
    const { request } = await api('/requests', { method: 'POST', body: payload });
    setRequests((list) => [request, ...list]);
    return request;
  }, []);

  /** Optimistically patch a request, call the API, then reconcile or roll back. */
  const optimistic = useCallback(async (id, patch, path, body, errTitle) => {
    let before;
    setRequests((list) => list.map((r) => {
      if (r.id !== id) return r;
      before = r;
      return { ...r, ...(typeof patch === 'function' ? patch(r) : patch) };
    }));
    try {
      const { request } = await api(`/requests/${id}/${path}`, { method: 'POST', body });
      replace(request);
      return request;
    } catch (e) {
      if (before) setRequests((list) => list.map((r) => (r.id === id ? before : r)));
      errorToast(e, errTitle);
      return null;
    }
  }, [replace, errorToast]);

  const moveStatus = useCallback(
    (id, status, note) =>
      optimistic(id, (r) => ({ status, statusAt: new Date().toISOString(), custody: [...r.custody, { at: new Date().toISOString(), by: user?.name, role: ROLE_LABEL[user?.role], action: `Status → ${statusLabel(status)}`, note: note || '' }] }), 'status', { status, note }, `Couldn't move ${id}`),
    [optimistic, user],
  );

  const enterResults = useCallback(
    (id, values) =>
      optimistic(id, (r) => {
        const results = { ...r.results };
        Object.entries(values).forEach(([k, v]) => { if (v !== '' && v !== null) results[k] = { value: Number(v), by: user?.name, at: new Date().toISOString() }; });
        return { results };
      }, 'results', { values }, `Results for ${id} were not saved`),
    [optimistic, user],
  );

  const addComment = useCallback(
    (id, text) =>
      optimistic(id, (r) => ({ comments: [...r.comments, { id: `tmp-${Date.now()}`, at: new Date().toISOString(), by: user?.name, role: user?.role === 'requester' ? 'Requester' : 'Lab', text }] }), 'comments', { text }, 'Comment not sent'),
    [optimistic, user],
  );

  const flagIssue = useCallback(
    (id, type, note) => optimistic(id, (r) => ({ issues: [...(r.issues || []), { type, note, by: user?.name, at: new Date().toISOString() }] }), 'issues', { type, note }, 'Issue not flagged'),
    [optimistic, user],
  );

  const requestRetest = useCallback(async (id) => {
    try {
      const { request } = await api(`/requests/${id}/retest`, { method: 'POST', body: {} });
      setRequests((list) => [request, ...list]);
      refreshRequests().catch(() => {}); // the source request got a custody entry too
      return request;
    } catch (e) {
      errorToast(e, 'Retest not created');
      return null;
    }
  }, [errorToast, refreshRequests]);

  const setInstrumentStatus = useCallback(async (id, status) => {
    const before = instruments;
    setInstruments((list) => list.map((i) => (i.id === id ? { ...i, status, detail: 'Saving…' } : i)));
    try {
      const { instruments: list } = await api('/instruments', { method: 'PATCH', body: { id, status } });
      setInstruments(list);
      return true;
    } catch (e) {
      setInstruments(before);
      errorToast(e, 'Instrument status not saved');
      return false;
    }
  }, [instruments, errorToast]);

  const role = useMemo(
    () => (user ? { ...ROLES[user.role], user: { name: user.name, title: user.title, dept: user.department, site: user.site, initials: user.initials, email: user.email, id: user.id } } : null),
    [user],
  );

  const value = useMemo(
    () => ({
      user, role, roleId: user?.role ?? null, authChecked, dataReady, dbDown, bootError, retryBoot: checkSession,
      login, signup, logout,
      requests, refreshRequests, addRequest, moveStatus, enterResults, addComment, flagIssue, requestRetest,
      instruments, setInstrumentStatus,
      theme, setTheme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      toasts, toast, dismissToast, errorToast,
    }),
    [user, role, authChecked, dataReady, dbDown, bootError, checkSession, login, signup, logout, requests, refreshRequests, addRequest, moveStatus, enterResults, addComment, flagIssue, requestRetest, instruments, setInstrumentStatus, theme, toasts, toast, dismissToast, errorToast],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);
