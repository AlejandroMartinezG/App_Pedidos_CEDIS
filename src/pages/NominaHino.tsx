import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'
import {
    Calendar, Truck, User, Hash, MapPin,
    Play, Save, History, Trash2,
    Loader2, Eye, FileText
} from 'lucide-react'
import {
    format, parseISO, startOfWeek, addDays,
    eachDayOfInterval
} from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'

interface Viaje {
    trayecto: number
    dia: string
    fecha: string
    origen: string
    destino: string
    motivo: string
}

interface NominaReporte {
    id?: string
    operador: string
    economico: string
    placas: string
    semana_inicio: string
    semana_fin: string
    pagar_en: string
    viajes: Viaje[]
    total_viajes: number
    created_at?: string
}

export function NominaHino() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [history, setHistory] = useState<NominaReporte[]>([])
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Form States
    const [operador, setOperador] = useState('')
    const [economico, setEconomico] = useState('')
    const [placas, setPlacas] = useState('')
    const [pagarEn, setPagarEn] = useState('')
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

    // Report Data
    const [reporte, setReporte] = useState<NominaReporte | null>(null)

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('nominas_hino')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)
        setHistory(data || [])
    }

    const generarNomina = async () => {
        if (!operador || !economico || !placas || !pagarEn) {
            alert('Por favor completa todos los campos superiores.')
            return
        }

        setLoading(true)
        try {
            // Calculate week range (Monday to Saturday)
            const date = parseISO(selectedDate)
            const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
            const weekEnd = addDays(weekStart, 5) // Saturday

            const startStr = format(weekStart, 'yyyy-MM-dd')
            const endStr = format(weekEnd, 'yyyy-MM-dd')

            // Fetch HINO orders for that week
            const { data: pedidos, error } = await supabase
                .from('pedidos')
                .select('*, sucursal:sucursales(nombre)')
                .eq('tipo_entrega', 'HINO')
                .gte('fecha_entrega', startStr)
                .lte('fecha_entrega', endStr)
                .order('fecha_entrega', { ascending: true })

            if (error) throw error

            // Generate viajes logic
            const diasSemana = eachDayOfInterval({ start: weekStart, end: weekEnd })
            const todosViajes: Viaje[] = []
            let trayectoCount = 1

            diasSemana.forEach(dia => {
                const fechaStr = format(dia, 'yyyy-MM-dd')
                const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase()

                const pedidosDia = pedidos?.filter(p => p.fecha_entrega === fechaStr) || []

                if (pedidosDia.length === 0) {
                    todosViajes.push({
                        trayecto: trayectoCount++,
                        dia: diaNombre,
                        fecha: format(dia, 'dd/MM/yyyy'),
                        origen: 'SIN VIAJE',
                        destino: 'SIN VIAJE',
                        motivo: 'SIN VIAJE'
                    })
                } else {
                    pedidosDia.forEach(pedido => {
                        const sucursalNombre = (pedido.sucursal as any)?.nombre || 'SUCURSAL DESCONOCIDA'

                        // IDA
                        todosViajes.push({
                            trayecto: trayectoCount++,
                            dia: diaNombre,
                            fecha: format(dia, 'dd/MM/yyyy'),
                            origen: 'CEDIS PACHUCA',
                            destino: sucursalNombre,
                            motivo: 'MATERIA'
                        })

                        // VUELTA
                        todosViajes.push({
                            trayecto: trayectoCount++,
                            dia: diaNombre,
                            fecha: format(dia, 'dd/MM/yyyy'),
                            origen: sucursalNombre,
                            destino: 'CEDIS PACHUCA',
                            motivo: 'VACIO'
                        })
                    })
                }
            })

            setReporte({
                operador,
                economico,
                placas,
                semana_inicio: startStr,
                semana_fin: endStr,
                pagar_en: pagarEn,
                viajes: todosViajes,
                total_viajes: todosViajes.filter(v => v.motivo !== 'SIN VIAJE').length
            })

        } catch (err) {
            console.error('Error generando nómina:', err)
            alert('Error al generar la nómina. Revisa la consola.')
        } finally {
            setLoading(false)
        }
    }

    const guardarReporte = async () => {
        if (!reporte) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('nominas_hino')
                .insert([reporte])

            if (error) throw error

            alert('Reporte guardado con éxito.')
            fetchHistory()
        } catch (err) {
            console.error('Error guardando reporte:', err)
            alert('Error al guardar el reporte.')
        } finally {
            setSaving(false)
        }
    }

    const eliminarReporte = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el reporte de ${name}?`)) return

        setDeletingId(id)
        console.log('Iniciando eliminación de reporte:', id)
        try {
            const { error } = await supabase
                .from('nominas_hino')
                .delete()
                .eq('id', id)

            if (error) throw error

            console.log('Reporte eliminado de Supabase con éxito')
            await fetchHistory()
            alert('Reporte eliminado con éxito.')
        } catch (err) {
            console.error('Error eliminando reporte:', err)
            alert('Error al eliminar el reporte. Revisa la consola.')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
            <Topbar
                title="Herramienta de Nómina HINO"
                subtitle="Genera reportes semanales basados en los viajes realizados."
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Input Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#E2E5EB] dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-[#1E3A6E] dark:text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Truck size={16} /> Configuración
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Operador</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={operador}
                                            onChange={e => setOperador(e.target.value)}
                                            placeholder="Nombre completo"
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Económico</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                value={economico}
                                                onChange={e => setEconomico(e.target.value)}
                                                placeholder="CH-1234"
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Placas</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                value={placas}
                                                onChange={e => setPlacas(e.target.value)}
                                                placeholder="00-AA-00"
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Pagar en:</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={pagarEn}
                                            onChange={e => setPagarEn(e.target.value)}
                                            placeholder="Sucursal de pago"
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Cualquier día de la semana</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={e => setSelectedDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    <p className="mt-2 text-[10px] text-gray-400 italic">Se calculará el periodo de lunes a sábado automáticamente.</p>
                                </div>

                                <button
                                    onClick={generarNomina}
                                    disabled={loading}
                                    className="w-full py-3 bg-[#1E3A6E] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="transition-transform group-hover:scale-110" />}
                                    Generar Nómina
                                </button>
                            </div>
                        </section>

                        {/* History section */}
                        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#E2E5EB] dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <History size={16} /> Recientes
                            </h3>
                            <div className="space-y-3">
                                {history.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic text-center py-4">No hay reportes guardados.</p>
                                ) : (
                                    history.map(h => (
                                        <div
                                            key={h.id}
                                            className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div onClick={() => navigate(`/imprimir-nomina/${h.id}`)}>
                                                <p className="text-sm font-bold text-[#1E3A6E] dark:text-blue-300">{h.operador}</p>
                                                <p className="text-[10px] text-gray-400">{format(parseISO(h.semana_inicio), 'dd/MM')} al {format(parseISO(h.semana_fin), 'dd/MM/yyyy')}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/imprimir-nomina/${h.id}`)}
                                                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                    title="Ver / Imprimir"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        eliminarReporte(h.id!, h.operador)
                                                    }}
                                                    disabled={deletingId === h.id}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                    title="Eliminar reporte"
                                                >
                                                    {deletingId === h.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Result Panel */}
                    <div className="lg:col-span-3">
                        {!reporte ? (
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 border border-dashed border-gray-300 dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-60">
                                <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-full mb-6">
                                    <FileText size={48} className="text-gray-300" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-400 mb-2">Sin información generada</h2>
                                <p className="text-sm text-gray-400 max-w-xs">Configura los datos del operador y selecciona una semana para previsualizar el reporte.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                {/* Report Header Summary */}
                                <div className="bg-[#1E3A6E] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                                    {/* Background patterns */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />

                                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2 block">Vista Previa de Reporte</span>
                                            <h2 className="text-3xl font-black tracking-tight mb-4">{reporte.operador}</h2>
                                            <div className="flex flex-wrap gap-4">
                                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                                    <Truck size={14} className="opacity-60" /> {reporte.economico} ({reporte.placas})
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                                    <Calendar size={14} className="opacity-60" /> {format(parseISO(reporte.semana_inicio), "dd 'de' MMMM", { locale: es })} - {format(parseISO(reporte.semana_fin), "dd 'de' MMMM yyyy", { locale: es })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={guardarReporte}
                                                disabled={saving}
                                                className="px-6 py-3 bg-white text-[#1E3A6E] font-black rounded-xl text-sm uppercase tracking-wider hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Guardar Reporte
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Trips Table */}
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-[#E2E5EB] dark:border-slate-800 shadow-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-[#E2E5EB] dark:border-slate-800">
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-20">Trayecto</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Día</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Fecha</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Origen</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Destino</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Motivo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reporte.viajes.map((viaje, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className={clsx(
                                                            "border-b border-gray-100 dark:border-slate-800/60 transition-colors",
                                                            viaje.motivo === 'SIN VIAJE' ? 'bg-gray-50/50 dark:bg-slate-800/20' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                                                        )}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-black text-[#1E3A6E] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 w-8 h-8 flex items-center justify-center rounded-lg">
                                                                {viaje.trayecto}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-slate-300">{viaje.dia}</td>
                                                        <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-slate-400">{viaje.fecha}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "text-xs font-bold px-2.5 py-1 rounded-lg",
                                                                viaje.origen === 'CEDIS PACHUCA' ? 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/40' :
                                                                    viaje.origen === 'SIN VIAJE' ? 'text-gray-400' : 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/40'
                                                            )}>
                                                                {viaje.origen}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "text-xs font-bold px-2.5 py-1 rounded-lg",
                                                                viaje.destino === 'CEDIS PACHUCA' ? 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/40' :
                                                                    viaje.destino === 'SIN VIAJE' ? 'text-gray-400' : 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/40'
                                                            )}>
                                                                {viaje.destino}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                                                viaje.motivo === 'MATERIA' ? 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/40' :
                                                                    viaje.motivo === 'VACIO' ? 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/40' : 'text-gray-400'
                                                            )}>
                                                                {viaje.motivo}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-gray-50/80 dark:bg-slate-800/80">
                                                    <td colSpan={5} className="px-6 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Total de Viajes:</td>
                                                    <td className="px-6 py-5 text-xl font-black text-[#1E3A6E] dark:text-blue-400">{reporte.total_viajes}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
