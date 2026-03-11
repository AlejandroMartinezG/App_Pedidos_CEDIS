import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, LogIn, UserPlus, Clock, CheckCircle, ShieldCheck, Factory, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'

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
        <div className="min-h-screen flex relative overflow-hidden bg-[#244b8f] font-sans selection:bg-blue-200">
            {/* Global Background Image */}
            <img
                src="/panel.jpg"
                alt="Industrial Panel"
                className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
            />

            {/* Decorative Blobs (Inspired by reference) */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[60%] bg-blue-500 rounded-full blur-[120px] opacity-50 animate-pulse" />
            <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[50%] bg-blue-700 rounded-full blur-[100px] opacity-40" />
            <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] bg-blue-400 rounded-full blur-[130px] opacity-30" />

            {/* Decorative Overlay Gradient - Lighter shades */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1E3A6E]/80 via-[#244b8f]/50 to-transparent" />

            {/* Left Column: Visual Side (Desktop only) */}
            <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden z-10">

                {/* Visual Content - Refined Glassmorphism Card */}
                <div className="relative z-10 w-full flex flex-col justify-between p-16">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/10">
                            <Factory className="text-white/80" size={20} />
                        </div>
                        <span className="text-white/60 font-bold tracking-[0.3em] text-[10px] uppercase">Cedis Operativo</span>
                    </div>

                    <div className="relative group">
                        {/* The Large Frosted Card */}
                        <div className="p-12 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden">
                            {/* Blur highlight */}
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl" />
                            
                            <div className="flex items-center gap-8">
                                <div className="flex-1 relative z-10">
                                    <Package className="text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" size={64} strokeWidth={1.5} />
                                    
                                    <h2 className="text-5xl font-black text-white italic leading-tight mb-2 tracking-tight">
                                        GESTIÓN DE <br />
                                        <span className="text-blue-100/90 NOT-italic">PEDIDOS</span>
                                    </h2>
                                    
                                    <h3 className="text-2xl font-bold text-yellow-400 tracking-[0.1em] mb-4 drop-shadow-sm">
                                        CLORO DE HIDALGO
                                    </h3>
                                    
                                    <div className="w-20 h-1.5 bg-yellow-400 rounded-full mb-8" />
                                    
                                    <p className="text-blue-100/80 text-base leading-relaxed max-w-sm font-medium">
                                        Precisión operacional y control total en cada suministro industrial.
                                    </p>
                                </div>

                                {/* Larger Logo on the Right - No transparency, filled space */}
                                <div className="relative w-[40%] flex items-center justify-center p-2">
                                    <div className="absolute inset-0 bg-blue-400/20 blur-[100px] rounded-full" />
                                    <img 
                                        src="/logoCloroH_small.png" 
                                        alt="Logo Large" 
                                        className="w-full relative z-10 opacity-100 drop-shadow-[0_0_40px_rgba(255,255,255,0.15)] transform hover:scale-105 transition-transform duration-700" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 self-end">
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest italic">
                            Conectando con más de <span className="text-white font-black text-sm">24</span> sucursales activas.
                        </p>
                    </div>
                </div>

                {/* Floating Decorative Image (pipa2.png) - Repositioned outside left */}
                <img
                    src="/pipa2.png"
                    alt="Decorative Pipa"
                    className="absolute -left-32 bottom-[-20px] w-3/4 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-40 pointer-events-none transform translate-y-12"
                />
            </div>

            {/* Right Column: Form Side - Now transparent z-10 */}
            <div className="w-full lg:w-2/5 flex items-center justify-center p-8 z-10">
                <div className="w-full max-w-sm">
                    {/* Floating Header Text Only */}
                    <div className="flex flex-col items-center mb-8">
                        <h3 className="text-lg font-black text-white/60 uppercase tracking-[0.5em] mb-1">Sistema de Gestión</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Personal Autorizado Únicamente</p>
                    </div>

                    {/* Form container - More glassmorphism like reference */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-white/5 rounded-[2rem] p-8 transition-all">

                        {/* Tabs Navigation - Clean like reference */}
                        <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl mb-8">
                            <button
                                onClick={() => handleTabChange('login')}
                                className={clsx(
                                    "flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                                    tab === 'login'
                                        ? "bg-white text-slate-900 shadow-lg"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Ingresar
                            </button>
                            <button
                                onClick={() => handleTabChange('register')}
                                className={clsx(
                                    "flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                                    tab === 'register'
                                        ? "bg-white text-slate-900 shadow-lg"
                                        : "text-slate-500 hover:text-slate-700"
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
                                    <form onSubmit={handleLogin} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5 px-1">
                                                <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Correo electrónico</label>
                                                <div className="relative">
                                                     <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                     <input
                                                         type="email"
                                                         required
                                                         value={email}
                                                         onChange={e => setEmail(e.target.value)}
                                                         placeholder="usuario@empresa.com"
                                                         className="w-full pl-12 pr-5 py-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                                     />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 px-1">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Contraseña</label>
                                                </div>
                                                <div className="relative">
                                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type={showPwd ? 'text' : 'password'}
                                                        required
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        placeholder="••••••••"
                                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
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
                                            className="w-full bg-[#1E3A6E] hover:bg-[#152a50] text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 text-xs shadow-xl shadow-blue-900/40 active:scale-[0.98] transition-all disabled:opacity-70 mt-4"
                                        >
                                            {loading
                                                ? <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                                : <LogIn size={18} />}
                                            {loading ? 'Ingresando...' : 'Acceder al Tablero'}
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
                                                <div className="relative">
                                                    <input type={rShowPwd ? 'text' : 'password'} required value={rPwd} onChange={e => setRPwd(e.target.value)}
                                                        className="w-full pr-10 px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setRShowPwd(!rShowPwd)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {rShowPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
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

                    {/* Disclaimer - Small Footer like reference */}
                    <p className="mt-8 text-center text-[9px] font-black text-white/30 uppercase tracking-[0.3em] leading-relaxed">
                        PROPIEDAD PRIVADA - CLORO DE HIDALGO S.A. DE C.V. <br />
                        PERSONAL AUTORIZADO ÚNICAMENTE
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
