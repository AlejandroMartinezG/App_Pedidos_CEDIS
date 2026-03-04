import { NavLink, useNavigate } from 'react-router-dom'
import {
    PlusCircle, ListOrdered, Clock, LayoutDashboard,
    Settings, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { clsx } from 'clsx'

export function Sidebar() {
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
            isActive
                ? 'bg-[#2B5EA7] text-white shadow-sm'
                : 'text-gray-500 hover:bg-[#F4F6FA] hover:text-[#1E3A6E]'
        )

    return (
        <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r border-[#E2E5EB] flex flex-col z-40">
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-[#E2E5EB]">
                <div className="w-8 h-8 rounded-lg bg-[#D4A01E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    G
                </div>
                <div>
                    <p className="font-bold text-[#1E3A6E] text-sm leading-tight">GINEZ</p>
                    <p className="text-[10px] text-[#D4A01E] leading-tight">Haciendo química contigo</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {isAdmin ? (
                    <>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">General</p>
                        <NavLink to="/dashboard" className={linkClass}>
                            <LayoutDashboard size={16} />
                            Administrar Pedidos
                        </NavLink>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2 mt-4">Administración</p>
                        <button
                            onClick={() => navigate('/dashboard?tab=solicitudes')}
                            className={linkClass({ isActive: false }) + ' w-full text-left'}
                        >
                            <Settings size={16} />
                            Solicitudes & Usuarios
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">General</p>
                        <NavLink to="/nuevo-pedido" className={linkClass}>
                            <PlusCircle size={16} />
                            Nuevo Pedido
                        </NavLink>
                        <NavLink to="/mis-pedidos" className={linkClass}>
                            <ListOrdered size={16} />
                            Mis Pedidos
                        </NavLink>
                        <NavLink to="/historial" className={linkClass}>
                            <Clock size={16} />
                            Historial
                        </NavLink>
                    </>
                )}
            </nav>

            {/* User Footer */}
            <div className="px-3 py-4 border-t border-[#E2E5EB]">
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#F4F6FA] cursor-pointer group">
                    <div className="w-7 h-7 rounded-full bg-[#1E3A6E] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user?.nombre?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1E3A6E] truncate">{user?.sucursal?.nombre ?? 'Admin'}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <ChevronRight size={12} className="text-gray-300" />
                </div>
                <button
                    onClick={handleSignOut}
                    className="mt-2 flex items-center gap-2 px-3 py-2 w-full rounded-lg text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={13} />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    )
}
