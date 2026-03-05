import { useState } from 'react'
import { Search } from 'lucide-react'
import type { DetalleLinea } from '@/lib/types'

interface Props {
    title: string
    count: number
    detalles: DetalleLinea[]
    subtotal: number
    color: string
    onUpdate: (materialId: string, value: number | null) => void
    readonly?: boolean
}

export function CategoryTable({ title, count, detalles, subtotal, color, onUpdate, readonly = false }: Props) {
    const [search, setSearch] = useState('')

    const filtered = detalles.filter(d =>
        d.material.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (d.material.codigo ?? '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E5EB] dark:border-slate-800 overflow-hidden mb-4 transition-colors">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 border-b border-[#E2E5EB] dark:border-slate-800 gap-3 transition-colors">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <h3 className="font-semibold text-[#1E3A6E] dark:text-blue-400 text-sm">{title}</h3>
                    <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">{count} mat.</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={`Buscar...`}
                            className="pl-8 pr-3 py-1.5 text-xs border border-[#E2E5EB] dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 dark:focus:ring-blue-500/50 w-full sm:w-44 bg-[#F4F6FA] dark:bg-slate-800 text-[#1E3A6E] dark:text-slate-200 transition-colors"
                        />
                    </div>
                    <div className="flex justify-between items-center sm:block">
                        <span className="text-xs font-semibold text-[#1E3A6E] dark:text-slate-300 font-mono whitespace-nowrap">
                            Subtotal{' '}
                            <span className="text-sm dark:text-slate-100">{subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} kg</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                    <thead className="bg-[#F4F6FA] dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-semibold w-[35%]">Material</th>
                            <th className="px-3 py-2.5 text-right font-semibold w-[15%]">
                                Cant. Solicitada
                                <span className="block text-[9px] text-[#2B5EA7] dark:text-blue-400 font-normal normal-case">Ingresa aquí</span>
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold w-[10%]">Unidad</th>
                            <th className="px-3 py-2.5 text-right font-semibold w-[12%]">Peso Aprox.</th>
                            <th className="px-3 py-2.5 text-right font-semibold w-[15%]">
                                Cant. Kilos
                                <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-normal normal-case">Calculado</span>
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold w-[13%]">Envase</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F6FA] dark:divide-slate-800/80">
                        {filtered.map(d => {
                            const hasValue = (d.cantidad_solicitada ?? 0) > 0
                            const cantKilos = d.cantidad_kilos
                            return (
                                <tr
                                    key={d.material.id}
                                    className={hasValue ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'hover:bg-[#F4F6FA]/60 dark:hover:bg-slate-800/30 transition-colors'}
                                >
                                    <td className="px-4 py-2">
                                        <span className="font-medium text-gray-800 dark:text-slate-200">{d.material.nombre}</span>
                                    </td>

                                    {/* CANT. SOLICITADA — único campo editable */}
                                    <td className="px-3 py-1.5 text-right">
                                        {readonly ? (
                                            <span className="font-mono text-slate-700 dark:text-slate-300">{d.cantidad_solicitada ?? '—'}</span>
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
                                                className="w-24 text-right px-2 py-1 border border-[#2B5EA7]/40 dark:border-blue-500/30 rounded-md font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/40 dark:focus:ring-blue-500/50 focus:border-[#2B5EA7] dark:focus:border-blue-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors"
                                                placeholder="0"
                                            />
                                        )}
                                    </td>

                                    <td className="px-3 py-2 text-center text-gray-500 dark:text-slate-400">{d.material.unidad_base}</td>
                                    <td className="px-3 py-2 text-right text-gray-500 dark:text-slate-400 font-mono">{d.material.peso_aproximado ?? '—'}</td>

                                    {/* CANT. KILOS — calculado automáticamente */}
                                    <td className="px-3 py-2 text-right">
                                        <span className={`font-mono font-semibold ${hasValue ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-300 dark:text-slate-600'}`}>
                                            {cantKilos != null
                                                ? cantKilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })
                                                : '—'}
                                        </span>
                                    </td>

                                    <td className="px-3 py-2 text-center text-gray-500 dark:text-slate-400">{d.material.envase ?? '—'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
