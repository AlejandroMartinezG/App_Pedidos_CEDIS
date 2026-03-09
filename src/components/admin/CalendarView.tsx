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
import { ChevronLeft, ChevronRight, Eye, X, Trash2 } from 'lucide-react'
import type { Pedido, Sucursal } from '@/lib/types'
import { Link } from 'react-router-dom'

interface PedidoRow extends Pedido {
    sucursal?: Sucursal
}

interface CalendarViewProps {
    pedidos: PedidoRow[]
    onDelete?: (id: string) => Promise<void>
}

export function CalendarView({ pedidos, onDelete }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [modalPedido, setModalPedido] = useState<PedidoRow | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-[#1E3A6E] capitalize dark:text-slate-100 text-center sm:text-left">
                    {format(currentDate, dateFormat, { locale: es })}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 md:px-4 py-2 text-xs md:text-sm font-semibold border border-[#E2E5EB] dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-[#1E3A6E] dark:text-slate-300 transition-colors bg-white dark:bg-slate-900"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        )
    }

    const renderDays = () => {
        return (
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day, i) => (
                    <div key={i} className="text-center text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest py-2">
                        <span className="hidden md:inline">{day}</span>
                        <span className="md:hidden">{day.charAt(0)}</span>
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
                            className={`min-h-[90px] md:min-h-[140px] bg-white dark:bg-slate-900 p-1 md:p-2.5 border-none transition-colors cursor-pointer group hover:bg-[#F4F6FA] dark:hover:bg-slate-800/80 relative ${!isCurrentMonth ? 'opacity-40 bg-gray-50/50' : ''
                                } ${isSelected ? 'ring-2 ring-inset ring-[#2B5EA7] bg-blue-50/30' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1 md:mb-3">
                                <span className={`w-6 h-6 md:w-9 md:h-9 flex items-center justify-center rounded-full text-xs md:text-base font-bold transition-all ${isToday
                                    ? 'bg-[#1E3A6E] text-white shadow-lg scale-110'
                                    : isSelected
                                        ? 'bg-blue-100 text-[#2B5EA7] border-2 border-blue-200'
                                        : 'text-gray-700 dark:text-slate-300 group-hover:bg-gray-200 dark:group-hover:bg-slate-700'
                                    }`}>
                                    {format(day, 'd')}
                                </span>
                                {dayPedidos.length > 0 && (
                                    <span className="text-[8px] md:text-[10px] font-bold text-[#2B5EA7] bg-blue-50 px-1 md:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">
                                        {dayPedidos.length} <span className="hidden md:inline">{dayPedidos.length === 1 ? 'ped' : 'peds'}</span>
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1 md:gap-2 overflow-y-auto max-h-[80px] md:max-h-[130px] custom-scrollbar pb-1 pointer-events-auto">
                                {dayPedidos.map((pedido) => {
                                    const statusColors: Record<string, string> = {
                                        borrador: 'bg-gray-400',
                                        enviado: 'bg-amber-500',
                                        aprobado: 'bg-emerald-500',
                                        impreso: 'bg-blue-500',
                                        colocado_piso: 'bg-indigo-500',
                                        expedido: 'bg-purple-500',
                                        recibido: 'bg-teal-500'
                                    }
                                    const barColor = statusColors[pedido.estado] || 'bg-slate-300'

                                    return (
                                        <div
                                            key={pedido.id}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setModalPedido(pedido)
                                            }}
                                            className="cursor-pointer text-[9px] md:text-[11px] font-bold flex flex-col bg-white dark:bg-slate-800 p-1 md:p-2 rounded-md md:rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm leading-tight hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all relative overflow-hidden pl-2 md:pl-3.5 group/item"
                                        >
                                            {/* Indicador lateral de estatus */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 md:w-1.5 ${barColor} opacity-90`} />

                                            <div className="flex justify-between items-center mb-0.5 md:mb-1">
                                                <span className="font-black text-[#1E3A6E] dark:text-blue-300 truncate max-w-[85%] md:max-w-[70%] tracking-tight">
                                                    {pedido.codigo_pedido.replace('ACT-', '')}
                                                </span>
                                                <div className={`hidden md:block w-2 h-2 rounded-full ${barColor} shadow-sm`} />
                                            </div>
                                            <div className="hidden md:flex justify-between items-center text-[10px] text-gray-500 dark:text-slate-400 uppercase font-bold tracking-tighter">
                                                <span className="truncate max-w-[55%]">{pedido.sucursal?.nombre || '—'}</span>
                                                <span className="font-black text-[#2B5EA7] dark:text-slate-200 whitespace-nowrap">
                                                    {pedido.total_kilos?.toLocaleString('es-MX', { maximumFractionDigits: 0 })} kg
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                                {dayPedidos.length > 0 && (
                                    <div className="text-[9px] md:text-[11px] font-black text-[#1E3A6E] dark:text-blue-400 text-center mt-1 md:mt-2 border-t md:border-t-2 border-gray-100 dark:border-slate-700 pt-1 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 transition-colors">
                                        <span className="hidden md:inline">Total: </span>{totalKg.toLocaleString('es-MX', { maximumFractionDigits: 0 })}<span className="md:inline"> kg</span>
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
        <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl p-3 md:p-6 transition-colors shadow-sm overflow-hidden">
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
                                <div
                                    key={pedido.id}
                                    onClick={() => setModalPedido(pedido)}
                                    className="cursor-pointer border border-[#E2E5EB] dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all bg-white dark:bg-slate-800"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono font-bold text-[#2B5EA7]">{pedido.codigo_pedido}</span>
                                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{pedido.estado}</span>
                                        </div>
                                        <p className="font-bold text-gray-800 dark:text-slate-200 text-sm mb-1">{pedido.sucursal?.nombre || 'Sin sucursal'}</p>
                                        <div className="text-xs text-gray-500 flex gap-4 mt-2">
                                            <p><span className="font-semibold text-gray-400">Entrega:</span> {pedido.tipo_entrega || '—'}</p>
                                            <p><span className="font-semibold text-gray-400">Total:</span> {pedido.total_kilos?.toLocaleString()} kg</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                                        <button
                                            className="text-xs flex items-center gap-1 font-semibold text-[#1E3A6E] hover:text-[#2B5EA7] dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            <Eye size={12} /> Ver Resumen
                                        </button>
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

            {/* Modal de Pedido */}
            {modalPedido && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => { setModalPedido(null); setConfirmDelete(false); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-bold text-[#1E3A6E] dark:text-blue-300 font-mono tracking-tight">
                                    {modalPedido.codigo_pedido}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">
                                    {modalPedido.sucursal?.nombre || 'Sin sucursal asignada'}
                                </p>
                            </div>
                            <button onClick={() => setModalPedido(null)} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Estatus</p>
                                    <span className="text-sm font-bold capitalize text-gray-700 dark:text-slate-200 flex items-center gap-2">
                                        {modalPedido.estado === 'impreso' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        {modalPedido.estado === 'colocado_piso' && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                                        {modalPedido.estado === 'expedido' && <span className="w-2 h-2 rounded-full bg-purple-500"></span>}
                                        {modalPedido.estado === 'recibido' && <span className="w-2 h-2 rounded-full bg-teal-500"></span>}
                                        {modalPedido.estado === 'aprobado' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                        {modalPedido.estado}
                                    </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Tipo de Entrega</p>
                                    <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{modalPedido.tipo_entrega || '—'}</span>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Fecha programada</p>
                                    <span className="text-sm font-bold text-gray-700 dark:text-slate-200">
                                        {format(parseISO(modalPedido.fecha_entrega), "dd 'de' MMM, yyyy", { locale: es })}
                                    </span>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1.5">Masa Total</p>
                                    <span className="text-lg font-bold text-[#1E3A6E] dark:text-blue-300 leading-none block">
                                        {modalPedido.total_kilos?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} kg
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {onDelete && (
                                    confirmDelete ? (
                                        <div className="flex items-center gap-1.5 animate-fade-in">
                                            <button
                                                onClick={async () => {
                                                    setIsDeleting(true)
                                                    await onDelete(modalPedido.id)
                                                    setIsDeleting(false)
                                                    setModalPedido(null)
                                                    setConfirmDelete(false)
                                                }}
                                                disabled={isDeleting}
                                                className="px-3 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                            >
                                                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(false)}
                                                disabled={isDeleting}
                                                className="px-3 py-2 rounded-lg text-sm font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-60 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                                            title="Eliminar pedido permanentemente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setModalPedido(null); setConfirmDelete(false); }} className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors">
                                    Regresar
                                </button>
                                <Link
                                    to={`/imprimir/${modalPedido.id}`}
                                    target="_blank"
                                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#1E3A6E] text-white hover:bg-[#2B5EA7] transition-all flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
                                >
                                    <Eye size={16} /> Ver Formulario Completo
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
