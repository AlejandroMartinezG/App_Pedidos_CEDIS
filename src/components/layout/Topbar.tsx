import { useAuth } from '@/context/AuthContext'

interface TopbarProps {
    title: string
    subtitle?: string
    actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
    const { user } = useAuth()
    const initials = user?.nombre
        ?.split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() ?? 'U'

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-[#E2E5EB] dark:border-slate-800 h-16 transition-colors">
            <div>
                <h1 className="text-lg font-bold text-[#1E3A6E] dark:text-blue-400 leading-tight">{title}</h1>
                {subtitle && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight">{subtitle}</p>
                )}
            </div>
            <div className="flex items-center gap-3">
                {actions}
                <div className="flex items-center gap-2 pl-3 border-l border-[#E2E5EB] dark:border-slate-700 transition-colors">
                    <div className="text-right flex flex-col items-end">
                        <p className="text-xs font-semibold text-[#1E3A6E] dark:text-slate-200">{user?.nombre ?? '—'}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                            {user?.rol === 'admin' ? 'Administrador' : 'Sucursal'}
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1E3A6E] dark:bg-blue-600 flex items-center justify-center text-white text-xs font-bold transition-colors">
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    )
}
