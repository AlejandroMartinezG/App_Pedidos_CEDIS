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
            ? 'text-red-600 dark:text-red-400'
            : totalKilos >= ALERTA_KG
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-[#1E3A6E] dark:text-slate-100'

    return (
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-[#E2E5EB] dark:border-slate-800 shadow-sm transition-colors">
            <div className="px-6 py-3">
                {/* Row 1: label + total + sobrecarga badge + category dots */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">Total General</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-xl sm:text-2xl font-bold font-mono leading-tight ${textColor}`}>
                                    {totalKilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    <span className="text-sm sm:text-base font-semibold ml-1 text-gray-500 dark:text-slate-400">kg</span>
                                </p>
                                {overLimit && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-900/50 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wide animate-pulse">
                                        <AlertTriangle size={11} />
                                        <span className="hidden sm:inline">Sobrecarga</span>
                                        <span className="sm:hidden">Exc.</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category dots */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start sm:justify-end shrink-0">
                        {CATEGORIAS.map(cat => {
                            const v = subtotales[cat.key] ?? 0
                            return (
                                <div key={cat.key} className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md sm:bg-transparent sm:p-0">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                                    <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                        {cat.shortLabel} {v.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#F4F6FA] dark:bg-slate-800 rounded-full overflow-hidden border border-[#E2E5EB] dark:border-slate-700">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap">
                        0 kg{' '}
                        <span className="text-red-500 dark:text-red-400 font-medium">Límite: {LIMITE_KG.toLocaleString('es-MX')} kg</span>
                    </span>
                </div>
            </div>
        </div>
    )
}
