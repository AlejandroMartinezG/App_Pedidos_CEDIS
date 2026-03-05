import { useAuth } from '@/context/AuthContext'
import { format, addDays } from 'date-fns'
import type { TipoEntrega } from '@/lib/types'

const TIPOS_ENTREGA: TipoEntrega[] = ['HINO', 'Recolección en CEDIS']

const inputClass = (readonly: boolean) =>
    `border border-[#E2E5EB] dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-[#1E3A6E] dark:text-blue-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 dark:focus:ring-blue-500/50 transition-colors ${readonly
        ? 'bg-gray-100 dark:bg-slate-800 cursor-not-allowed opacity-70'
        : 'bg-white dark:bg-slate-950'
    }`

interface Props {
    fechaEntrega: string
    onFechaChange: (fecha: string) => void
    tipoEntrega: TipoEntrega | null
    onTipoEntregaChange: (tipo: TipoEntrega) => void
    codigoPedido: string
    readonly?: boolean
    sucursalNombre?: string
}

export function DateCodeSelector({ fechaEntrega, onFechaChange, tipoEntrega, onTipoEntregaChange, codigoPedido, readonly = false, sucursalNombre }: Props) {
    const { user } = useAuth()
    const isAdmin = user?.rol === 'admin'
    const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    return (
        <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl px-5 py-4 mb-4 flex flex-wrap items-center justify-between gap-4 transition-colors">
            <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Fecha de entrega:</label>
                    <input
                        type="date"
                        min={isAdmin ? undefined : minDate}
                        value={fechaEntrega}
                        disabled={readonly}
                        onChange={e => onFechaChange(e.target.value)}
                        className={inputClass(readonly)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Tipo de entrega:</label>
                    <select
                        value={tipoEntrega ?? ''}
                        disabled={readonly}
                        onChange={e => onTipoEntregaChange(e.target.value as TipoEntrega)}
                        className={inputClass(readonly)}
                    >
                        <option value="" disabled>Seleccionar…</option>
                        {TIPOS_ENTREGA.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                {codigoPedido && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Código:</label>
                        <span className="font-mono font-bold text-[#2B5EA7] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 px-3 py-1 rounded-lg text-sm transition-colors">
                            {codigoPedido}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Sucursal:</span>
                <span className="font-semibold text-[#1E3A6E] dark:text-slate-200 text-sm">{sucursalNombre ?? user?.sucursal?.nombre ?? '—'}</span>
            </div>
        </div>
    )
}
