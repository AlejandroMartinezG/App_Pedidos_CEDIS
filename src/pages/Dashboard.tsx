import React, { useEffect, useState, Fragment } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Topbar } from '@/components/layout/Topbar'
import { SolicitudesPanel } from '@/components/admin/SolicitudesPanel'
import { SolicitudesFechasPanel } from '@/components/admin/SolicitudesFechasPanel'
import { CalendarView } from '@/components/admin/CalendarView'
import { CheckCircle, Clock, Package, TrendingUp, Eye, Printer, ChevronDown, Users2, Pencil, CalendarDays, List } from 'lucide-react'
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
]

export function Dashboard() {
    useAuth()
    const [searchParams] = useSearchParams()
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
    const [layout, setLayout] = useState<'lista' | 'calendario'>('lista')

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

    return (
        <div>
            <Topbar
                title={activeView === 'pedidos' ? 'Lista de Pedidos' : 'Accesos y Usuarios'}
                subtitle={activeView === 'pedidos' ? 'Vista tabular de todos los pedidos programados.' : 'Solicitudes de acceso y gestión de usuarios.'}
            />
            {/* View Tabs */}
            <div className="px-6 pt-4 pb-0">
                <div className="flex gap-1 border-b border-gray-200 dark:border-slate-800 mb-6 transition-colors">
                    <button
                        onClick={() => setActiveView('pedidos')}
                        className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${activeView === 'pedidos'
                            ? 'text-[#1E3A6E] dark:text-blue-400 border-b-2 border-[#1E3A6E] dark:border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Package size={15} />
                        Pedidos
                    </button>
                    <button
                        onClick={() => setActiveView('fechas')}
                        className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${activeView === 'fechas'
                            ? 'text-[#1E3A6E] dark:text-blue-400 border-b-2 border-[#1E3A6E] dark:border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <CalendarDays size={15} />
                        Fechas Pendientes
                        {pendingFechas > 0 && (
                            <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {pendingFechas}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveView('solicitudes')}
                        className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${activeView === 'solicitudes'
                            ? 'text-[#1E3A6E] dark:text-blue-400 border-b-2 border-[#1E3A6E] dark:border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Users2 size={15} />
                        Solicitudes & Usuarios
                        {pendingSolicitudes > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
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
                <div className="p-6 space-y-5">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
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
                                <div className="flex flex-col gap-3 mt-4">
                                    <div className="flex items-center justify-between text-base font-bold border-t border-gray-200 dark:border-slate-800 pt-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-gray-500 dark:text-slate-400">HINO</span>
                                        </div>
                                        <span className="text-gray-800 dark:text-slate-200 text-lg">{toneladasHino.toFixed(1)} t</span>
                                    </div>
                                    <div className="flex items-center justify-between text-base font-bold">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span className="text-gray-500 dark:text-slate-400">CEDIS</span>
                                        </div>
                                        <span className="text-gray-800 dark:text-slate-200 text-lg">{toneladasCEDIS.toFixed(1)} t</span>
                                    </div>
                                </div>
                            }
                        />
                    </div>

                    {/* Filters & View Toggle */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl px-4 py-3 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 dark:text-slate-500 font-medium flex items-center gap-1">
                                <ChevronDown size={13} /> Filtros:
                            </span>
                            <select
                                value={filterSucursal}
                                onChange={e => setFilterSucursal(e.target.value)}
                                className="text-xs border border-[#E2E5EB] dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 dark:focus:ring-blue-500/50 bg-white dark:bg-slate-800 text-[#1E3A6E] dark:text-slate-200 font-medium transition-colors"
                            >
                                <option value="all">Todas las sucursales</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            <select
                                value={filterEstado}
                                onChange={e => setFilterEstado(e.target.value)}
                                className="text-xs border border-[#E2E5EB] dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/30 dark:focus:ring-blue-500/50 bg-white dark:bg-slate-800 text-[#1E3A6E] dark:text-slate-200 font-medium transition-colors"
                            >
                                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                            </select>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
                            <button
                                onClick={() => setLayout('lista')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${layout === 'lista'
                                    ? 'bg-white dark:bg-slate-700 text-[#1E3A6E] dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <List size={14} /> Lista
                            </button>
                            <button
                                onClick={() => setLayout('calendario')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${layout === 'calendario'
                                    ? 'bg-white dark:bg-slate-700 text-[#1E3A6E] dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <CalendarDays size={14} /> Calendario
                            </button>
                        </div>
                    </div>

                    {/* Layout Content */}
                    {layout === 'calendario' ? (
                        <div className="animate-fade-in">
                            <CalendarView pedidos={filtered} />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl overflow-x-auto transition-colors animate-fade-in">
                            {loading ? (
                                <div className="flex justify-center py-16">
                                    <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <table className="w-full text-xs min-w-[800px]">
                                    <thead className="bg-[#F4F6FA] dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                                        <tr>
                                            <th className="px-4 py-3 text-left"># Pedido</th>
                                            <th className="px-4 py-3 text-left">Sucursal</th>
                                            <th className="px-4 py-3 text-left">F. Entrega</th>
                                            <th className="px-4 py-3 text-left">Tipo Entrega</th>
                                            <th className="px-4 py-3 text-right">Total kg</th>
                                            <th className="px-4 py-3 text-center">Estatus</th>
                                            <th className="px-4 py-3 text-left">Enviado</th>
                                            <th className="px-4 py-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F4F6FA] dark:divide-slate-800/80">
                                        {filtered.map(p => (
                                            <Fragment key={p.id}>
                                                <tr className={`hover:bg-[#F4F6FA]/50 dark:hover:bg-slate-800/30 transition-colors ${selectedPedido?.id === p.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                    <td className="px-4 py-3 font-mono font-bold text-[#2B5EA7] dark:text-blue-400">{p.codigo_pedido}</td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300 font-medium">{p.sucursal?.nombre ?? '—'}</td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                                                        {format(parseISO(p.fecha_entrega), 'dd/MMM/yy', { locale: es })}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                                                        {p.tipo_entrega ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#1E3A6E] dark:text-slate-100">
                                                        {p.total_kilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${ESTADO_COLORS[p.estado]}`}>
                                                            ● {ESTADO_LABELS[p.estado]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {p.enviado_at ? format(parseISO(p.enviado_at), 'dd/MMM/yy', { locale: es }) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => setSelectedPedido(selectedPedido?.id === p.id ? null : p)}
                                                                className={`p-1.5 rounded-lg transition-colors ${selectedPedido?.id === p.id ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-[#2B5EA7] hover:bg-blue-50'}`}
                                                                title="Ver formato imprimible"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <Link
                                                                to={`/nuevo-pedido/${p.id}`}
                                                                className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                                                                title="Editar pedido"
                                                            >
                                                                <Pencil size={14} />
                                                            </Link>
                                                            {p.estado === 'enviado' && (
                                                                <button
                                                                    onClick={() => cambiarEstado(p.id, 'aprobado')}
                                                                    className="px-2.5 py-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                                                                >
                                                                    Aprobar
                                                                </button>
                                                            )}
                                                            {p.estado === 'aprobado' && (
                                                                <button
                                                                    onClick={() => cambiarEstado(p.id, 'impreso')}
                                                                    className="px-2.5 py-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-1"
                                                                >
                                                                    <Printer size={11} /> Imprimir
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Inline Preview Row */}
                                                {selectedPedido?.id === p.id && (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-6 bg-gray-50 dark:bg-slate-800/40 border-y border-gray-100 dark:border-slate-800 animate-fade-in">
                                                            <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                                                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/80">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
                                                                            <Printer size={16} />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-sm font-bold text-[#1E3A6E] dark:text-blue-300">Vista previa del Formato</h3>
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Pedido {p.codigo_pedido}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Link
                                                                            to={`/imprimir/${p.id}`}
                                                                            target="_blank"
                                                                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all"
                                                                        >
                                                                            <Printer size={14} /> Imprimir
                                                                        </Link>
                                                                        <Link
                                                                            to={`/imprimir/${p.id}`}
                                                                            target="_blank"
                                                                            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A6E] dark:bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-[#2B5EA7] dark:hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all"
                                                                        >
                                                                            ↓ Exportar PDF
                                                                        </Link>
                                                                        <button
                                                                            onClick={() => setSelectedPedido(null)}
                                                                            className="ml-2 p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                                                        >
                                                                            <Package className="rotate-45" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="p-0 bg-white">
                                                                    <iframe
                                                                        src={`/imprimir/${p.id}?preview=1`}
                                                                        className="w-full h-[500px] bg-white"
                                                                        title="Vista previa"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                        {filtered.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                                                    No hay pedidos con los filtros seleccionados
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
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
        <div className={`relative overflow-hidden rounded-3xl p-6 border shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 group ${dark
            ? 'bg-[#1E3A6E] text-white border-[#1E3A6E]'
            : 'bg-white dark:bg-slate-900 border-[#E2E5EB] dark:border-slate-800'
            }`}>
            {/* Massive Background Icon (Visual Anchor) */}
            <div className={`absolute bottom-0 right-4 opacity-[0.15] transform transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12 ${dark ? 'text-white' : 'text-[#1E3A6E]'}`}>
                <div className="scale-[4] origin-bottom-right">
                    {icon}
                </div>
            </div>

            {/* Header with Icon and Label */}
            <div className="relative z-10 flex items-center gap-4 mb-3">
                <div className={`p-3.5 rounded-2xl shadow-xl transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-105 relative -top-3 -left-1 ${dark
                    ? 'bg-gradient-to-br from-blue-500 to-[#1e325c] text-white border border-blue-400/30 shadow-blue-900/50'
                    : 'bg-white dark:bg-slate-800 text-[#2B5EA7] dark:text-blue-400 border border-gray-100 dark:border-slate-700 shadow-gray-200/50 dark:shadow-none'
                    }`}>
                    <div className="scale-95 origin-center">
                        {icon}
                    </div>
                </div>
                <span className={`text-[13px] font-black uppercase tracking-[0.15em] relative -top-1.5 ${dark ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'}`}>
                    {label}
                </span>
            </div>

            {/* Main Value */}
            <div className="relative z-10 flex items-baseline gap-2 mb-2 mt-4">
                <p className={`${unit ? 'text-7xl' : 'text-[7.5rem]'} font-[900] tracking-tighter leading-[0.85] ${dark ? 'text-white' : 'text-[#1E3A6E] dark:text-slate-50'}`}>
                    {value}
                </p>
                {unit && (
                    <span className={`text-xl font-black opacity-60 ${dark ? 'text-blue-100' : 'text-[#1E3A6E] dark:text-slate-300'}`}>
                        {unit}
                    </span>
                )}
            </div>

            {/* Subtext or Breakdown */}
            <div className="relative z-10 mt-3 pt-2">
                {typeof sub === 'string' ? (
                    <p className={`text-base leading-tight font-bold ${dark ? 'text-blue-200/90' : 'text-gray-500 dark:text-slate-400'}`}>
                        {sub}
                    </p>
                ) : sub}
            </div>
        </div>
    )
}
