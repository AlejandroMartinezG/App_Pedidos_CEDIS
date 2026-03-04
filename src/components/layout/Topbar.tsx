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
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E2E5EB] h-16">
            <div>
                <h1 className="text-lg font-bold text-[#1E3A6E] leading-tight">{title}</h1>
                {subtitle && (
                    <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>
                )}
            </div>
            <div className="flex items-center gap-3">
                {actions}
                <div className="flex items-center gap-2 pl-3 border-l border-[#E2E5EB]">
                    <div className="text-right">
                        <p className="text-xs font-semibold text-[#1E3A6E]">{user?.nombre ?? '—'}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                            {user?.rol === 'admin' ? 'Administrador' : 'Sucursal'}
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1E3A6E] flex items-center justify-center text-white text-xs font-bold">
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    )
}
