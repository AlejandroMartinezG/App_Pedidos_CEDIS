import { NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { PlusCircle, ListOrdered, LayoutDashboard, Settings, Sun, Moon, LogOut, CalendarDays, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeProvider'
import { clsx } from 'clsx'

export function MobileNav() {
    const { user, signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isAdmin = user?.rol === 'admin'

    const baseClass = 'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors'

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        clsx(
            baseClass,
            isActive
                ? 'text-[#2B5EA7] dark:text-blue-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
        )

    const btnClass = clsx(baseClass, 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-[#E2E5EB] dark:border-slate-800 flex items-center justify-around h-16 md:hidden pb-safe transition-colors shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {isAdmin ? (
                <>
                    <NavLink
                        to="/dashboard"
                        end
                        className={() => clsx(baseClass, (location.pathname === '/dashboard' && !searchParams.get('tab')) ? 'text-[#2B5EA7] dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
                    >
                        <LayoutDashboard size={20} />
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </NavLink>
                    <NavLink
                        to="/dashboard?tab=fechas"
                        className={() => clsx(baseClass, (location.pathname === '/dashboard' && searchParams.get('tab') === 'fechas') ? 'text-[#2B5EA7] dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
                    >
                        <CalendarDays size={20} />
                        <span className="text-[10px] font-medium">Fechas</span>
                    </NavLink>
                    <NavLink
                        to="/dashboard?tab=solicitudes"
                        className={() => clsx(baseClass, (location.pathname === '/dashboard' && searchParams.get('tab') === 'solicitudes') ? 'text-[#2B5EA7] dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
                    >
                        <Settings size={20} />
                        <span className="text-[10px] font-medium">Usuarios</span>
                    </NavLink>
                </>
            ) : (
                <>
                    <NavLink to="/nuevo-pedido" className={navLinkClass}>
                        <PlusCircle size={20} />
                        <span className="text-[10px] font-medium">Crear</span>
                    </NavLink>
                    <NavLink to="/mis-pedidos" className={navLinkClass}>
                        <ListOrdered size={20} />
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </NavLink>
                    <NavLink
                        to="/nomina-hino"
                        className={() => clsx(baseClass, searchParams.get('tab') === 'nomina' ? 'text-[#2B5EA7] dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
                    >
                        <FileText size={20} />
                        <span className="text-[10px] font-medium">Nómina</span>
                    </NavLink>
                </>
            )}

            <button onClick={toggleTheme} className={btnClass} title="Tema">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                <span className="text-[10px] font-medium">Tema</span>
            </button>
            <button onClick={handleLogout} className={clsx(btnClass, 'hover:text-red-500 dark:hover:text-red-400')} title="Salir">
                <LogOut size={20} className="text-red-500 dark:text-red-400 opacity-80" />
                <span className="text-[10px] font-medium text-red-500 dark:text-red-400 opacity-90">Salir</span>
            </button>
        </nav>
    )
}
