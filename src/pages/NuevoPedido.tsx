import { useEffect, useState } from 'react'
import { Save, Send, AlertTriangle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePedido } from '@/hooks/usePedido'
import { useMateriales } from '@/hooks/useMateriales'
import { CategoryTable } from '@/components/pedido/CategoryTable'
import { EnvasesTable } from '@/components/pedido/EnvasesTable'
import { FloatingTotal } from '@/components/pedido/FloatingTotal'
import { DateCodeSelector } from '@/components/pedido/DateCodeSelector'
import { Topbar } from '@/components/layout/Topbar'
import { CATEGORIAS, CATEGORIA_MAP } from '@/lib/constants'
import { format } from 'date-fns'

export function NuevoPedido() {
    const { id } = useParams<{ id?: string }>()
    const { user } = useAuth()
    const { materiales, loading: matLoading } = useMateriales()
    const {
        pedido, detalles, totalKilos, subtotalesPorCategoria,
        saving, fechaEntrega, setFechaEntrega, tipoEntrega, setTipoEntrega,
        initDetalles, loadExistingPedido, updateDetalle,
        saveDraft, submitPedido,
    } = usePedido()

    const [showConfirm, setShowConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (materiales.length === 0) return
        if (id) {
            loadExistingPedido(id, materiales)
        } else {
            initDetalles(materiales)
        }
    }, [materiales]) // eslint-disable-line react-hooks/exhaustive-deps

    const isAdmin = user?.rol === 'admin'
    const isReadonly = !isAdmin && pedido != null && pedido.estado !== 'borrador'
    const overLimit = totalKilos >= 11_500

    const codigoPedidoStr = pedido?.codigo_pedido || (fechaEntrega && user?.sucursal
        ? `${user.sucursal.abreviacion}-${format(new Date(fechaEntrega + 'T12:00:00'), 'yyyyMMdd')}`
        : '')

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const handleSave = async () => {
        if (!fechaEntrega) { showToast('Selecciona una fecha de entrega', 'error'); return }
        try { await saveDraft(); showToast(isAdmin ? 'Cambios guardados' : 'Borrador guardado') }
        catch (e) { showToast('Error al guardar', 'error') }
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            await submitPedido()
            setShowConfirm(false)
            showToast('Pedido enviado exitosamente')
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Error al enviar', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    if (matLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Group detalles by category
    const grouped = CATEGORIAS.reduce<Record<string, typeof detalles>>((acc, cat) => {
        acc[cat.key] = detalles.filter(d => d.material.categoria === cat.key)
        return acc
    }, {})



    return (
        <div className="flex flex-col min-h-screen">
            <Topbar
                title="Nuevo Pedido"
                subtitle="Captura los materiales requeridos para tu sucursal"
                actions={
                    <div className="flex items-center flex-wrap justify-end sm:justify-start gap-2">
                        {pedido?.estado === 'borrador' && (
                            <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full w-full sm:w-auto text-center sm:text-left">
                                ● Borrador
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || isReadonly}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#E2E5EB] dark:border-slate-700 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-slate-800 disabled:opacity-50 transition-colors text-slate-700 dark:text-slate-300"
                        >
                            <Save size={13} />
                            {saving ? 'Guardando…' : isAdmin ? 'Guardar cambios' : 'Guardar borrador'}
                        </button>
                        {!isAdmin && (
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={!fechaEntrega || !tipoEntrega || isReadonly || overLimit}
                                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#1E3A6E] text-white rounded-lg hover:bg-[#2B5EA7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={13} />
                                Enviar pedido
                            </button>
                        )}
                    </div>
                }
            />

            {/* Sticky total bar */}
            <FloatingTotal totalKilos={totalKilos} subtotales={subtotalesPorCategoria} />

            {/* Main content */}
            <div className="flex-1 p-6">
                <DateCodeSelector
                    fechaEntrega={fechaEntrega}
                    onFechaChange={setFechaEntrega}
                    tipoEntrega={tipoEntrega}
                    onTipoEntregaChange={setTipoEntrega}
                    codigoPedido={codigoPedidoStr}
                    readonly={isReadonly}
                    sucursalNombre={pedido?.sucursal?.nombre}
                />

                {/* Warning overlay for submitted orders */}
                {isReadonly && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2 shadow-sm transition-colors">
                        <AlertTriangle size={16} className="shrink-0" />
                        Este pedido ya fue enviado. No puedes modificarlo.
                    </div>
                )}

                {/* Overlimit Warning */}
                {overLimit && !isReadonly && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2 shadow-sm transition-colors">
                        <AlertTriangle size={16} className="shrink-0" />
                        <strong>Capacidad excedida:</strong> El pedido iguala o supera el límite de 11,500 kg. Reduce las cantidades para poder enviarlo.
                    </div>
                )}

                {/* Category tables */}
                {CATEGORIAS.filter(c => c.key !== 'envase_vacio').map(cat => (
                    <CategoryTable
                        key={cat.key}
                        title={cat.label}
                        count={grouped[cat.key]?.length ?? 0}
                        detalles={grouped[cat.key] ?? []}
                        subtotal={subtotalesPorCategoria[cat.key] ?? 0}
                        color={CATEGORIA_MAP[cat.key].color}
                        onUpdate={updateDetalle}
                        readonly={isReadonly}
                    />
                ))}

                <EnvasesTable
                    detalles={grouped['envase_vacio'] ?? []}
                    subtotal={subtotalesPorCategoria['envase_vacio'] ?? 0}
                    onUpdate={updateDetalle}
                    readonly={isReadonly}
                />
            </div>

            {/* Confirmation modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 transition-colors">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 transition-colors">
                        <h3 className="text-lg font-bold text-[#1E3A6E] dark:text-blue-400 mb-1">¿Enviar pedido?</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                            Una vez enviado <strong>no podrás hacer modificaciones</strong>. El pedido quedará en espera de aprobación del CEDIS.
                        </p>
                        <div className="bg-[#F4F6FA] dark:bg-slate-800 rounded-xl p-3 mb-5 transition-colors">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500 dark:text-slate-400">Sucursal:</span>
                                <span className="font-semibold text-[#1E3A6E] dark:text-slate-200">{user?.sucursal?.nombre}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500 dark:text-slate-400">Código:</span>
                                <span className="font-mono font-bold text-[#2B5EA7] dark:text-blue-400">{codigoPedidoStr}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500 dark:text-slate-400">Fecha entrega:</span>
                                <span className="font-medium dark:text-slate-300">{fechaEntrega}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500 dark:text-slate-400">Tipo de entrega:</span>
                                <span className="font-semibold text-[#1E3A6E] dark:text-slate-200">{tipoEntrega}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-slate-400">Total:</span>
                                <span className="font-bold font-mono text-[#1E3A6E] dark:text-slate-100">
                                    {totalKilos.toLocaleString('es-MX', { minimumFractionDigits: 2 })} kg
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2.5 border border-[#E2E5EB] dark:border-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-[#F4F6FA] dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 py-2.5 bg-[#1E3A6E] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA7] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                Sí, enviar pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#1B8553] text-white'
                    }`}>
                    {toast.type === 'error' ? <AlertTriangle size={15} /> : '✓'}
                    {toast.msg}
                </div>
            )}
        </div>
    )
}
