import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Eye, Trash2 } from 'lucide-react'
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

    useEffect(() => { fetchPedidos() }, [user?.sucursal_id]) // eslint-disable-line react-hooks/exhaustive-deps

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

    return (
        <div>
            <Topbar title="Mis Pedidos" subtitle="Historial de pedidos de tu sucursal" />

            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : pedidos.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-gray-400">
                        <FileText size={40} className="mb-3 opacity-30" />
                        <p className="text-sm">No tienes pedidos aún</p>
                        <Link to="/nuevo-pedido" className="mt-4 text-[#2B5EA7] text-sm font-semibold hover:underline">
                            Crear primer pedido
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#E2E5EB] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[#F4F6FA] text-gray-500 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left">Código</th>
                                    <th className="px-4 py-3 text-left">Fecha Entrega</th>
                                    <th className="px-4 py-3 text-right">Total kg</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-left">Enviado</th>
                                    <th className="px-4 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F6FA]">
                                {pedidos.map(p => (
                                    <tr key={p.id} className="hover:bg-[#F4F6FA]/50">
                                        <td className="px-4 py-3 font-mono font-bold text-[#2B5EA7] text-xs">{p.codigo_pedido}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {format(parseISO(p.fecha_entrega), "d 'de' MMMM yyyy", { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#1E3A6E]">
                                            {p.total_kilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })} kg
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_COLORS[p.estado]}`}>
                                                {ESTADO_LABELS[p.estado]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {p.enviado_at ? format(parseISO(p.enviado_at), 'dd/MMM/yy HH:mm', { locale: es }) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    to={`/nuevo-pedido/${p.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#2B5EA7] border border-[#2B5EA7]/30 rounded-lg hover:bg-blue-50 transition-colors"
                                                >
                                                    <Eye size={12} />
                                                    {p.estado === 'borrador' ? 'Editar' : 'Ver'}
                                                </Link>

                                                {/* Eliminar solo borradores */}
                                                {p.estado === 'borrador' && (
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
                                                                className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDelete(p.id)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
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
        </div>
    )
}
