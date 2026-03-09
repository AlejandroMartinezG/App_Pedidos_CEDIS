import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Pedido, Sucursal, TipoEntrega } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Save, Check } from 'lucide-react'

interface PedidoRow extends Pedido {
    sucursal?: Sucursal
}

export function SolicitudesFechasPanel() {
    const [solicitudes, setSolicitudes] = useState<PedidoRow[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editFecha, setEditFecha] = useState<string>('')
    const [editTipo, setEditTipo] = useState<TipoEntrega | ''>('')
    const [processing, setProcessing] = useState<string | null>(null)

    const fetchSolicitudes = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('pedidos')
            .select('*, sucursal:sucursales(*)')
            .eq('estado', 'pendiente_fecha')
            .order('created_at', { ascending: true })
        setSolicitudes((data as PedidoRow[]) ?? [])
        setLoading(false)
    }

    useEffect(() => {
        fetchSolicitudes()
        // Realtime: re-fetch whenever any pedido changes (new requests, cancellations)
        const channel = supabase
            .channel('solicitudes-fechas-panel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => fetchSolicitudes())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const handleAprobar = async (id: string, fecha: string, tipo: TipoEntrega) => {
        setProcessing(id)
        const { error } = await supabase
            .from('pedidos')
            .update({ estado: 'borrador', fecha_entrega: fecha, tipo_entrega: tipo })
            .eq('id', id)

        if (!error) {
            setSolicitudes(prev => prev.filter(s => s.id !== id))
        } else {
            alert('Error al aprobar: ' + error.message)
        }
        setProcessing(null)
        setEditingId(null)
    }

    const startEdit = (p: PedidoRow) => {
        setEditingId(p.id)
        setEditFecha(p.fecha_entrega)
        setEditTipo(p.tipo_entrega || '')
    }

    const cancelEdit = () => {
        setEditingId(null)
    }

    if (loading) return (
        <div className="flex justify-center py-10">
            <span className="w-6 h-6 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
        </div>
    )

    if (solicitudes.length === 0) return (
        <div className="bg-white dark:bg-slate-900 border border-[#E2E5EB] dark:border-slate-800 rounded-xl p-8 text-center text-gray-500 dark:text-slate-400">
            <CalendarDays className="mx-auto mb-3 opacity-20" size={48} />
            <p className="font-medium text-lg">No hay solicitudes de fecha pendientes</p>
            <p className="text-sm">Todas las fechas han sido aprobadas.</p>
        </div>
    )

    return (
        <div className="space-y-4">
            {solicitudes.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/50 shadow-sm rounded-xl p-5 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400 px-2 py-0.5 rounded uppercase">
                                    Pendiente
                                </span>
                                <h4 className="font-bold text-[#1E3A6E] dark:text-blue-300 text-lg">
                                    {p.sucursal?.nombre || 'Sucursal desconocida'}
                                </h4>
                            </div>
                            <p className="font-mono text-sm text-gray-500 dark:text-slate-400 font-bold tracking-tight">
                                {p.codigo_pedido}
                            </p>
                        </div>

                        {editingId === p.id ? (
                            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700 w-full md:w-auto">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[45px]">Fecha:</label>
                                    <input
                                        type="date"
                                        value={editFecha}
                                        onChange={e => setEditFecha(e.target.value)}
                                        className="flex-1 text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#2B5EA7]/30 dark:text-slate-100"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[45px]">Tipo:</label>
                                    <select
                                        value={editTipo}
                                        onChange={e => setEditTipo(e.target.value as TipoEntrega)}
                                        className="flex-1 text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#2B5EA7]/30 dark:text-slate-100"
                                    >
                                        <option value="HINO">HINO</option>
                                        <option value="Recolección en CEDIS">Recolección en CEDIS</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-200 dark:border-slate-700">
                                    <button onClick={cancelEdit} className="flex-1 sm:flex-none text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 transition-colors">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleAprobar(p.id, editFecha, editTipo as TipoEntrega)}
                                        disabled={processing === p.id}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1E3A6E] text-white text-xs font-bold rounded hover:bg-[#2B5EA7] disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {processing === p.id ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                                        Aprobar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 md:gap-8 w-full md:w-auto">
                                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 w-full sm:w-auto pb-3 sm:pb-0 border-b sm:border-0 border-gray-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-0.5 tracking-wider">Fecha Solicitada</p>
                                        <p className="font-bold text-sm md:text-base text-[#1E3A6E] dark:text-slate-200 capitalize">
                                            {format(parseISO(p.fecha_entrega), "EEEE, d 'de' MMMM", { locale: es })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-0.5 tracking-wider">Tipo Entrega</p>
                                        <p className="font-bold text-sm md:text-base text-gray-700 dark:text-slate-300">
                                            {p.tipo_entrega || '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                                    <button
                                        onClick={() => startEdit(p)}
                                        className="flex-1 md:flex-none px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                                    >
                                        Modificar
                                    </button>
                                    <button
                                        onClick={() => handleAprobar(p.id, p.fecha_entrega, p.tipo_entrega as TipoEntrega)}
                                        disabled={processing === p.id || !p.tipo_entrega}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
                                    >
                                        {processing === p.id ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                                        Aprobar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
