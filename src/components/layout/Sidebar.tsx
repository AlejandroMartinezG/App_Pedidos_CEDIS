import { NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
    ListOrdered, LayoutDashboard,
    Settings, LogOut, Sun, Moon, ChevronRight, CalendarDays, FileText
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeProvider'
import { clsx } from 'clsx'

interface Props {
    isCollapsed?: boolean
    onToggle?: () => void
}
export function Sidebar({ isCollapsed = false, onToggle }: Props) {
    const { user, signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isAdmin = user?.rol === 'admin'

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            isCollapsed ? 'justify-center' : 'justify-start',
            isActive
                ? 'bg-[#2B5EA7] text-white shadow-sm dark:bg-blue-600'
                : 'text-gray-500 hover:bg-[#F4F6FA] hover:text-[#1E3A6E] dark:text-gray-400 dark:hover:bg-slate-800/50 dark:hover:text-blue-300'
        )

    return (
        <aside className={clsx(
            "fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-[#E2E5EB] dark:border-slate-800 transition-all duration-300 print:hidden hidden md:flex flex-col shadow-sm z-40",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Header / Logo */}
            <div className={`relative flex items-center justify-center px-4 py-2 border-b border-[#E2E5EB] dark:border-slate-800 h-[72px] shrink-0 transition-colors`}>
                {isCollapsed ? (
                    <img src="/logoCloroH_small.png" alt="Logo CH" className="w-[36px] h-[36px] object-contain" />
                ) : (
                    <img src="/LogoCH.png" alt="Logo Cloro H" className="h-[56px] w-full object-contain" />
                )}

                {/* Toggle Button */}
                {onToggle && (
                    <button
                        onClick={onToggle}
                        className="absolute -right-3.5 top-5 bg-white dark:bg-slate-800 border border-[#E2E5EB] dark:border-slate-700 text-gray-400 hover:text-[#1E3A6E] dark:hover:text-blue-400 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-110 transition-all z-50 md:opacity-100 hidden md:block"
                        title={isCollapsed ? "Expandir" : "Contraer"}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <span className="block rotate-180"><ChevronRight size={14} /></span>}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {isAdmin ? (
                    <>
                        <p className={clsx("text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 transition-all", isCollapsed ? "text-transparent h-0 overflow-hidden" : "px-3")}>
                            {!isCollapsed && "General"}
                        </p>
                        <NavLink
                            to="/dashboard"
                            end
                            className={() => {
                                const isHome = location.pathname === '/dashboard' && !searchParams.get('tab');
                                return linkClass({ isActive: isHome });
                            }}
                            title={isCollapsed ? "Administrar Pedidos" : undefined}
                        >
                            <LayoutDashboard size={16} className="shrink-0" />
                            {!isCollapsed && <span>Administrar Pedidos</span>}
                        </NavLink>
                        <NavLink
                            to="/dashboard?tab=fechas"
                            className={() => {
                                const isFechas = location.pathname === '/dashboard' && searchParams.get('tab') === 'fechas';
                                return linkClass({ isActive: isFechas });
                            }}
                            title={isCollapsed ? "Fechas Pendientes" : undefined}
                        >
                            <CalendarDays size={16} className="shrink-0" />
                            {!isCollapsed && <span>Fechas Pendientes</span>}
                        </NavLink>
                        <p className={clsx("text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 mt-4 transition-all", isCollapsed ? "text-transparent h-0 overflow-hidden" : "px-3")}>
                            {!isCollapsed && "Administración"}
                        </p>
                        <button
                            onClick={() => navigate('/dashboard?tab=solicitudes')}
                            className={clsx(linkClass({ isActive: location.pathname === '/dashboard' && searchParams.get('tab') === 'solicitudes' }), 'w-full text-left')}
                            title={isCollapsed ? "Solicitudes & Usuarios" : undefined}
                        >
                            <Settings size={16} className="shrink-0" />
                            {!isCollapsed && <span>Solicitudes & Usuarios</span>}
                        </button>
                        <NavLink to="/catalogo" className={linkClass} title={isCollapsed ? "Catálogo" : undefined}>
                            <ListOrdered size={16} className="shrink-0" />
                            {!isCollapsed && <span>Catálogo</span>}
                        </NavLink>
                        <NavLink to="/nomina-hino" className={linkClass} title={isCollapsed ? "Nómina Hino" : undefined}>
                            <FileText size={16} className="shrink-0" />
                            {!isCollapsed && <span>Nómina Hino</span>}
                        </NavLink>
                    </>
                ) : (
                    <>
                        <p className={clsx("text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 transition-all", isCollapsed ? "text-transparent h-0 overflow-hidden" : "px-3")}>
                            {!isCollapsed && "General"}
                        </p>
                        <NavLink to="/mis-pedidos" className={linkClass} title={isCollapsed ? "Mis Pedidos" : undefined}>
                            <ListOrdered size={16} className="shrink-0" />
                            {!isCollapsed && <span>Mis Pedidos</span>}
                        </NavLink>
                        <NavLink to="/disponibilidad" className={linkClass} title={isCollapsed ? "Disponibilidad" : undefined}>
                            <CalendarDays size={16} className="shrink-0" />
                            {!isCollapsed && <span>Calendario de Disponibilidad</span>}
                        </NavLink>
                    </>
                )}
            </nav>

            {/* Settings & Logout Footer */}
            <div className="px-3 py-4 border-t border-[#E2E5EB] dark:border-slate-800 space-y-2">
                <button
                    onClick={toggleTheme}
                    className={clsx(
                        "flex items-center w-full rounded-lg text-xs font-semibold hover:bg-[#F4F6FA] dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300",
                        isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                    )}
                    title={isCollapsed ? (theme === 'light' ? 'Modo Oscuro' : 'Modo Claro') : undefined}
                >
                    {theme === 'light' ? (
                        <>
                            <Moon size={16} className="shrink-0 text-slate-500" />
                            {!isCollapsed && <span>Modo oscuro</span>}
                        </>
                    ) : (
                        <>
                            <Sun size={16} className="shrink-0 text-amber-500" />
                            {!isCollapsed && <span>Modo claro</span>}
                        </>
                    )}
                </button>
                <button
                    onClick={handleSignOut}
                    className={clsx(
                        "flex items-center w-full rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors",
                        isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                    )}
                    title={isCollapsed ? "Cerrar Sesión" : undefined}
                >
                    <LogOut size={16} className="shrink-0" />
                    {!isCollapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    )
}
