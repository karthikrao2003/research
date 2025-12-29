import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

// Use environment variable or default to relative path for Vercel deployment
// In Vercel, API routes are at /api, so we use relative path
const API_URL = '/api';

// Debounce hook for performance
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const ResultsCard = ({ results }) => {
    if (!results) return null;

    const status = results.status ?? results.label;
    const totals = results.totals ?? results.nutrients ?? results.total ?? {};
    const requirements = results.requirements ?? {};
    const deficits = results.deficits ?? {};
    const isAdequate = String(status).toLowerCase() === 'adequate';

    const deficitEntries = Object.entries(deficits);

    const fmt = (k) => {
        if (k === 'protein_g') return { name: 'Protein', unit: 'g', accent: 'text-cyan-300' };
        if (k === 'iron_mg') return { name: 'Iron', unit: 'mg', accent: 'text-rose-300' };
        if (k === 'b12_mcg') return { name: 'Vitamin B12', unit: 'mcg', accent: 'text-violet-300' };
        if (k === 'omega3_g') return { name: 'Omega-3', unit: 'g', accent: 'text-amber-300' };
        return { name: k, unit: '', accent: 'text-slate-200' };
    };

    const Metric = ({ label, value, unit, accent }) => (
        <div className={`rounded-xl border border-slate-700 bg-slate-900/40 p-4 shadow-lg`}>
            <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 flex items-end gap-2">
                <div className={`text-2xl font-extrabold ${accent}`}>{Number(value ?? 0).toFixed(2)}</div>
                <div className="pb-1 text-sm text-slate-400">{unit}</div>
            </div>
        </div>
    );

    return (
        <div className="mt-8 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/80 via-slate-900/70 to-slate-950/70 p-6 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="text-sm text-slate-400">ML Prediction</div>
                    <div className="text-2xl font-black text-white">Nutrition Adequacy</div>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${isAdequate ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30' : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30'}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    {status}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Protein" value={totals.protein_g} unit="g" accent="text-cyan-300" />
                <Metric label="Iron" value={totals.iron_mg} unit="mg" accent="text-rose-300" />
                <Metric label="Vitamin B12" value={totals.b12_mcg} unit="mcg" accent="text-violet-300" />
                <Metric label="Omega-3" value={totals.omega3_g} unit="g" accent="text-amber-300" />
                <Metric label="Calories" value={totals.cal_kcal} unit="kcal" accent="text-lime-300" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-700 bg-slate-950/30 p-5">
                    <div className="text-sm font-black text-slate-100">Requirements (based on weight)</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
                        <div className="flex items-center justify-between gap-2"><span className="text-slate-400">Protein</span><span className="font-bold">{Number(requirements.protein_g ?? 0).toFixed(2)} g</span></div>
                        <div className="flex items-center justify-between gap-2"><span className="text-slate-400">Iron</span><span className="font-bold">{Number(requirements.iron_mg ?? 0).toFixed(2)} mg</span></div>
                        <div className="flex items-center justify-between gap-2"><span className="text-slate-400">B12</span><span className="font-bold">{Number(requirements.b12_mcg ?? 0).toFixed(2)} mcg</span></div>
                        <div className="flex items-center justify-between gap-2"><span className="text-slate-400">Omega-3</span><span className="font-bold">{Number(requirements.omega3_g ?? 0).toFixed(2)} g</span></div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/30 p-5">
                    <div className="text-sm font-black text-slate-100">What’s lacking</div>
                    {deficitEntries.length === 0 ? (
                        <div className="mt-3 rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/20">
                            Nothing is lacking — you meet all requirements.
                        </div>
                    ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {deficitEntries.map(([k, v]) => {
                                const meta = fmt(k);
                                return (
                                    <div key={k} className="rounded-full bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200 ring-1 ring-rose-400/20">
                                        <span className={meta.accent}>{meta.name}</span>
                                        <span className="text-slate-400"> — </span>
                                        <span>{Number(v ?? 0).toFixed(2)} {meta.unit} short</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

function useAuth() {
    const [token, setToken] = useState(() => localStorage.getItem('token') || '');
    const [email, setEmail] = useState(() => localStorage.getItem('email') || '');

    const saveAuth = (t, e) => {
        setToken(t);
        setEmail(e);
        localStorage.setItem('token', t);
        localStorage.setItem('email', e);
    };

    const logout = () => {
        setToken('');
        setEmail('');
        localStorage.removeItem('token');
        localStorage.removeItem('email');
    };

    return { token, email, saveAuth, logout, isAuthed: Boolean(token) };
}

const authedAxios = (token) => {
    const instance = axios.create({ baseURL: API_URL });
    instance.interceptors.request.use((config) => {
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
    return instance;
};

function LoginPage({ auth }) {
    const nav = useNavigate();
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setError('');
        setLoading(true);
        try {
            const path = mode === 'register' ? '/auth/register' : '/auth/login';
            const r = await axios.post(`${API_URL}${path}`, { email, password });
            auth.saveAuth(r.data.token, r.data.user?.email || email);
            nav('/');
        } catch (e) {
            setError(e?.response?.data?.detail || 'Login failed. Check server + Mongo config.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-b from-indigo-500/20 via-slate-950 to-slate-950">
                <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
                    <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-slate-200 ring-1 ring-white/10">
                            <span className="h-2 w-2 rounded-full bg-cyan-400" />
                            Smart Nutrition
                        </div>
                        <h1 className="mt-4 text-3xl font-black">{mode === 'register' ? 'Create account' : 'Welcome back'}</h1>
                        <p className="mt-2 text-sm text-slate-400">Login to save history and track your diet checks.</p>

                        <div className="mt-6 space-y-3">
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                            />
                            <div className="relative">
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {error && (
                                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-semibold text-rose-200">{error}</div>
                            )}
                            <button
                                onClick={submit}
                                disabled={loading}
                                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-black text-slate-950 shadow-xl transition-all hover:brightness-110 disabled:opacity-60"
                            >
                                {loading ? 'Please wait…' : (mode === 'register' ? 'Create account' : 'Login')}
                            </button>
                        </div>

                        <div className="mt-5 text-center text-sm text-slate-400">
                            {mode === 'register' ? (
                                <button className="font-bold text-cyan-300 hover:text-cyan-200" onClick={() => setMode('login')}>Have an account? Login</button>
                            ) : (
                                <button className="font-bold text-cyan-300 hover:text-cyan-200" onClick={() => setMode('register')}>New here? Create one</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HistoryPage({ auth }) {
    const nav = useNavigate();
    const [items, setItems] = useState([]);
    const [kind, setKind] = useState('all');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setError('');
            try {
                const api = authedAxios(auth.token);
                const r = await api.get('/history', {
                    params: {
                        limit: 50,
                        ...(kind === 'all' ? {} : { kind }),
                    }
                });
                setItems(r.data.items || []);
            } catch (e) {
                setError(e?.response?.data?.detail || 'Failed to load history');
            }
            setLoading(false);
        };
        run();
    }, [auth.token, kind]);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-b from-indigo-500/20 via-slate-950 to-slate-950">
                <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-slate-400">History</div>
                            <div className="text-3xl font-black">Your saved checks</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => nav('/')}
                                className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900/40"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => { auth.logout(); nav('/login'); }}
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-200">{error}</div>
                    )}
                    {loading ? (
                        <div className="mt-6 text-sm text-slate-400">Loading…</div>
                    ) : (
                        <div className="mt-6 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setKind('all')}
                                    className={`rounded-full px-4 py-2 text-xs font-black ring-1 ${kind === 'all' ? 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/25' : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setKind('predict')}
                                    className={`rounded-full px-4 py-2 text-xs font-black ring-1 ${kind === 'predict' ? 'bg-violet-500/15 text-violet-200 ring-violet-400/25' : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10'}`}
                                >
                                    Predictions
                                </button>
                                <button
                                    onClick={() => setKind('search')}
                                    className={`rounded-full px-4 py-2 text-xs font-black ring-1 ${kind === 'search' ? 'bg-amber-500/15 text-amber-200 ring-amber-400/25' : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10'}`}
                                >
                                    Searches
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">No history yet.</div>
                            ) : items.map((it, idx) => {
                                const created = String(it.created_at || '');
                                if (it.kind === 'search') {
                                    return (
                                        <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-black uppercase tracking-wide text-amber-200">Search</div>
                                                    <div className="mt-1 truncate text-base font-black text-slate-100">{it.payload?.query || ''}</div>
                                                </div>
                                                <div className="text-xs text-slate-500">{created}</div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (it.kind === 'predict') {
                                    const payload = it.payload || {};
                                    const status = payload.status || 'Unknown';
                                    const totals = payload.totals || {};
                                    const requirements = payload.requirements || {};
                                    const deficits = payload.deficits || {};
                                    const isAdequate = String(status).toLowerCase() === 'adequate';
                                    const deficitEntries = Object.entries(deficits);

                                    const fmt = (k) => {
                                        if (k === 'protein_g') return { name: 'Protein', unit: 'g', accent: 'text-cyan-300' };
                                        if (k === 'iron_mg') return { name: 'Iron', unit: 'mg', accent: 'text-rose-300' };
                                        if (k === 'b12_mcg') return { name: 'Vitamin B12', unit: 'mcg', accent: 'text-violet-300' };
                                        if (k === 'omega3_g') return { name: 'Omega-3', unit: 'g', accent: 'text-amber-300' };
                                        return { name: k, unit: '', accent: 'text-slate-200' };
                                    };

                                    return (
                                        <div key={idx} className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/80 via-slate-900/70 to-slate-950/70 p-6 shadow-2xl">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                                                <div>
                                                    <div className="text-xs font-black uppercase tracking-wide text-violet-200">Prediction</div>
                                                    <div className="text-lg font-black text-white">Nutrition Adequacy</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs text-slate-500">{created}</div>
                                                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${isAdequate ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30' : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30'}`}>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                        {status}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-4">
                                                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                                                    <div className="text-xs uppercase tracking-wide text-slate-400">Protein</div>
                                                    <div className="mt-1 text-lg font-extrabold text-cyan-300">{Number(totals.protein_g ?? 0).toFixed(1)} <span className="text-xs text-slate-400">g</span></div>
                                                </div>
                                                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                                                    <div className="text-xs uppercase tracking-wide text-slate-400">Iron</div>
                                                    <div className="mt-1 text-lg font-extrabold text-rose-300">{Number(totals.iron_mg ?? 0).toFixed(1)} <span className="text-xs text-slate-400">mg</span></div>
                                                </div>
                                                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                                                    <div className="text-xs uppercase tracking-wide text-slate-400">B12</div>
                                                    <div className="mt-1 text-lg font-extrabold text-violet-300">{Number(totals.b12_mcg ?? 0).toFixed(1)} <span className="text-xs text-slate-400">mcg</span></div>
                                                </div>
                                                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                                                    <div className="text-xs uppercase tracking-wide text-slate-400">Omega-3</div>
                                                    <div className="mt-1 text-lg font-extrabold text-amber-300">{Number(totals.omega3_g ?? 0).toFixed(1)} <span className="text-xs text-slate-400">g</span></div>
                                                </div>
                                                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                                                    <div className="text-xs uppercase tracking-wide text-slate-400">Calories</div>
                                                    <div className="mt-1 text-lg font-extrabold text-lime-300">{Number(totals.cal_kcal ?? 0).toFixed(0)} <span className="text-xs text-slate-400">kcal</span></div>
                                                </div>
                                            </div>

                                            {deficitEntries.length > 0 && (
                                                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/30 p-4">
                                                    <div className="text-xs font-black text-slate-100 mb-2">Deficits</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {deficitEntries.map(([k, v]) => {
                                                            const meta = fmt(k);
                                                            return (
                                                                <div key={k} className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-200 ring-1 ring-rose-400/20">
                                                                    <span className={meta.accent}>{meta.name}</span>
                                                                    <span className="text-slate-400"> — </span>
                                                                    <span>{Number(v ?? 0).toFixed(2)} {meta.unit}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{it.kind}</div>
                                            <div className="text-xs text-slate-500">{created}</div>
                                        </div>
                                        <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/40 p-4 text-xs text-slate-200 ring-1 ring-white/5">{JSON.stringify(it.payload, null, 2)}</pre>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RequireAuth({ auth, children }) {
    if (!auth.isAuthed) return <Navigate to="/login" replace />;
    return children;
}

function App() {
    const auth = useAuth();
    const nav = useNavigate();

    const [lastSavedSearch, setLastSavedSearch] = useState('');

    // If not authenticated, redirect to login immediately
    useEffect(() => {
        if (!auth.isAuthed) {
            nav('/login', { replace: true });
        }
    }, [auth.isAuthed, nav]);

    // Pages are routed below; the dashboard remains the default route.
    const [weight, setWeight] = useState(60);
    const [allFoods, setAllFoods] = useState([]);
    const [selectedFoods, setSelectedFoods] = useState([]);
    const [gramsByFood, setGramsByFood] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    useEffect(() => {
        const fetchFoods = async () => {
            try {
                const response = await axios.get(`${API_URL}/foods`);
                const foods = response.data.foods ?? response.data;
                setAllFoods((foods ?? []).slice().sort());
            } catch (err) {
                setError('Failed to fetch foods from the backend. Is it running?');
                console.error(err);
            }
        };
        fetchFoods();
    }, []);

    const filteredFoods = useMemo(() => {
        if (!debouncedSearchTerm) return allFoods;
        return allFoods.filter(food =>
            food.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [allFoods, debouncedSearchTerm]);

    const saveSearchOnEnter = async () => {
        const q = String(searchTerm || '').trim();
        if (!auth.isAuthed) return;
        if (q.length < 2) return;
        if (q.toLowerCase() === String(lastSavedSearch || '').toLowerCase()) return;
        try {
            const api = authedAxios(auth.token);
            await api.post('/history', {
                kind: 'search',
                payload: { query: q }
            });
            setLastSavedSearch(q);
        } catch {
            // ignore
        }
    };

    const handlePredict = async () => {
        if (selectedFoods.length === 0) {
            setError('Please select at least one food item.');
            return;
        }

        const food_grams = selectedFoods.reduce((acc, f) => {
            const g = Number(gramsByFood?.[f] ?? 100);
            acc[f] = Number.isFinite(g) && g > 0 ? g : 100;
            return acc;
        }, {});

        setError(null);
        setIsLoading(true);
        setResults(null);

        try {
            let data;
            try {
                const r1 = await axios.post(`${API_URL}/predict`, {
                    weight: Number(weight),
                    food_grams,
                });
                data = r1.data;
            } catch (e1) {
                const r2 = await axios.post(`${API_URL}/calculate`, {
                    weight: Number(weight),
                    foods: selectedFoods,
                    food_grams,
                });
                data = r2.data;
            }
            setResults(data);

            // Save prediction to history if logged in.
            if (auth.isAuthed) {
                const api = authedAxios(auth.token);
                await api.post('/history', {
                    kind: 'predict',
                    payload: {
                        weight,
                        food_grams,
                        status: data?.status,
                        totals: data?.totals,
                        deficits: data?.deficits,
                    }
                });
            }
        } catch (err) {
            setError('Prediction failed. Please check backend endpoint (/predict or /calculate) and try again.');
            console.error(err);
        }
        setIsLoading(false);
    };

    const toggleFoodSelection = (food) => {
        setSelectedFoods((prev) => {
            const next = prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food];
            return next;
        });
        setGramsByFood((prev) => {
            const next = { ...prev };
            if (next[food] == null) next[food] = 100;
            return next;
        });
    };

    const removeSelected = (food) => {
        setSelectedFoods((prev) => prev.filter((f) => f !== food));
        setGramsByFood((prev) => {
            const next = { ...prev };
            delete next[food];
            return next;
        });
    };

    const setFoodGrams = (food, grams) => {
        setGramsByFood((prev) => ({ ...prev, [food]: grams }));
    };

    return (
        <Routes>
            <Route path="/login" element={<LoginPage auth={auth} />} />
            <Route
                path="/history"
                element={
                    <RequireAuth auth={auth}>
                        <HistoryPage auth={auth} />
                    </RequireAuth>
                }
            />
            <Route
                path="/"
                element={(
                    <div className="min-h-screen bg-slate-950 text-white">
                        <div className="bg-gradient-to-b from-indigo-500/20 via-slate-950 to-slate-950">
                            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                                <header className="text-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-slate-200 ring-1 ring-white/10">
                            <span className="h-2 w-2 rounded-full bg-cyan-400" />
                            ML-Based Nutrition Adequacy Checker
                        </div>
                        <h1 className="mt-4 text-4xl font-black sm:text-5xl">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">Smart Nutrition</span>
                            <span className="text-slate-200"> Dashboard</span>
                        </h1>
                        <p className="mt-3 text-slate-400">Select foods, set grams, and get a model-backed adequacy prediction.</p>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                            {auth.isAuthed ? (
                                <>
                                    <div className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 ring-1 ring-white/10">{auth.email}</div>
                                    <button
                                        onClick={() => nav('/history')}
                                        className="rounded-full bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-200 ring-1 ring-cyan-400/20 hover:bg-cyan-500/15"
                                    >
                                        History
                                    </button>
                                    <button
                                        onClick={() => { auth.logout(); nav('/login'); }}
                                        className="rounded-full bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-200 ring-1 ring-rose-400/20 hover:bg-rose-500/15"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => nav('/login')}
                                    className="rounded-full bg-white/5 px-4 py-2 text-xs font-black text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                                >
                                    Login to save history
                                </button>
                            )}
                        </div>
                    </header>

                    <main className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
                        <section className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="weight" className="block text-sm font-semibold text-slate-200">Weight (kg)</label>
                                    <div className="mt-2 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-slate-400">30</div>
                                            <div className="text-sm font-bold text-cyan-300">{Number(weight || 0)} kg</div>
                                            <div className="text-xs text-slate-400">150</div>
                                        </div>
                                        <input
                                            id="weight"
                                            type="range"
                                            min={30}
                                            max={150}
                                            step={1}
                                            value={Number(weight) || 60}
                                            onChange={(e) => setWeight(Number(e.target.value))}
                                            className="mt-3 w-full accent-cyan-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="food-search" className="block text-sm font-semibold text-slate-200">Search foods</label>
                                    <input
                                        type="text"
                                        id="food-search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                saveSearchOnEnter();
                                            }
                                        }}
                                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                                        placeholder="Type to filter (e.g., rice, egg, milk...)"
                                    />
                                    <div className="mt-2 text-xs text-slate-500">Tip: search is debounced for speed.</div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-200">Foods</h3>
                                    <div className="text-xs text-slate-500">Showing {filteredFoods.length} items</div>
                                </div>
                                <div className="mt-3 h-72 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                        {filteredFoods.map((food) => {
                                            const active = selectedFoods.includes(food);
                                            return (
                                                <button
                                                    key={food}
                                                    onClick={() => toggleFoodSelection(food)}
                                                    className={`rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${active
                                                        ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 shadow-lg ring-2 ring-cyan-300/40'
                                                        : 'bg-slate-900/60 text-slate-200 hover:bg-slate-800/70 ring-1 ring-white/5'
                                                    }`}
                                                    title={food}
                                                >
                                                    <div className="truncate">{food}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <aside className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-slate-100">Selected ({selectedFoods.length})</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFoods([]);
                                        setGramsByFood({});
                                        setResults(null);
                                        setError(null);
                                    }}
                                    className="text-xs font-semibold text-slate-400 hover:text-slate-200"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="mt-4 space-y-3">
                                {selectedFoods.length === 0 ? (
                                    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-400">
                                        Pick foods from the left panel. Then set grams for each.
                                    </div>
                                ) : (
                                    selectedFoods.map((food) => (
                                        <div key={food} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-bold text-slate-100">{food}</div>
                                                    <div className="mt-1 text-xs text-slate-500">Per 100g in dataset (scaled by grams)</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSelected(food)}
                                                    className="rounded-lg bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-300 ring-1 ring-rose-400/20 hover:bg-rose-500/20"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="mt-3 flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    value={Number(gramsByFood?.[food] ?? 100)}
                                                    onChange={(e) => setFoodGrams(food, Number(e.target.value))}
                                                    className="w-28 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                                                />
                                                <div className="text-sm font-semibold text-slate-300">grams</div>
                                                <div className="ml-auto rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300 ring-1 ring-cyan-400/20">
                                                    {(Number(gramsByFood?.[food] ?? 100) / 100).toFixed(2)}x
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 border-t border-slate-800 pt-5">
                                <button
                                    onClick={handlePredict}
                                    disabled={isLoading}
                                    className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-black text-slate-950 shadow-xl transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Predicting…' : 'Predict Nutrition (ML)'}
                                </button>
                            </div>
                        </aside>
                    </main>

                    {error && (
                        <div className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-200">
                            {error}
                        </div>
                    )}

                    {isLoading && (
                        <div className="mt-8 text-center text-sm text-slate-400">Working…</div>
                    )}

                    <ResultsCard results={results} />
                            </div>
                        </div>
                    </div>
                )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
