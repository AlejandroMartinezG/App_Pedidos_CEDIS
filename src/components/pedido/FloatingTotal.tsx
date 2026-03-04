import { LIMITE_KG, ALERTA_KG, CATEGORIAS } from '@/lib/constants'
import { AlertTriangle } from 'lucide-react'

interface Props {
    totalKilos: number
    subtotales: Record<string, number>
}

export function FloatingTotal({ totalKilos, subtotales }: Props) {
    const overLimit = totalKilos >= LIMITE_KG
    const pct = Math.min((totalKilos / LIMITE_KG) * 100, 100)

    const barColor =
        overLimit
            ? 'bg-red-500'
            : totalKilos >= ALERTA_KG
                ? 'bg-amber-400'
                : 'bg-[#2B5EA7]'

    const textColor =
        overLimit
            ? 'text-red-600'
            : totalKilos >= ALERTA_KG
                ? 'text-amber-600'
                : 'text-[#1E3A6E]'

    return (
        <div className="sticky top-0 z-30 bg-white border-b border-[#E2E5EB] shadow-sm">
            <div className="px-6 py-3">
                {/* Row 1: label + total + sobrecarga badge + category dots */}
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none">Total General</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-2xl font-bold font-mono leading-tight ${textColor}`}>
                                    {totalKilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    <span className="text-base font-semibold ml-1 text-gray-500">kg</span>
                                </p>
                                {overLimit && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 rounded-full text-[10px] font-bold uppercase tracking-wide animate-pulse">
                                        <AlertTriangle size={11} />
                                        Sobrecarga
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category dots */}
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {CATEGORIAS.map(cat => {
                            const v = subtotales[cat.key] ?? 0
                            return (
                                <div key={cat.key} className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                                    <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                                        {cat.shortLabel} {v.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden border border-[#E2E5EB]">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        0 kg{' '}
                        <span className="text-red-500 font-medium">Límite: {LIMITE_KG.toLocaleString('es-MX')} kg</span>
                    </span>
                </div>
            </div>
        </div>
    )
}
