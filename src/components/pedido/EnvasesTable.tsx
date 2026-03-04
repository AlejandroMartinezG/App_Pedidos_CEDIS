import { useState } from 'react'
import { Search } from 'lucide-react'
import type { DetalleLinea } from '@/lib/types'

interface Props {
    detalles: DetalleLinea[]
    subtotal: number
    onUpdate: (materialId: string, value: number | null) => void
    readonly?: boolean
}

export function EnvasesTable({ detalles, subtotal, onUpdate, readonly = false }: Props) {
    const [search, setSearch] = useState('')

    const filtered = detalles.filter(d =>
        d.material.nombre.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="bg-white rounded-xl border border-[#E2E5EB] overflow-hidden mb-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E5EB]">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <h3 className="font-semibold text-[#1E3A6E] text-sm">Envases Vacíos</h3>
                    <span className="text-xs text-gray-400">{detalles.length} materiales</span>
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                        Estructura diferente
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar envase..."
                            className="pl-8 pr-3 py-1.5 text-xs border border-[#E2E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 w-44 bg-[#F4F6FA]"
                        />
                    </div>
                    <span className="text-xs font-semibold text-[#1E3A6E] font-mono whitespace-nowrap">
                        Subtotal{' '}
                        <span className="text-sm">{subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} kg</span>
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-[#F4F6FA] text-gray-500 uppercase tracking-wide text-[10px]">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-semibold w-[35%]">Material</th>
                            <th className="px-3 py-2.5 text-right font-semibold w-[12%]">Peso Uni</th>
                            <th className="px-3 py-2.5 text-center font-semibold w-[10%]">Unidad</th>
                            <th className="px-3 py-2.5 text-right font-semibold w-[15%]">Cant. Solicitada</th>
                            <th className="px-3 py-2.5 text-center font-semibold w-[16%]">Presentación</th>
                            <th className="px-3 py-2.5 text-right font-semibold w-[12%]">Peso Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F6FA]">
                        {filtered.map(d => {
                            const hasValue = (d.cantidad_solicitada ?? 0) > 0
                            const pesoTotal = d.peso_total ?? 0
                            return (
                                <tr
                                    key={d.material.id}
                                    className={hasValue ? 'bg-amber-50/40' : 'hover:bg-[#F4F6FA]/60'}
                                >
                                    <td className="px-4 py-2">
                                        <span className="font-medium text-gray-800">{d.material.nombre}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600 font-mono">
                                        {d.material.peso_aproximado ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center text-gray-500">{d.material.unidad_base}</td>
                                    <td className="px-3 py-1.5 text-right">
                                        {readonly ? (
                                            <span className="font-mono">{d.cantidad_solicitada ?? '—'}</span>
                                        ) : (
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={d.cantidad_solicitada ?? ''}
                                                onChange={e => {
                                                    const v = e.target.value === '' ? null : parseInt(e.target.value)
                                                    onUpdate(d.material.id, v)
                                                }}
                                                className="w-24 text-right px-2 py-1 border border-[#E2E5EB] rounded-md font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/40 focus:border-[#2B5EA7] bg-white"
                                                placeholder="—"
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center text-gray-500 text-[11px]">
                                        {d.material.envase ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-medium text-gray-700">
                                        {hasValue ? pesoTotal.toLocaleString('es-MX', { minimumFractionDigits: 0 }) : '0'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
