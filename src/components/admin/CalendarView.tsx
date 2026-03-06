import { useState } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    parseISO,
    addMonths,
    subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import type { Pedido, Sucursal } from '@/lib/types'
import { Link } from 'react-router-dom'

interface PedidoRow extends Pedido {
    sucursal?: Sucursal
}

interface CalendarViewProps {
    pedidos: PedidoRow[]
}

export function CalendarView({ pedidos }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Domingo

    const dateFormat = "MMMM yyyy"
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    // Agrupar pedidos por fecha
    const pedidosPorFecha = pedidos.reduce((acc, pedido) => {
        if (!pedido.fecha_entrega) return acc
        const d = parseISO(pedido.fecha_entrega)
        const dateKey = format(d, 'yyyy-MM-dd')
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(pedido)
        return acc
    }, {} as Record<string, PedidoRow[]>)

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#1E3A6E] capitalize dark:text-slate-100">
                    {format(currentDate, dateFormat, { locale: es })}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 text-sm font-semibold border border-[#E2E5EB] dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-[#1E3A6E] dark:text-slate-300 transition-colors bg-white dark:bg-slate-900"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        )
    }

    const renderDays = () => {
        return (
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day, i) => (
                    <div key={i} className="text-center text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>
        )
    }

    const renderCells = () => {
        return (
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                {days.map((day, i) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayPedidos = pedidosPorFecha[dateKey] || []
                    const isToday = isSameDay(day, new Date())
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isCurrentMonth = isSameMonth(day, monthStart)

                    const totalKg = dayPedidos.reduce((sum, p) => sum + (p.total_kilos || 0), 0)

                    return (
                        <div
                            key={i}
                            onClick={() => setSelectedDate(day)}
                            className={`min-h-[120px] bg-white dark:bg-slate-900 p-2 border-none transition-colors cursor-pointer group hover:bg-[#F4F6FA] dark:hover:bg-slate-800/80 relative ${!isCurrentMonth ? 'opacity-50 bg-gray-50/50' : ''
                                } ${isSelected ? 'ring-2 ring-inset ring-[#2B5EA7] bg-blue-50/30' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${isToday
                                    ? 'bg-[#1E3A6E] text-white shadow-md'
                                    : isSelected
                                        ? 'bg-blue-100 text-[#2B5EA7]'
                                        : 'text-gray-700 dark:text-slate-300 group-hover:bg-gray-200 dark:group-hover:bg-slate-700'
                                    }`}>
                                    {format(day, 'd')}
                                </span>
                                {dayPedidos.length > 0 && (
                                    <span className="text-[10px] font-bold text-[#2B5EA7] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                        {dayPedidos.length} {dayPedidos.length === 1 ? 'ped' : 'peds'}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[70px] pointer-events-none">
                                {dayPedidos.length > 0 && (
                                    <div className="text-[10px] font-medium text-gray-500 flex flex-col gap-1">
                                        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded-md border border-gray-100">
                                            <span>Masa total:</span>
                                            <span className="font-bold text-[#1E3A6E]">{totalKg.toLocaleString('es-MX', { maximumFractionDigits: 0 })} kg</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl p-6 transition-colors shadow-sm">
            {renderHeader()}
            {renderDays()}
            {renderCells()}

            {/* Selected Date Details */}
            {selectedDate && (
                <div className="mt-6 border-t border-gray-200 dark:border-slate-800 pt-6 animate-fade-in">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-lg font-bold text-[#1E3A6E] dark:text-slate-100 flex items-center gap-2 capitalize">
                            <span className="w-2 h-6 bg-[#D4A01E] rounded-full"></span>
                            Pedidos para el {format(selectedDate, "d 'de' MMMM", { locale: es })}
                        </h3>
                        <button onClick={() => setSelectedDate(null)} className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 font-medium">
                            Cerrar detalle
                        </button>
                    </div>

                    {pedidosPorFecha[format(selectedDate, 'yyyy-MM-dd')]?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pedidosPorFecha[format(selectedDate, 'yyyy-MM-dd')].map(pedido => (
                                <div key={pedido.id} className="border border-[#E2E5EB] dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-blue-300 transition-colors bg-white dark:bg-slate-800">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono font-bold text-[#2B5EA7]">{pedido.codigo_pedido}</span>
                                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{pedido.estado}</span>
                                        </div>
                                        <p className="font-bold text-gray-800 dark:text-slate-200 text-sm mb-1">{pedido.sucursal?.nombre || 'Sin sucursal'}</p>
                                        <div className="text-xs text-gray-500 flex gap-4 mt-2">
                                            <p><span className="font-semibold text-gray-400">Entrega:</span> {pedido.tipo_entrega}</p>
                                            <p><span className="font-semibold text-gray-400">Total:</span> {pedido.total_kilos.toLocaleString()} kg</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                                        <Link
                                            to={`/imprimir/${pedido.id}`}
                                            target="_blank"
                                            className="text-xs flex items-center gap-1 font-semibold text-[#1E3A6E] hover:text-[#2B5EA7]"
                                        >
                                            <Eye size={12} /> Ver Detalle
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 dark:text-slate-500 font-medium bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                            No hay entregas programadas para este día
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
