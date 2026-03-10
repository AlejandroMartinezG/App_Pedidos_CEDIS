import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, LogIn, UserPlus, Clock, CheckCircle, ShieldCheck, Factory } from 'lucide-react'
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

    useEffect(() => {
        if (session && user && !loginInProgress.current) {
            navigate('/', { replace: true })
        }
    }, [])

    useEffect(() => {
        if (session && user && loginInProgress.current) {
            loginInProgress.current = false
            if (safetyTimeout.current) clearTimeout(safetyTimeout.current)
            setLoading(false)
            navigate('/', { replace: true })
        }
    }, [session, user, navigate])

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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setPending(false)
        setLoading(true)
        loginInProgress.current = true

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
    }

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
        <div className="min-h-screen flex bg-white dark:bg-slate-950 font-sans selection:bg-blue-200">
            {/* Left Column: Visual Side (Desktop only) */}
            <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-[#1E3A6E]">
                <img
                    src="/panel.jpg"
                    alt="Industrial Panel"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                />

                {/* Decorative Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#1E3A6E] via-[#1E3A6E]/80 to-transparent" />

                {/* Visual Content */}
                <div className="relative z-10 w-full flex flex-col justify-between p-16">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                            <Factory className="text-white" size={24} />
                        </div>
                        <span className="text-white font-bold tracking-widest text-sm uppercase">Cedis Operativo</span>
                    </div>

                    <div className="max-w-xl">
                        <h2 className="text-5xl font-black text-white leading-tight mb-6">
                            Gestión Inteligente de <span className="text-blue-400">Pedidos Industriales</span>.
                        </h2>
                        <p className="text-blue-100 text-lg leading-relaxed opacity-90">
                            Accede a la plataforma de administración logística de Cloro de Hidalgo.
                            Optimiza tus procesos de carga y distribución en tiempo real.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex -space-x-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-12 h-12 rounded-full border-4 border-[#1E3A6E] bg-slate-200" />
                            ))}
                        </div>
                        <p className="text-white/60 text-sm italic">
                            Conectando con más de <span className="text-white font-medium text-base">24</span> sucursales activas.
                        </p>
                    </div>
                </div>

                {/* Floating Decorative Image (pipa2.png) */}
                <img
                    src="/pipa2.png"
                    alt="Decorative Pipa"
                    className="absolute -right-20 bottom-10 w-2/3 object-contain drop-shadow-2xl opacity-60 pointer-events-none transform translate-y-12 rotate-[-5deg]"
                />
            </div>

            {/* Right Column: Form Side */}
            <div className="w-full lg:w-2/5 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
                <div className="w-full max-w-md">
                    {/* Header for Mobile/Card */}
                    <div className="flex flex-col items-center mb-10">
                        <img src="/LogoCH.png" alt="Cloro de Hidalgo" className="h-14 object-contain mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-2">Bienvenido de nuevo</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Ingresa tus credenciales para continuar</p>
                    </div>

                    {/* Card container */}
                    <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 rounded-3xl p-8 transition-all">

                        {/* Tabs Navigation */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-8">
                            <button
                                onClick={() => handleTabChange('login')}
                                className={clsx(
                                    "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300",
                                    tab === 'login'
                                        ? "bg-white dark:bg-slate-700 text-[#1E3A6E] dark:text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                )}
                            >
                                Iniciar Sesión
                            </button>
                            <button
                                onClick={() => handleTabChange('register')}
                                className={clsx(
                                    "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300",
                                    tab === 'register'
                                        ? "bg-white dark:bg-slate-700 text-[#1E3A6E] dark:text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                )}
                            >
                                Registro
                            </button>
                        </div>

                        {/* LOGIN FORM */}
                        {tab === 'login' && (
                            <>
                                {pending ? (
                                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                                        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-2">
                                            <Clock size={32} className="text-amber-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Acceso en Revisión</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 px-4">
                                            Tu cuenta aún no ha sido activada por un administrador.
                                            Te notificaremos por correo una vez aprobada.
                                        </p>
                                        <button
                                            onClick={() => { setPending(false); setEmail(''); setPassword('') }}
                                            className="mt-4 text-sm font-bold text-[#1E3A6E] dark:text-blue-400 hover:text-blue-600 transition-colors"
                                        >
                                            ← Volver e intentar con otra cuenta
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleLogin} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Correo Corporativo</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="tu.correo@clorodehidalgo.com"
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Contraseña</label>
                                                <button type="button" className="text-[10px] font-bold text-[#1E3A6E] dark:text-blue-400 hover:underline">¿Olvidaste tu contraseña?</button>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showPwd ? 'text' : 'password'}
                                                    required
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    className="w-full pr-12 px-5 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPwd(!showPwd)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                >
                                                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl">
                                                <ShieldCheck className="text-red-500 shrink-0 mt-0.5" size={16} />
                                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-[#1E3A6E] hover:bg-[#152a50] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 text-base shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-70"
                                        >
                                            {loading
                                                ? <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                                : <LogIn size={20} />}
                                            {loading ? 'Validando...' : 'Acceder al Sistema'}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}

                        {/* REGISTER FORM */}
                        {tab === 'register' && (
                            <>
                                {registerSuccess ? (
                                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                                        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-2">
                                            <CheckCircle size={32} className="text-green-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">¡Registro Enviado!</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 px-4 leading-relaxed">
                                            Tu solicitud ha sido enviada exitosamente. Un administrador activará tu perfil a la brevedad.
                                        </p>
                                        <button
                                            onClick={() => { setRegisterSuccess(false); setTab('login') }}
                                            className="mt-6 w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                                        >
                                            Regresar al Inicio
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleRegister} className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                            <input type="text" required value={rNombre} onChange={e => setRNombre(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
                                            <input type="email" required value={rEmail} onChange={e => setREmail(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sucursal a la que perteneces</label>
                                            <select value={rSucursal} onChange={e => setRSucursal(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                                                <option value="">— Seleccionar Sucursal —</option>
                                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                                                <input type={rShowPwd ? 'text' : 'password'} required value={rPwd} onChange={e => setRPwd(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmar</label>
                                                <input type="password" required value={rPwd2} onChange={e => setRPwd2(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mensaje para el administrador</label>
                                            <textarea value={rMensaje} onChange={e => setRMensaje(e.target.value)} rows={2}
                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
                                        </div>
                                        {rError && (
                                            <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg text-center">{rError}</p>
                                        )}
                                        <button type="submit" disabled={rLoading}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition-all disabled:opacity-60 shadow-lg shadow-blue-500/10">
                                            {rLoading ? <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={18} />}
                                            Enviar Solicitud
                                        </button>
                                    </form>
                                )}
                            </>
                        )}

                        {/* Footer in card */}
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">
                                Acceso de Seguridad CEDIS
                            </p>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="mt-8 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed px-10">
                        © 2026 Cloro de Hidalgo S.A. de C.V. <br />
                        Plataforma Logística Protegida · Pachuca, Hgo.
                    </p>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
            `}</style>
        </div>
    )
}

function clsx(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ')
}
