import { useState, useEffect } from 'react'
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'
import { LIMITE_KG } from '@/lib/constants'

interface FechaOcupada {
    fecha_entrega: string
    total_kilos: number
    count_pedidos: number
    pedidos_info?: string[]
}

export function CalendarioDisponibilidad() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [fechasOcupadas, setFechasOcupadas] = useState<Record<string, FechaOcupada>>({})
    const [loading, setLoading] = useState(false)
    const [rpcError, setRpcError] = useState(false)

    const loadFechas = async () => {
        setLoading(true)
        setRpcError(false)
        const start = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const end = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')

        const { data, error } = await supabase.rpc('get_fechas_ocupadas', {
            p_start_date: start,
            p_end_date: end
        })

        if (error) {
            console.error('get_fechas_ocupadas error:', error)
            setRpcError(true)
        } else if (data) {
            const map: Record<string, FechaOcupada> = {}
            for (const row of data as any[]) {
                map[row.fecha_entrega] = row
            }
            setFechasOcupadas(map)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadFechas()
    }, [currentDate])

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    return (
        <div className="flex flex-col min-h-screen">
            <Topbar title="Calendario de Disponibilidad" subtitle="Consulta las fechas disponibles para programar tus futuros pedidos" />

            <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
                <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-[#1E3A6E] capitalize dark:text-slate-100 flex items-center gap-2">
                            <CalendarDays className="text-[#2B5EA7]" />
                            {format(currentDate, "MMMM yyyy", { locale: es })}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-semibold border border-[#E2E5EB] dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-[#1E3A6E] dark:text-slate-300 transition-colors">
                                Hoy
                            </button>
                            <button onClick={nextMonth} className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Leyenda */}
                    <div className="flex items-center gap-4 mb-4 text-xs font-medium text-gray-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-700"></span> Despejado</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 dark:bg-amber-900/40 dark:border-amber-700"></span> Con envíos programados</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 dark:bg-red-900/40 dark:border-red-700"></span> Lleno (3+ envíos)</div>
                    </div>

                    {rpcError && (
                        <div className="mb-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-lg px-3 py-2 text-xs">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>No se pudo cargar la disponibilidad de fechas.</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Days Header */}
                            <div className="grid grid-cols-7 mb-2">
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, i) => (
                                    <div key={i} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Cells */}
                            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                {days.map((day, i) => {
                                    const dateKey = format(day, 'yyyy-MM-dd')
                                    const ocupacion = fechasOcupadas[dateKey]
                                    const ocupadoKg = ocupacion?.total_kilos || 0
                                    const countPedidos = ocupacion?.count_pedidos || 0
                                    const isCurrentMonth = isSameMonth(day, monthStart)
                                    const isPast = day < new Date() && !isSameDay(day, new Date())

                                    const isLleno = countPedidos >= 3 || ocupadoKg >= LIMITE_KG
                                    const isMedium = countPedidos > 0 && !isLleno

                                    const isDomingo = day.getDay() === 0

                                    let bgColor = "bg-white dark:bg-slate-900"
                                    if (isDomingo) bgColor = "bg-gray-100 dark:bg-slate-800/50 opacity-60"
                                    else if (isLleno) bgColor = "bg-red-50 dark:bg-red-900/10"
                                    else if (isMedium) bgColor = "bg-amber-50 dark:bg-amber-900/10"
                                    else if (!isPast) bgColor = "bg-emerald-50 dark:bg-emerald-900/10"

                                    const isLibre = !isPast && !isDomingo && !isLleno && !isMedium

                                    return (
                                        <div
                                            key={i}
                                            className={`min-h-[100px] p-2 border-none transition-colors relative flex flex-col items-center justify-start 
                                                ${bgColor}
                                                ${!isCurrentMonth ? 'opacity-40' : ''} 
                                            `}
                                        >
                                            <div className="flex justify-between items-start w-full mb-2">
                                                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${isSameDay(day, new Date()) ? 'bg-[#1E3A6E] text-white' : 'text-gray-700 dark:text-slate-300'
                                                    }`}>
                                                    {format(day, 'd')}
                                                </span>
                                                {countPedidos > 0 && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isLleno ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                                        {countPedidos} {countPedidos === 1 ? 'envío' : 'envíos'}
                                                    </span>
                                                )}
                                                {isLibre && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                        Libre
                                                    </span>
                                                )}
                                            </div>

                                            {countPedidos > 0 && (
                                                <div className="absolute bottom-2 left-2 right-2 text-center flex flex-col items-center gap-0.5">
                                                    {ocupacion.pedidos_info && ocupacion.pedidos_info.length > 0 && (
                                                        <div className="flex flex-wrap gap-0.5 justify-center mb-0.5">
                                                            {ocupacion.pedidos_info.map((info, idx) => {
                                                                const [suc, est] = info.split('|');
                                                                let dotColor = "bg-gray-400";
                                                                let title = "Borrador";
                                                                if (est === 'pendiente_fecha') { dotColor = "bg-orange-400"; title = "Pendiente de Fecha"; }
                                                                else if (est === 'pendiente_revision') { dotColor = "bg-amber-400"; title = "Pendiente de Revisión"; }
                                                                else if (est === 'aprobado') { dotColor = "bg-emerald-500"; title = "Aprobado"; }
                                                                else if (est === 'impreso') { dotColor = "bg-blue-500"; title = "Impreso"; }
                                                                else if (est === 'colocado_piso') { dotColor = "bg-indigo-500"; title = "Colocado en Piso"; }
                                                                else if (est === 'expedido') { dotColor = "bg-purple-500"; title = "Expedido"; }
                                                                else if (est === 'recibido') { dotColor = "bg-teal-500"; title = "Recibido"; }
                                                                else if (est === 'en_ruta') { dotColor = "bg-blue-500"; title = "En Ruta"; }
                                                                else if (est === 'entregado') { dotColor = "bg-emerald-500"; title = "Entregado"; }
                                                                else if (est === 'cancelado') { dotColor = "bg-red-500"; title = "Cancelado"; }

                                                                return (
                                                                    <div key={idx} className="flex flex-row items-center gap-1 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm max-w-[80px] border border-slate-200/50 dark:border-slate-700/50" title={`${suc} - ${title}`}>
                                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                                                        <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-300 truncate">
                                                                            {suc}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                    {isLleno && <p className="text-[9px] text-red-600 dark:text-red-400 mt-0.5 font-bold uppercase">Lleno</p>}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
