import { useState, useEffect } from 'react'
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarDays, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Topbar } from '@/components/layout/Topbar'
import { LIMITE_KG } from '@/lib/constants'
import type { TipoEntrega } from '@/lib/types'

interface FechaOcupada {
    fecha_entrega: string
    total_kilos: number
    count_pedidos: number
    pedidos_info?: string[]
}

export function SeleccionarFecha() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [fechasOcupadas, setFechasOcupadas] = useState<Record<string, FechaOcupada>>({})
    const [loading, setLoading] = useState(false)
    const [rpcError, setRpcError] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega | "">("")

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
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Domingo
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    const handleDateClick = (day: Date) => {
        const str = format(day, 'yyyy-MM-dd')
        const ocupacion = fechasOcupadas[str]
        const ocupadoKg = ocupacion?.total_kilos || 0
        if (ocupadoKg >= LIMITE_KG) return // Lleno
        if (day < new Date() && !isSameDay(day, new Date())) return // Passed

        setSelectedDate(day)
        setTipoEntrega("")
    }

    const handleCreateRequest = async () => {
        if (!selectedDate || !tipoEntrega || !user?.sucursal_id) return
        setSubmitting(true)

        try {
            // Get abreviacion
            const { data: suc } = await supabase
                .from('sucursales')
                .select('abreviacion')
                .eq('id', user.sucursal_id)
                .single()

            const abreviacion = suc?.abreviacion ?? 'SUC'
            const randomSuffix = Math.floor(Math.random() * 900 + 100).toString()
            const fechaStr = format(selectedDate, 'yyyy-MM-dd')
            const codigoPedido = `${abreviacion}-${format(new Date(fechaStr + 'T12:00:00'), 'yyyyMMdd')}-${randomSuffix}`

            const { error } = await supabase
                .from('pedidos')
                .insert({
                    codigo_pedido: codigoPedido,
                    sucursal_id: user.sucursal_id,
                    fecha_entrega: fechaStr,
                    tipo_entrega: tipoEntrega,
                    total_kilos: 0,
                    estado: 'pendiente_fecha'
                })

            if (error) throw error
            navigate('/mis-pedidos')
        } catch (e: any) {
            alert('Error al solicitar la fecha: ' + e.message)
        } finally {
            setSubmitting(false)
            setSelectedDate(null)
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Topbar title="Solicitar Fecha de Entrega" subtitle="Selecciona una fecha disponible para programar tu nuevo pedido" />

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
                            <span>No se pudo cargar la disponibilidad de fechas. Aplica la migración <code>20240306170000_grant_fechas_rpc.sql</code> en Supabase y recarga la página.</span>
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

                                    const clickable = !isPast && !isLleno && !isDomingo
                                    const isLibre = !isPast && !isDomingo && !isLleno && !isMedium

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => { if (clickable) handleDateClick(day) }}
                                            className={`min-h-[100px] p-2 border-none transition-colors relative flex flex-col items-center justify-start 
                                                ${bgColor}
                                                ${!isCurrentMonth ? 'opacity-40' : ''} 
                                                ${clickable ? 'cursor-pointer hover:bg-blue-50/50 hover:ring-2 ring-inset ring-blue-300 dark:hover:bg-blue-900/20' : 'cursor-not-allowed'}
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
                                                                else if (est === 'en_ruta') { dotColor = "bg-blue-500"; title = "En Ruta"; }
                                                                else if (est === 'entregado') { dotColor = "bg-indigo-500"; title = "Entregado"; }
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

            {/* Modal */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-[#1E3A6E] dark:text-blue-300">
                                Solicitar Fecha
                            </h3>
                            <button onClick={() => setSelectedDate(null)} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Fecha seleccionada:</p>
                                <p className="font-bold text-gray-800 dark:text-slate-200 capitalize">
                                    {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
                                    Tipo de Entrega <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={tipoEntrega}
                                    onChange={(e) => setTipoEntrega(e.target.value as TipoEntrega)}
                                    className="w-full h-11 px-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#2B5EA7] focus:border-transparent transition-all outline-none"
                                >
                                    <option value="" disabled>Selecciona el tipo...</option>
                                    <option value="HINO">HINO</option>
                                    <option value="Recolección en CEDIS">Recolección en CEDIS</option>
                                </select>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-3 rounded-lg flex items-start gap-2">
                                <AlertTriangle size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 dark:text-blue-300">
                                    La fecha quedará pendiente de aprobación. Podrás llenar tu pedido con los materiales una vez que el CEDIS apruebe tu solicitud.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateRequest}
                                disabled={submitting || !tipoEntrega}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#1E3A6E] text-white hover:bg-[#2B5EA7] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                Enviar Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
