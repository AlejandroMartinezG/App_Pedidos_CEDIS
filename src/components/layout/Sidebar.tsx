import { NavLink, useNavigate } from 'react-router-dom'
import {
    PlusCircle, ListOrdered, LayoutDashboard,
    Settings, LogOut, ChevronRight
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { clsx } from 'clsx'

interface Props {
    isCollapsed?: boolean
    onToggle?: () => void
}

export function Sidebar({ isCollapsed = false, onToggle }: Props) {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
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
                ? 'bg-[#2B5EA7] text-white shadow-sm'
                : 'text-gray-500 hover:bg-[#F4F6FA] hover:text-[#1E3A6E]'
        )

    return (
        <aside className={clsx(
            "fixed left-0 top-0 h-screen bg-white border-r border-[#E2E5EB] flex flex-col z-40 transition-all duration-300",
            isCollapsed ? "w-20" : "w-56"
        )}>
            {/* Header / Logo */}
            <div className={`relative flex items-center justify-center px-4 py-2 border-b border-[#E2E5EB] h-[72px] shrink-0`}>
                {isCollapsed ? (
                    <img src="/logoCloroH_small.png" alt="Logo CH" className="w-[36px] h-[36px] object-contain" />
                ) : (
                    <img src="/LogoCH.png" alt="Logo Cloro H" className="h-[56px] w-full object-contain" />
                )}

                {/* Toggle Button */}
                {onToggle && (
                    <button
                        onClick={onToggle}
                        className="absolute -right-3.5 top-5 bg-white border border-[#E2E5EB] text-gray-400 hover:text-[#1E3A6E] rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-110 transition-all z-50 md:opacity-100"
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
                        <NavLink to="/dashboard" className={linkClass} title={isCollapsed ? "Administrar Pedidos" : undefined}>
                            <LayoutDashboard size={16} className="shrink-0" />
                            {!isCollapsed && <span>Administrar Pedidos</span>}
                        </NavLink>
                        <p className={clsx("text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 mt-4 transition-all", isCollapsed ? "text-transparent h-0 overflow-hidden" : "px-3")}>
                            {!isCollapsed && "Administración"}
                        </p>
                        <button
                            onClick={() => navigate('/dashboard?tab=solicitudes')}
                            className={linkClass({ isActive: false }) + ' w-full text-left'}
                            title={isCollapsed ? "Solicitudes & Usuarios" : undefined}
                        >
                            <Settings size={16} className="shrink-0" />
                            {!isCollapsed && <span>Solicitudes & Usuarios</span>}
                        </button>
                    </>
                ) : (
                    <>
                        <p className={clsx("text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 transition-all", isCollapsed ? "text-transparent h-0 overflow-hidden" : "px-3")}>
                            {!isCollapsed && "General"}
                        </p>
                        <NavLink to="/nuevo-pedido" className={linkClass} title={isCollapsed ? "Nuevo Pedido" : undefined}>
                            <PlusCircle size={16} className="shrink-0" />
                            {!isCollapsed && <span>Nuevo Pedido</span>}
                        </NavLink>
                        <NavLink to="/mis-pedidos" className={linkClass} title={isCollapsed ? "Mis Pedidos" : undefined}>
                            <ListOrdered size={16} className="shrink-0" />
                            {!isCollapsed && <span>Mis Pedidos</span>}
                        </NavLink>
                    </>
                )}
            </nav>

            {/* User Footer */}
            <div className="px-3 py-4 border-t border-[#E2E5EB]">
                <div className={clsx("flex items-center rounded-lg hover:bg-[#F4F6FA] cursor-pointer group", isCollapsed ? "justify-center px-0 py-2" : "gap-2 px-2 py-2")} title={isCollapsed ? user?.email : undefined}>
                    <div className="w-8 h-8 rounded-full bg-[#1E3A6E] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user?.nombre?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[#1E3A6E] truncate">{user?.sucursal?.nombre ?? 'Admin'}</p>
                                <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <ChevronRight size={12} className="text-gray-300" />
                        </>
                    )}
                </div>
                <button
                    onClick={handleSignOut}
                    className={clsx("mt-2 flex items-center w-full rounded-lg text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors", isCollapsed ? "justify-center p-2" : "gap-2 px-3 py-2")}
                    title={isCollapsed ? "Cerrar Sesión" : undefined}
                >
                    <LogOut size={14} className="shrink-0" />
                    {!isCollapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    )
}
