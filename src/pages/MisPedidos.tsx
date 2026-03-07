import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Eye, Trash2, Printer, PlusCircle, CheckCircle2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Topbar } from '@/components/layout/Topbar'
import { ESTADO_LABELS, ESTADO_COLORS } from '@/lib/constants'
import type { Pedido } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function MisPedidos() {
    const { user } = useAuth()
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [updating, setUpdating] = useState<string | null>(null)

    const fetchPedidos = () => {
        if (!user?.sucursal_id) return
        supabase
            .from('pedidos')
            .select('*')
            .eq('sucursal_id', user.sucursal_id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                setPedidos((data as Pedido[]) ?? [])
                setLoading(false)
            })
    }

    useEffect(() => {
        if (!user?.sucursal_id) return
        fetchPedidos()
        // Realtime: refresh list when admin approves/changes a pedido
        const channel = supabase
            .channel('mis-pedidos-' + user.sucursal_id)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'pedidos',
                filter: `sucursal_id=eq.${user.sucursal_id}`
            }, () => fetchPedidos())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user?.sucursal_id]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleDelete = async (pedidoId: string) => {
        setDeleting(true)
        try {
            // Delete detalles first (foreign key)
            const { error: err1 } = await supabase.from('pedido_detalle').delete().eq('pedido_id', pedidoId)
            if (err1) throw new Error(err1.message)

            const { error: err2 } = await supabase.from('pedidos').delete().eq('id', pedidoId)
            if (err2) throw new Error(err2.message)

            setPedidos(prev => prev.filter(p => p.id !== pedidoId))
        } catch (error: any) {
            console.error('Error al borrar:', error)
            alert('No se pudo borrar el pedido: ' + error.message)
        } finally {
            setDeleting(false)
            setConfirmDelete(null)
        }
    }

    const confirmarRecibido = async (pedidoId: string) => {
        setUpdating(pedidoId)
        try {
            const { error } = await supabase.from('pedidos').update({ estado: 'recibido' }).eq('id', pedidoId)
            if (error) throw error
            setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: 'recibido' } : p))
        } catch (error: any) {
            console.error('Error al confirmar recibido:', error)
            alert('No se pudo confirmar: ' + error.message)
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div>
            <Topbar
                title="Mis Pedidos"
                subtitle="Historial de pedidos de tu sucursal"
                actions={
                    <Link
                        to="/seleccionar-fecha"
                        className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA7] text-white text-sm font-semibold rounded-lg hover:bg-[#1E3A6E] transition-colors shadow-sm"
                    >
                        <PlusCircle size={16} />
                        <span className="hidden sm:inline">Nuevo Pedido</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Link>
                }
            />

            <div className="p-6">
                {/* Banner: fecha aprobada, pedido sin llenar */}
                {pedidos.some(p => p.estado === 'borrador' && p.total_kilos === 0) && (
                    <div className="mb-4 flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 text-sm">
                        <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <span>
                            <strong>¡Tu fecha fue aprobada!</strong> Tienes pedidos en borrador listos para capturar. Haz clic en <strong>Subir pedido</strong> para ingresar los materiales.
                        </span>
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : pedidos.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-gray-400">
                        <FileText size={40} className="mb-3 opacity-30" />
                        <p className="text-sm">No tienes pedidos aún</p>
                        <Link to="/seleccionar-fecha" className="mt-4 text-[#2B5EA7] text-sm font-semibold hover:underline">
                            Crear primer pedido
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E5EB] dark:border-slate-800 overflow-x-auto transition-colors">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead className="bg-[#F4F6FA] dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left">Código</th>
                                    <th className="px-4 py-3 text-left">Fecha Entrega</th>
                                    <th className="px-4 py-3 text-right">Total kg</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-left">Enviado</th>
                                    <th className="px-4 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F6FA] dark:divide-slate-800/80">
                                {pedidos.map(p => (
                                    <tr key={p.id} className="hover:bg-[#F4F6FA]/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono font-bold text-[#2B5EA7] dark:text-blue-400 text-xs">{p.codigo_pedido}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                                            {format(parseISO(p.fecha_entrega), "d 'de' MMMM yyyy", { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#1E3A6E] dark:text-slate-100">
                                            {p.total_kilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })} kg
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_COLORS[p.estado]}`}>
                                                {ESTADO_LABELS[p.estado]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">
                                            {p.enviado_at ? format(parseISO(p.enviado_at), 'dd/MMM/yy HH:mm', { locale: es }) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    to={`/nuevo-pedido/${p.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#2B5EA7] dark:text-blue-400 border border-[#2B5EA7]/30 dark:border-blue-400/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                >
                                                    {p.estado === 'borrador' ? <Upload size={12} /> : <Eye size={12} />}
                                                    {p.estado === 'borrador' ? 'Subir pedido' : 'Ver'}
                                                </Link>

                                                <Link
                                                    to={`/imprimir/${p.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                                    title="Ver / Imprimir Formato de Surtido"
                                                >
                                                    <Printer size={12} />
                                                    Resumen
                                                </Link>

                                                {p.estado === 'expedido' && (
                                                    <button
                                                        onClick={() => confirmarRecibido(p.id)}
                                                        disabled={updating === p.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-semibold"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                        {updating === p.id ? '...' : 'Confirmar Recibido'}
                                                    </button>
                                                )}


                                                {/* Eliminar borradores y pendientes */}
                                                {(p.estado === 'borrador' || p.estado === 'pendiente_fecha') && (
                                                    confirmDelete === p.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleDelete(p.id)}
                                                                disabled={deleting}
                                                                className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                                                            >
                                                                {deleting ? '...' : 'Confirmar'}
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDelete(null)}
                                                                className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 text-black dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDelete(p.id)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                            Borrar
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    )
}
