import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Topbar } from '@/components/layout/Topbar'
import { SolicitudesPanel } from '@/components/admin/SolicitudesPanel'
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
    const [activeView, setActiveView] = useState<'pedidos' | 'solicitudes'>(
        searchParams.get('tab') === 'solicitudes' ? 'solicitudes' : 'pedidos'
    )
    const [pendingSolicitudes, setPendingSolicitudes] = useState(0)
    const [layout, setLayout] = useState<'lista' | 'calendario'>('lista')

    // Sync URL param changes (e.g. when sidebar button is clicked while on dashboard)
    useEffect(() => {
        if (searchParams.get('tab') === 'solicitudes') setActiveView('solicitudes')
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

    useEffect(() => {
        fetchPedidos()
        supabase.from('sucursales').select('*').then(({ data }) => setSucursales((data as Sucursal[]) ?? []))
        // Fetch pending solicitudes count
        supabase
            .from('solicitudes_acceso')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'pendiente')
            .then(({ count }) => setPendingSolicitudes(count ?? 0))
    }, [])

    // ── Stats ──────────────────────────────────────────────────────────
    const today = format(startOfToday(), 'yyyy-MM-dd')
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

    const pedidosHoy = pedidos.filter(p => p.fecha_entrega === today).length
    const totalEnviados = pedidos.filter(p => p.estado === 'enviado').length
    const totalAprobados = pedidos.filter(p => p.estado === 'aprobado').length
    const toneladasSemana = pedidos
        .filter(p => {
            const d = parseISO(p.fecha_entrega)
            return d >= weekStart && d <= weekEnd && ['enviado', 'aprobado', 'impreso'].includes(p.estado)
        })
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
                            icon={<Package size={32} strokeWidth={2.5} />}
                            label="Pedidos Hoy"
                            value={pedidosHoy}
                            sub="Con fecha de entrega hoy"
                            dark
                        />
                        <StatCard
                            icon={<Clock size={32} strokeWidth={2.5} />}
                            label="Total Enviados"
                            value={totalEnviados}
                            sub="Esperando revisión"
                        />
                        <StatCard
                            icon={<CheckCircle size={32} strokeWidth={2.5} />}
                            label="Aprobados"
                            value={totalAprobados}
                            sub="Listos para imprimir"
                        />
                        <StatCard
                            icon={<TrendingUp size={32} strokeWidth={2.5} />}
                            label="Toneladas Totales"
                            value={`${toneladasSemana.toFixed(1)}`}
                            sub="Esta semana"
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
                                            <tr key={p.id} className="hover:bg-[#F4F6FA]/50 dark:hover:bg-slate-800/30 transition-colors">
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
                                                            className="p-1.5 text-gray-400 hover:text-[#2B5EA7] rounded-lg hover:bg-blue-50 transition-colors"
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

                    {/* Printable preview inline */}
                    {selectedPedido && (
                        <div className="bg-white border border-[#E2E5EB] rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-[#1E3A6E]">Vista previa — Formato Imprimible (Hoja 2)</h3>
                                <div className="flex gap-2">
                                    <Link
                                        to={`/imprimir/${selectedPedido.id}`}
                                        target="_blank"
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2E5EB] rounded-lg text-xs hover:bg-[#F4F6FA] transition-colors"
                                    >
                                        <Printer size={13} /> Imprimir
                                    </Link>
                                    <Link
                                        to={`/imprimir/${selectedPedido.id}`}
                                        target="_blank"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A6E] text-white rounded-lg text-xs hover:bg-[#2B5EA7] transition-colors font-semibold"
                                    >
                                        ↓ Exportar PDF
                                    </Link>
                                </div>
                            </div>
                            <div className="border border-[#E2E5EB] rounded-lg overflow-hidden">
                                <iframe
                                    src={`/imprimir/${selectedPedido.id}?preview=1`}
                                    className="w-full h-80 bg-gray-50"
                                    title="Vista previa"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function StatCard({ icon, label, value, sub, dark = false }: {
    icon: React.ReactNode
    label: string
    value: string | number
    sub: string
    dark?: boolean
}) {
    return (
        <div className={`relative rounded-2xl p-6 border shadow-sm transition-transform hover:-translate-y-1 ${dark ? 'bg-[#1E3A6E] text-white border-[#1E3A6E] shadow-blue-900/20' : 'bg-white dark:bg-slate-900 border-[#E2E5EB] dark:border-slate-800'}`}>
            <div className={`absolute -top-5 -right-3 w-16 h-16 flex items-center justify-center rounded-2xl shadow-lg transform -rotate-6 transition-all duration-300 hover:scale-110 hover:rotate-0 ${dark ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white border-4 border-white' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-4 border-white'}`}>
                {icon}
            </div>
            <div className={`flex items-center gap-2.5 mb-3 mt-1 ${dark ? 'text-blue-200' : 'text-gray-500 dark:text-slate-400'}`}>
                <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-6xl font-extrabold font-mono leading-none mb-2 ${dark ? 'text-white' : 'text-[#1E3A6E] dark:text-slate-100'}`}>
                {value}
            </p>
            <p className={`text-sm font-medium ${dark ? 'text-blue-200' : 'text-gray-400 dark:text-slate-400'}`}>{sub}</p>
        </div>
    )
}
