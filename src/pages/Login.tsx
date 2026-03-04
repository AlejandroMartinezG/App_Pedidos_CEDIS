import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, LogIn, UserPlus, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Tab = 'login' | 'register'

export function Login() {
    const { signIn, signUp, session, user, loginMessage } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState<Tab>('login')

    // Login state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)

    // Register state
    const [rNombre, setRNombre] = useState('')
    const [rEmail, setREmail] = useState('')
    const [rPwd, setRPwd] = useState('')
    const [rPwd2, setRPwd2] = useState('')
    const [rShowPwd, setRShowPwd] = useState(false)
    const [rSucursal, setRSucursal] = useState('')
    const [rMensaje, setRMensaje] = useState('')
    const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
    const [registerSuccess, setRegisterSuccess] = useState(false)
    const [rLoading, setRLoading] = useState(false)
    const [rError, setRError] = useState<string | null>(null)

    // Track whether we're in the middle of a login attempt
    const loginInProgress = useRef(false)
    const safetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── If already authenticated, redirect immediately ────────────────
    useEffect(() => {
        if (session && user && !loginInProgress.current) {
            navigate('/', { replace: true })
        }
    }, []) // Only on mount

    // ── Watch session + user together: navigate when both are ready ───
    useEffect(() => {
        if (session && user && loginInProgress.current) {
            loginInProgress.current = false
            if (safetyTimeout.current) clearTimeout(safetyTimeout.current)
            setLoading(false)
            navigate('/', { replace: true })
        }
    }, [session, user, navigate])

    // ── Watch loginMessage: pending or blocked accounts ───────────────
    useEffect(() => {
        if (!loginInProgress.current) return
        if (loginMessage === 'pending') {
            loginInProgress.current = false
            if (safetyTimeout.current) clearTimeout(safetyTimeout.current)
            setPending(true)
            setLoading(false)
        } else if (loginMessage) {
            loginInProgress.current = false
            if (safetyTimeout.current) clearTimeout(safetyTimeout.current)
            setError(loginMessage)
            setLoading(false)
        }
    }, [loginMessage])

    const handleTabChange = async (t: Tab) => {
        setTab(t)
        setError(null)
        setRError(null)
        if (t === 'register' && sucursales.length === 0) {
            const { data } = await supabase
                .from('sucursales')
                .select('id,nombre')
                .eq('activa', true)
                .order('nombre')
            if (data) setSucursales(data)
        }
    }

    // ── LOGIN ─────────────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setPending(false)
        setLoading(true)
        loginInProgress.current = true

        // Safety timeout: if no response in 12s, clear loading
        safetyTimeout.current = setTimeout(() => {
            loginInProgress.current = false
            setLoading(false)
            setError('Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.')
        }, 12000)

        const { error } = await signIn(email, password)
        if (error) {
            loginInProgress.current = false
            if (safetyTimeout.current) clearTimeout(safetyTimeout.current)
            setError(error)
            setLoading(false)
        }
        // On success: onAuthStateChange fires → sets session + user → useEffect above navigates
    }

    // ── REGISTER ──────────────────────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setRError(null)
        if (rPwd !== rPwd2) { setRError('Las contraseñas no coinciden.'); return }
        if (rPwd.length < 6) { setRError('La contraseña debe tener al menos 6 caracteres.'); return }
        setRLoading(true)
        try {
            const { error } = await signUp({
                email: rEmail,
                password: rPwd,
                nombre: rNombre,
                sucursal_id: rSucursal || null,
                mensaje: rMensaje,
            })
            if (error) { setRError(error); return }
            setRegisterSuccess(true)
        } finally {
            setRLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A6E] via-[#2B5EA7] to-[#1E3A6E] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">

                {/* Logo */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#D4A01E] flex items-center justify-center text-white font-bold text-xl mb-3 shadow-md">G</div>
                    <h1 className="text-2xl font-extrabold text-[#1E3A6E]">GINEZ</h1>
                    <p className="text-[#D4A01E] text-xs font-semibold">Haciendo química contigo</p>
                    <p className="text-gray-500 text-xs mt-2 text-center leading-tight">Sistema de Gestión de Pedidos CEDIS</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#E2E5EB] mb-6">
                    <button onClick={() => handleTabChange('login')}
                        className={`flex-1 pb-2.5 text-sm font-semibold transition-colors ${tab === 'login' ? 'text-[#1E3A6E] border-b-2 border-[#1E3A6E]' : 'text-gray-400 hover:text-gray-600'}`}>
                        Iniciar Sesión
                    </button>
                    <button onClick={() => handleTabChange('register')}
                        className={`flex-1 pb-2.5 text-sm font-semibold transition-colors ${tab === 'register' ? 'text-[#1E3A6E] border-b-2 border-[#1E3A6E]' : 'text-gray-400 hover:text-gray-600'}`}>
                        Solicitar Acceso
                    </button>
                </div>

                {/* LOGIN TAB */}
                {tab === 'login' && (
                    <>
                        {pending ? (
                            <div className="flex flex-col items-center gap-3 py-6">
                                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Clock size={28} className="text-amber-500" />
                                </div>
                                <h3 className="font-bold text-gray-800 text-center">Acceso en revisión</h3>
                                <p className="text-sm text-gray-500 text-center leading-snug">
                                    Tu solicitud está siendo revisada por un administrador.
                                </p>
                                <button onClick={() => { setPending(false); setEmail(''); setPassword('') }}
                                    className="text-xs text-[#2B5EA7] hover:underline mt-2">← Volver</button>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Correo electrónico</label>
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="usuario@ginez.com"
                                        className="w-full px-3 py-2.5 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7]" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Contraseña</label>
                                    <div className="relative">
                                        <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                                            className="w-full pr-10 px-3 py-2.5 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7]" />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                                {error && (
                                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                                )}
                                <button type="submit" disabled={loading}
                                    className="w-full bg-[#1E3A6E] hover:bg-[#2B5EA7] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-60">
                                    {loading
                                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <LogIn size={16} />}
                                    {loading ? 'Verificando...' : 'Ingresar al Sistema'}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* REGISTER TAB */}
                {tab === 'register' && (
                    <>
                        {registerSuccess ? (
                            <div className="flex flex-col items-center gap-3 py-6">
                                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle size={28} className="text-green-500" />
                                </div>
                                <h3 className="font-bold text-gray-800 text-center">¡Solicitud enviada!</h3>
                                <p className="text-sm text-gray-500 text-center leading-snug">
                                    Un administrador revisará tu solicitud y te dará acceso.
                                </p>
                                <button onClick={() => { setRegisterSuccess(false); setTab('login') }}
                                    className="text-xs text-[#2B5EA7] hover:underline mt-2">← Volver a Iniciar Sesión</button>
                            </div>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre completo</label>
                                    <input type="text" required value={rNombre} onChange={e => setRNombre(e.target.value)}
                                        placeholder="Ej. Juan García"
                                        className="w-full px-3 py-2.5 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7]" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Correo electrónico</label>
                                    <input type="email" required value={rEmail} onChange={e => setREmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="w-full px-3 py-2.5 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7]" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Sucursal</label>
                                    <select value={rSucursal} onChange={e => setRSucursal(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7] bg-white">
                                        <option value="">— Sin sucursal asignada —</option>
                                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Contraseña</label>
                                    <div className="relative">
                                        <input type={rShowPwd ? 'text' : 'password'} required value={rPwd} onChange={e => setRPwd(e.target.value)}
                                            minLength={6} placeholder="Mínimo 6 caracteres"
                                            className="w-full pr-10 px-3 py-2.5 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7]" />
                                        <button type="button" onClick={() => setRShowPwd(!rShowPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            {rShowPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Confirmar contraseña</label>
                                    <input type="password" required value={rPwd2} onChange={e => setRPwd2(e.target.value)}
                                        placeholder="Repite la contraseña"
                                        className="w-full px-3 py-2.5 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7]" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Mensaje (opcional)</label>
                                    <textarea value={rMensaje} onChange={e => setRMensaje(e.target.value)} rows={2}
                                        placeholder="Nota para el administrador..."
                                        className="w-full px-3 py-2 border border-[#E2E5EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7] resize-none" />
                                </div>
                                {rError && (
                                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{rError}</p>
                                )}
                                <button type="submit" disabled={rLoading}
                                    className="w-full bg-[#D4A01E] hover:bg-[#B8891A] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-60">
                                    {rLoading
                                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <UserPlus size={16} />}
                                    Solicitar Acceso
                                </button>
                            </form>
                        )}
                    </>
                )}

                <p className="text-center text-[10px] text-gray-400 mt-5">Acceso restringido · Solo personal autorizado</p>
                <p className="text-center text-[10px] text-gray-300 mt-1">© 2026. Ginez S.A. de C.V. Sistema de Pedidos CEDIS.</p>
            </div>
        </div>
    )
}
