import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeProvider'
interface TopbarProps {
    title: string
    subtitle?: string
    actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
    const { user, signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const initials = user?.nombre
        ?.split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() ?? 'U'

    return (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-white dark:bg-slate-900 border-b border-[#E2E5EB] dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3">
                <h1 className="text-base sm:text-lg font-bold text-[#1E3A6E] dark:text-blue-400 leading-tight">{title}</h1>
                {subtitle && (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 leading-tight mt-0.5">{subtitle}</p>
                )}
            </div>

            <div className="flex items-center flex-wrap justify-between sm:justify-end gap-3 w-full sm:w-auto">
                {actions && <div className="flex flex-wrap items-center gap-2 flex-1">{actions}</div>}

                <div className="relative shrink-0">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2 pl-3 border-l border-[#E2E5EB] dark:border-slate-700 transition-opacity hover:opacity-80 focus:outline-none"
                    >
                        <div className="text-right flex flex-col items-end hidden sm:flex">
                            <p className="text-xs font-semibold text-[#1E3A6E] dark:text-slate-200">{user?.nombre ?? '—'}</p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                                {user?.rol === 'admin' ? 'Administrador' : 'Sucursal'}
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#1E3A6E] dark:bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm transition-colors">
                            {initials}
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-[#E2E5EB] dark:border-slate-800 py-1 z-50 overflow-hidden">
                                <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800 sm:hidden">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{user?.nombre ?? '—'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        {user?.rol === 'admin' ? 'Administrador' : 'Sucursal'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        toggleTheme()
                                        setIsMenuOpen(false)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                                    <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        signOut().then(() => navigate('/login'))
                                        setIsMenuOpen(false)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-slate-800"
                                >
                                    <LogOut size={16} />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

