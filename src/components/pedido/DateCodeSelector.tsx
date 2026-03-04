import { useAuth } from '@/context/AuthContext'
import { format, addDays } from 'date-fns'

interface Props {
    fechaEntrega: string
    onFechaChange: (fecha: string) => void
    codigoPedido: string
    readonly?: boolean
    sucursalNombre?: string
}

export function DateCodeSelector({ fechaEntrega, onFechaChange, codigoPedido, readonly = false, sucursalNombre }: Props) {
    const { user } = useAuth()
    const isAdmin = user?.rol === 'admin'
    const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    return (
        <div className="bg-white border border-[#E2E5EB] rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-500">Fecha de entrega:</label>
                    <input
                        type="date"
                        min={isAdmin ? undefined : minDate}
                        value={fechaEntrega}
                        disabled={readonly}
                        onChange={e => onFechaChange(e.target.value)}
                        className={`border border-[#E2E5EB] rounded-lg px-3 py-1.5 text-sm text-[#1E3A6E] font-medium focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 ${readonly ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'bg-white'}`}
                    />
                </div>
                {codigoPedido && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-gray-500">Código:</label>
                        <span className="font-mono font-bold text-[#2B5EA7] bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg text-sm">
                            {codigoPedido}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Sucursal:</span>
                <span className="font-semibold text-[#1E3A6E] text-sm">{sucursalNombre ?? user?.sucursal?.nombre ?? '—'}</span>
            </div>
        </div>
    )
}
