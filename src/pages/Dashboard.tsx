import React, { useEffect, useState, Fragment } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Topbar } from '@/components/layout/Topbar'
import { SolicitudesPanel } from '@/components/admin/SolicitudesPanel'
import { SolicitudesFechasPanel } from '@/components/admin/SolicitudesFechasPanel'
import { CalendarView } from '@/components/admin/CalendarView'
import { CheckCircle, Clock, Package, TrendingUp, Eye, Printer, ChevronDown, Users2, Pencil, CalendarDays, List, Trash2 } from 'lucide-react'
import { ESTADO_LABELS, ESTADO_COLORS } from '@/lib/constants'
import type { Pedido, Sucursal, EstadoPedido } from '@/lib/types'
import { format, parseISO, startOfWeek, endOfWeek, startOfToday } from 'date-fns'
import { es } from 'date-fns/locale'

interface PedidoRow extends Pedido {
    sucursal?: Sucursal
}

const ESTADOS: { value: EstadoPedido | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos los estatus' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'impreso', label: 'Impreso' },
    { value: 'colocado_piso', label: 'Colocado en piso' },
    { value: 'expedido', label: 'Expedido' },
    { value: 'recibido', label: 'Recibido' },
]

export function Dashboard() {
    useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const [pedidos, setPedidos] = useState<PedidoRow[]>([])
    const [sucursales, setSucursales] = useState<Sucursal[]>([])
    const [loading, setLoading] = useState(true)
    const [filterSucursal, setFilterSucursal] = useState<string>('all')
    const [filterEstado, setFilterEstado] = useState<string>('all')
    const [selectedPedido, setSelectedPedido] = useState<PedidoRow | null>(null)
    const [activeView, setActiveView] = useState<'pedidos' | 'solicitudes' | 'fechas'>(
        searchParams.get('tab') === 'solicitudes' ? 'solicitudes' : 'pedidos'
    )
    const [pendingSolicitudes, setPendingSolicitudes] = useState(0)
    const [pendingFechas, setPendingFechas] = useState(0)
    const [layout, setLayout] = useState<'lista' | 'calendario'>('calendario')
    const [deleting, setDeleting] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

    // Sync URL param changes (e.g. when sidebar button is clicked while on dashboard)
    useEffect(() => {
        if (searchParams.get('tab') === 'solicitudes') setActiveView('solicitudes')
        else if (searchParams.get('tab') === 'fechas') setActiveView('fechas')
        else setActiveView('pedidos')
    }, [searchParams])

    const fetchPedidos = async () => {
        const { data } = await supabase
            .from('pedidos')
            .select('*, sucursal:sucursales(*)')
            .order('created_at', { ascending: false })
        setPedidos((data as PedidoRow[]) ?? [])
        setLoading(false)
    }

    const fetchPendingCounts = () => {
        supabase
            .from('solicitudes_acceso')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'pendiente')
            .then(({ count }) => setPendingSolicitudes(count ?? 0))

        supabase
            .from('pedidos')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'pendiente_fecha')
            .then(({ count }) => setPendingFechas(count ?? 0))
    }

    useEffect(() => {
        fetchPedidos()
        supabase.from('sucursales').select('*').then(({ data }) => setSucursales((data as Sucursal[]) ?? []))
        fetchPendingCounts()

        // Realtime: update badge counts when pedidos change
        const channel = supabase
            .channel('dashboard-pending-counts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                fetchPendingCounts()
                fetchPedidos()
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    // ── Stats ──────────────────────────────────────────────────────────
    const today = format(startOfToday(), 'yyyy-MM-dd')
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

    const pedidosHoy = pedidos.filter(p => p.fecha_entrega === today).length
    const totalEnviados = pedidos.filter(p => p.estado === 'enviado').length
    const totalAprobados = pedidos.filter(p => p.estado === 'aprobado').length
    const pedidosSemana = pedidos.filter(p => {
        const d = parseISO(p.fecha_entrega)
        return d >= weekStart && d <= weekEnd && ['enviado', 'aprobado', 'impreso'].includes(p.estado)
    })

    const toneladasSemana = pedidosSemana.reduce((sum, p) => sum + (p.total_kilos ?? 0), 0) / 1000
    const toneladasHino = pedidosSemana
        .filter(p => p.tipo_entrega === 'HINO')
        .reduce((sum, p) => sum + (p.total_kilos ?? 0), 0) / 1000
    const toneladasCEDIS = pedidosSemana
        .filter(p => p.tipo_entrega === 'Recolección en CEDIS')
        .reduce((sum, p) => sum + (p.total_kilos ?? 0), 0) / 1000

    // ── Filtered ───────────────────────────────────────────────────────
    const filtered = pedidos.filter(p => {
        if (filterSucursal !== 'all' && p.sucursal_id !== filterSucursal) return false
        if (filterEstado !== 'all' && p.estado !== filterEstado) return false
        return true
    })

    const cambiarEstado = async (pedidoId: string, nuevoEstado: EstadoPedido) => {
        await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId)
        await fetchPedidos()
    }

    const handleDelete = async (pedidoId: string) => {
        setDeleting(pedidoId)
        const { error } = await supabase.from('pedidos').delete().eq('id', pedidoId)
        if (!error) {
            setPedidos(prev => prev.filter(p => p.id !== pedidoId))
        }
        setDeleting(null)
        setConfirmDelete(null)
    }

    return (
        <div>
            <Topbar
                title={activeView === 'pedidos' ? 'Lista de Pedidos' : 'Accesos y Usuarios'}
                subtitle={activeView === 'pedidos' ? 'Vista tabular de todos los pedidos programados.' : 'Solicitudes de acceso y gestión de usuarios.'}
            />
            {/* View Tabs */}
            <div className="px-4 md:px-6 pt-4 pb-0">
                <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-gray-200 dark:border-slate-800 mb-6 transition-colors -mx-4 px-4 md:mx-0 md:px-0">
                    <button
                        onClick={() => setSearchParams({})}
                        className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeView === 'pedidos'
                            ? 'text-[#1E3A6E] dark:text-blue-400 border-b-2 border-[#1E3A6E] dark:border-blue-400 font-bold'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Package size={15} />
                        Pedidos
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: 'fechas' })}
                        className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeView === 'fechas'
                            ? 'text-[#1E3A6E] dark:text-blue-400 border-b-2 border-[#1E3A6E] dark:border-blue-400 font-bold'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <CalendarDays size={15} />
                        Fechas Pendientes
                        {pendingFechas > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {pendingFechas}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: 'solicitudes' })}
                        className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeView === 'solicitudes'
                            ? 'text-[#1E3A6E] dark:text-blue-400 border-b-2 border-[#1E3A6E] dark:border-blue-400 font-bold'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Users2 size={15} />
                        Usuarios
                        {pendingSolicitudes > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {pendingSolicitudes}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Fechas Pendientes view */}
            {activeView === 'fechas' && (
                <div className="px-6">
                    <SolicitudesFechasPanel />
                </div>
            )}

            {/* Solicitudes view */}
            {activeView === 'solicitudes' && (
                <div className="px-6">
                    <SolicitudesPanel />
                </div>
            )}

            {/* Pedidos view */}
            {activeView === 'pedidos' && (
                <div className="p-4 md:p-6 space-y-5">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 md:mt-4">
                        <StatCard
                            icon={<Package size={28} strokeWidth={2} />}
                            label="Pedidos Hoy"
                            value={pedidosHoy}
                            sub="Con fecha de entrega hoy"
                            dark
                        />
                        <StatCard
                            icon={<Clock size={28} strokeWidth={2} />}
                            label="Total Enviados"
                            value={totalEnviados}
                            sub="Esperando revisión"
                        />
                        <StatCard
                            icon={<CheckCircle size={28} strokeWidth={2} />}
                            label="Aprobados"
                            value={totalAprobados}
                            sub="Listos para imprimir"
                        />
                        <StatCard
                            icon={<TrendingUp size={28} strokeWidth={2} />}
                            label="Toneladas Totales"
                            value={toneladasSemana.toFixed(1)}
                            unit="t"
                            sub={
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="flex items-center justify-between text-sm font-bold border-t border-gray-200 dark:border-slate-800 pt-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-gray-500 dark:text-slate-400">HINO</span>
                                        </div>
                                        <span className="text-gray-800 dark:text-slate-200">{toneladasHino.toFixed(1)} t</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm font-bold">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span className="text-gray-500 dark:text-slate-400">CEDIS</span>
                                        </div>
                                        <span className="text-gray-800 dark:text-slate-200">{toneladasCEDIS.toFixed(1)} t</span>
                                    </div>
                                </div>
                            }
                        />
                    </div>

                    {/* Filters & View Toggle Section */}
                    <div className="space-y-3">
                        {/* Filters Container */}
                        <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-2xl p-3 shadow-sm transition-colors">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex items-center gap-2 px-1 text-gray-400 dark:text-slate-500">
                                    <ChevronDown size={14} className="flex-shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
                                </div>
                                <div className="flex flex-1 gap-2">
                                    <select
                                        value={filterSucursal}
                                        onChange={e => setFilterSucursal(e.target.value)}
                                        className="flex-1 text-xs border border-[#E2E5EB] dark:border-slate-700 rounded-xl px-3 py-2.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 dark:focus:ring-blue-500/50 bg-white dark:bg-slate-800 text-[#1E3A6E] dark:text-slate-200 font-bold transition-colors appearance-none shadow-sm"
                                    >
                                        <option value="all">Todas las sucursales</option>
                                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                    <select
                                        value={filterEstado}
                                        onChange={e => setFilterEstado(e.target.value)}
                                        className="flex-1 text-xs border border-[#E2E5EB] dark:border-slate-700 rounded-xl px-3 py-2.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 dark:focus:ring-blue-500/50 bg-white dark:bg-slate-800 text-[#1E3A6E] dark:text-slate-200 font-bold transition-colors appearance-none shadow-sm"
                                    >
                                        {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* View Switcher (Full width on mobile) */}
                        <div className="bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700/50 flex w-full md:w-max">
                            <button
                                onClick={() => setLayout('calendario')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${layout === 'calendario'
                                    ? 'bg-white dark:bg-slate-700 text-[#2B5EA7] dark:text-blue-300 shadow-md ring-1 ring-black/5 scale-[1.02]'
                                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
                                    }`}
                            >
                                <CalendarDays size={16} /> Calendario
                            </button>
                            <button
                                onClick={() => setLayout('lista')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${layout === 'lista'
                                    ? 'bg-white dark:bg-slate-700 text-[#2B5EA7] dark:text-blue-300 shadow-md ring-1 ring-black/5 scale-[1.02]'
                                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
                                    }`}
                            >
                                <List size={16} /> Ver Lista
                            </button>
                        </div>
                    </div>

                    {/* Layout Content */}
                    {layout === 'calendario' ? (
                        <div className="animate-fade-in">
                            <CalendarView pedidos={filtered} onDelete={handleDelete} />
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-4">
                            {/* Desktop Table View (Hidden on Mobile) */}
                            <div className="hidden lg:block bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
                                {loading ? (
                                    <div className="flex justify-center py-16">
                                        <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <table className="w-full text-xs">
                                        <thead className="bg-[#F4F6FA] dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 uppercase tracking-widest font-black h-12">
                                            <tr>
                                                <th className="px-5 py-3 text-left"># Pedido</th>
                                                <th className="px-5 py-3 text-left">Sucursal</th>
                                                <th className="px-5 py-3 text-left">Entrega</th>
                                                <th className="px-5 py-3 text-left">Tipo</th>
                                                <th className="px-5 py-3 text-right">Kilos</th>
                                                <th className="px-5 py-3 text-center">Estatus</th>
                                                <th className="px-5 py-3 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-5 py-20 text-center text-gray-400 font-medium">No se encontraron pedidos matching</td>
                                                </tr>
                                            ) : filtered.map(p => (
                                                <Fragment key={p.id}>
                                                    <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors ${selectedPedido?.id === p.id ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                                        <td className="px-5 py-4 font-mono font-black text-[#2B5EA7] dark:text-blue-400">{p.codigo_pedido}</td>
                                                        <td className="px-5 py-4 text-gray-700 dark:text-slate-200 font-bold">{p.sucursal?.nombre ?? '—'}</td>
                                                        <td className="px-5 py-4 text-gray-600 dark:text-slate-400 font-medium capitalize">
                                                            {format(parseISO(p.fecha_entrega), "dd 'de' MMM", { locale: es })}
                                                        </td>
                                                        <td className="px-5 py-4 text-[10px] font-black text-gray-500 dark:text-slate-500 uppercase">
                                                            {p.tipo_entrega ?? '—'}
                                                        </td>
                                                        <td className="px-5 py-4 text-right font-mono font-bold text-[#1E3A6E] dark:text-slate-100">
                                                            {p.total_kilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-tight ${ESTADO_COLORS[p.estado]}`}>
                                                                {ESTADO_LABELS[p.estado]}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => setSelectedPedido(selectedPedido?.id === p.id ? null : p)}
                                                                    className={`p-2 rounded-xl border transition-all active:scale-95 ${selectedPedido?.id === p.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'border-blue-100 text-blue-500 hover:bg-blue-50'}`}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <Link
                                                                    to={`/nuevo-pedido/${p.id}`}
                                                                    className="p-2 border border-amber-100 text-amber-600 hover:bg-amber-50 rounded-xl transition-all active:scale-95"
                                                                >
                                                                    <Pencil size={16} />
                                                                </Link>
                                                                {confirmDelete === p.id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="p-2 bg-red-600 text-white rounded-xl shadow-md"><CheckCircle size={14} /></button>
                                                                        <button onClick={() => setConfirmDelete(null)} className="p-2 bg-gray-100 text-gray-500 rounded-xl"><Package size={14} className="rotate-45" /></button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => setConfirmDelete(p.id)} className="p-2 border border-red-100 text-red-400 hover:bg-red-50 rounded-xl transition-all active:scale-95"><Trash2 size={16} /></button>
                                                                )}

                                                                {/* Status Actions */}
                                                                {p.estado === 'enviado' && (
                                                                    <button onClick={() => cambiarEstado(p.id, 'aprobado')} className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase rounded-xl hover:bg-emerald-700 shadow-sm transition-all active:scale-95">Aprobar</button>
                                                                )}
                                                                {p.estado === 'aprobado' && (
                                                                    <button onClick={() => cambiarEstado(p.id, 'impreso')} className="px-4 py-2 bg-blue-600 text-white text-[11px] font-black uppercase rounded-xl hover:bg-blue-700 shadow-sm transition-all active:scale-95 flex items-center gap-2 font-black"><Printer size={14} /> Imprimir</button>
                                                                )}
                                                                {p.estado === 'impreso' && (
                                                                    <button onClick={() => cambiarEstado(p.id, 'colocado_piso')} className="px-4 py-2 bg-[#1E3A6E] text-white text-[11px] font-black uppercase rounded-xl hover:bg-[#2B5EA7] shadow-sm transition-all active:scale-95">A Piso</button>
                                                                )}
                                                                {p.estado === 'colocado_piso' && (
                                                                    <button onClick={() => cambiarEstado(p.id, 'expedido')} className="px-4 py-2 bg-purple-600 text-white text-[11px] font-black uppercase rounded-xl hover:bg-purple-700 shadow-sm transition-all active:scale-95">Expedir</button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {selectedPedido?.id === p.id && (
                                                        <tr className="bg-blue-50/20 dark:bg-blue-900/5">
                                                            <td colSpan={7} className="px-6 py-6 border-y border-blue-100 dark:border-blue-900/30">
                                                                <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
                                                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/50">
                                                                        <div className="flex items-center gap-3">
                                                                            <Printer className="text-blue-600" size={18} />
                                                                            <h3 className="text-sm font-bold text-gray-800 dark:text-blue-300">Vista previa: {p.codigo_pedido}</h3>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <Link to={`/imprimir/${p.id}`} target="_blank" className="px-4 py-2 bg-[#1E3A6E] text-white text-xs font-black rounded-xl active:scale-95 flex items-center gap-2 h-9">
                                                                                <Printer size={14} /> PDF / Imprimir
                                                                            </Link>
                                                                            <button onClick={() => setSelectedPedido(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-0 border-none">
                                                                        <iframe src={`/imprimir/${p.id}?preview=1`} className="w-full h-[600px] border-none bg-white" title="Order Preview" />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Mobile Card Layout (Visible on Small Screens) */}
                            <div className="lg:hidden space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="text-center py-16 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 text-gray-400 font-medium">No se encontraron pedidos matching</div>
                                ) : filtered.map(p => (
                                    <div key={p.id} className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm transition-all ${selectedPedido?.id === p.id ? 'border-[#2B5EA7] ring-2 ring-[#2B5EA7]/20 shadow-blue-100' : 'border-gray-200 dark:border-slate-800'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="font-mono font-black text-[#2B5EA7] dark:text-blue-400 text-lg uppercase">{p.codigo_pedido}</p>
                                                <p className="font-black text-gray-800 dark:text-slate-200 text-base leading-tight mt-0.5">{p.sucursal?.nombre || '—'}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-tight ${ESTADO_COLORS[p.estado]}`}>
                                                {ESTADO_LABELS[p.estado]}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Entrega</p>
                                                <p className="text-xs font-bold text-gray-700 dark:text-slate-300 capitalize">{format(parseISO(p.fecha_entrega), "EEEE d 'de' MMM", { locale: es })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Kilos</p>
                                                <p className="text-sm font-mono font-black text-[#1E3A6E] dark:text-slate-100">{p.total_kilos.toLocaleString('es-MX', { minimumFractionDigits: 1 })} kg</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {/* Status Actions */}
                                            {p.estado === 'enviado' && (
                                                <button onClick={() => cambiarEstado(p.id, 'aprobado')} className="w-full py-3.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg active:scale-95 transition-all">Aprobar Pedido</button>
                                            )}
                                            {p.estado === 'aprobado' && (
                                                <button onClick={() => cambiarEstado(p.id, 'impreso')} className="w-full py-3.5 bg-blue-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all font-black"><Printer size={18} /> Imprimir Formato</button>
                                            )}
                                            {p.estado === 'impreso' && (
                                                <button onClick={() => cambiarEstado(p.id, 'colocado_piso')} className="w-full py-3.5 bg-[#1E3A6E] text-white text-xs font-black uppercase rounded-2xl shadow-lg active:scale-95 transition-all">Colocar en Piso</button>
                                            )}
                                            {p.estado === 'colocado_piso' && (
                                                <button onClick={() => cambiarEstado(p.id, 'expedido')} className="w-full py-3.5 bg-purple-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg active:scale-95 transition-all">Expedir Salida</button>
                                            )}

                                            {/* Secondary Actions */}
                                            <div className="flex gap-2 w-full mt-1">
                                                <button onClick={() => setSelectedPedido(p)} className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold text-xs rounded-2xl border border-blue-100 dark:border-blue-900/30 active:scale-95 transition-all">Detalle</button>
                                                <Link to={`/nuevo-pedido/${p.id}`} className="flex-1 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 font-bold text-xs rounded-2xl border border-amber-100 dark:border-amber-900/30 text-center active:scale-95 transition-all flex items-center justify-center gap-2"><Pencil size={14} /> Editar</Link>
                                                <button onClick={() => setConfirmDelete(p.id === confirmDelete ? null : p.id)} className={`px-4 py-3 rounded-2xl border transition-all active:scale-95 ${confirmDelete === p.id ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/30'}`}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            {/* Mobile Delete Confirm */}
                                            {confirmDelete === p.id && (
                                                <div className="p-3 bg-red-600 rounded-2xl flex items-center justify-between text-white animate-in zoom-in-95 duration-200">
                                                    <p className="text-[10px] font-black uppercase tracking-tight">¿Confirmar borrado?</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleDelete(p.id)} className="px-5 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase">Sí</button>
                                                        <button onClick={() => setConfirmDelete(null)} className="px-5 py-2 bg-red-700 text-white/80 rounded-xl text-[10px] font-black uppercase">No</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Mobile Details Sheet Overlay */}
                                        {selectedPedido?.id === p.id && (
                                            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                                                <div className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-t-[2rem] shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
                                                    <div className="w-12 h-1 bg-gray-200 dark:bg-slate-800 rounded-full mx-auto my-3" />
                                                    <div className="px-6 pb-4 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-950 z-10">
                                                        <div>
                                                            <h3 className="text-xl font-black text-[#1E3A6E] dark:text-slate-100">{p.codigo_pedido}</h3>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.sucursal?.nombre}</p>
                                                        </div>
                                                        <button onClick={() => setSelectedPedido(null)} className="p-2 text-gray-400 hover:text-gray-600"><XCircle size={28} /></button>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto px-4 pb-6">
                                                        <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl overflow-hidden shadow-inner">
                                                            <iframe
                                                                src={`/imprimir/${p.id}?preview=1`}
                                                                className="w-full h-[550px] border-none bg-white"
                                                                title="Mobile Preview"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="p-6 border-t border-gray-100 dark:border-slate-900 bg-white dark:bg-slate-950 flex flex-col gap-3">
                                                        <Link to={`/imprimir/${p.id}`} target="_blank" className="w-full py-4 bg-[#1E3A6E] text-white text-sm font-black uppercase rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all">
                                                            <Printer size={18} /> Imprimir / PDF
                                                        </Link>
                                                        <button onClick={() => setSelectedPedido(null)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest">Cerrar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function XCircle({ size, className }: { size?: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
        </svg>
    )
}

function StatCard({ icon, label, value, sub, unit, dark = false }: {
    icon: React.ReactNode
    label: string
    value: string | number
    sub: React.ReactNode
    unit?: string
    dark?: boolean
}) {
    return (
        <div className={`relative overflow-hidden rounded-3xl p-5 border shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${dark
            ? 'bg-[#1E3A6E] text-white border-[#1E3A6E]'
            : 'bg-white dark:bg-slate-900 border-[#E2E5EB] dark:border-slate-800'
            }`}>
            {/* Background Icon (Visual Anchor) */}
            <div className={`absolute bottom-0 right-4 opacity-[0.1] transform transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12 ${dark ? 'text-white' : 'text-[#1E3A6E]'}`}>
                <div className="scale-[2.5] origin-bottom-right">
                    {icon}
                </div>
            </div>

            {/* Header with Icon and Label */}
            <div className="relative z-10 flex items-center gap-3 mb-2">
                <div className={`p-2.5 rounded-2xl shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105 relative -top-1 ${dark
                    ? 'bg-gradient-to-br from-blue-500 to-[#1e325c] text-white border border-blue-400/30'
                    : 'bg-white dark:bg-slate-800 text-[#2B5EA7] dark:text-blue-400 border border-gray-100 dark:border-slate-700 shadow-gray-200/50 dark:shadow-none'
                    }`}>
                    <div className="scale-90 origin-center">
                        {icon}
                    </div>
                </div>
                <span className={`text-[11px] font-black uppercase tracking-[0.15em] relative -top-0.5 ${dark ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>
                    {label}
                </span>
            </div>

            {/* Main Value */}
            <div className="relative z-10 flex items-baseline gap-2 mb-1 mt-2">
                <p className={`${unit ? 'text-5xl' : 'text-6xl'} font-[900] tracking-tighter leading-none ${dark ? 'text-white' : 'text-[#1E3A6E] dark:text-slate-50'}`}>
                    {value}
                </p>
                {unit && (
                    <span className={`text-lg font-black opacity-60 ${dark ? 'text-blue-100' : 'text-[#1E3A6E] dark:text-slate-300'}`}>
                        {unit}
                    </span>
                )}
            </div>

            {/* Subtext or Breakdown */}
            <div className="relative z-10 mt-2">
                {typeof sub === 'string' ? (
                    <p className={`text-xs leading-tight font-bold uppercase tracking-tight ${dark ? 'text-blue-200/90' : 'text-gray-400 dark:text-slate-500'}`}>
                        {sub}
                    </p>
                ) : sub}
            </div>
        </div>
    )
}
