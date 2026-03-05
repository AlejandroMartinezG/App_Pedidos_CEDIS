import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Pedido, PedidoDetalle, DetalleLinea, Material } from '@/lib/types'
import { LIMITE_KG, AUTOSAVE_INTERVAL } from '@/lib/constants'
import { format } from 'date-fns'

export function usePedido() {
    const { user } = useAuth()
    const [pedido, setPedido] = useState<Pedido | null>(null)
    const [detalles, setDetalles] = useState<DetalleLinea[]>([])
    const [saving, setSaving] = useState(false)
    const [fechaEntrega, setFechaEntrega] = useState<string>('')
    const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // ── Computed values ──────────────────────────────────────────────────
    const totalKilos = detalles.reduce((sum, d) => sum + (d.cantidad_kilos ?? 0), 0)

    const subtotalesPorCategoria = detalles.reduce<Record<string, number>>(
        (acc, d) => {
            const key = d.material.categoria
            acc[key] = (acc[key] ?? 0) + (d.cantidad_kilos ?? 0)
            return acc
        },
        {}
    )

    const overLimit = totalKilos >= LIMITE_KG

    // ── Init ─────────────────────────────────────────────────────────────
    const initDetalles = (materiales: Material[]) => {
        setDetalles(
            materiales.map(m => ({
                material: m,
                cantidad_kilos: null,
                cantidad_solicitada: null,
                peso_total: null,
            }))
        )
    }

    const loadExistingPedido = async (pedidoId: string, allMaterials: Material[]) => {
        const { data: ped } = await supabase
            .from('pedidos')
            .select('*')
            .eq('id', pedidoId)
            .single()
        if (ped) {
            const pedidoData = ped as Pedido
            setPedido(pedidoData)
            setFechaEntrega(pedidoData.fecha_entrega)
        }

        const { data: dets } = await supabase
            .from('pedido_detalle')
            .select('*')
            .eq('pedido_id', pedidoId)

        // Build a map of saved quantities keyed by material_id
        const savedMap = new Map<string, PedidoDetalle>(
            ((dets as PedidoDetalle[]) ?? []).map(d => [d.material_id, d])
        )

        // Show ALL materials but prefill with saved quantities
        setDetalles(
            allMaterials.map(m => {
                const saved = savedMap.get(m.id)
                return {
                    material: m,
                    cantidad_kilos: saved?.cantidad_kilos ?? null,
                    cantidad_solicitada: saved?.cantidad_solicitada ?? null,
                    peso_total: saved?.peso_total ?? null,
                }
            })
        )
    }

    // ── Update a single detalle line ─────────────────────────────────────
    // User enters cantidad_solicitada; cantidad_kilos is auto-calculated.
    const updateDetalle = (materialId: string, value: number | null) => {
        setDetalles(prev =>
            prev.map(d => {
                if (d.material.id !== materialId) return d
                const pesoAprox = d.material.categoria === 'envase_vacio'
                    ? 0
                    : (d.material.peso_aproximado ?? 0)
                const cantidad_kilos = value != null ? value * pesoAprox : null
                return {
                    ...d,
                    cantidad_solicitada: value,
                    cantidad_kilos,
                    peso_total: cantidad_kilos, // keep peso_total in sync for envase_vacio
                }
            })
        )
    }

    // ── Save draft ───────────────────────────────────────────────────────
    const saveDraft = async (isAuto = false): Promise<string | undefined> => {
        const currentSucursalId = user?.sucursal_id || pedido?.sucursal_id
        if (!currentSucursalId || !fechaEntrega) return
        setSaving(true)
        let pedidoId: string | undefined = pedido?.id
        try {
            // Fetch abreviacion from DB if the sucursal object isn't already loaded
            let abreviacion = user?.sucursal?.abreviacion
            if (!abreviacion) {
                const { data: suc } = await supabase
                    .from('sucursales')
                    .select('abreviacion')
                    .eq('id', currentSucursalId)
                    .single()
                abreviacion = suc?.abreviacion ?? 'SUC'
            }
            // Si no hay pedido previo, generamos un código base y le agregamos un sufijo aleatorio de 3 dígitos
            // para evitar colisiones si hacen dos pedidos para la misma fecha
            const randomSuffix = Math.floor(Math.random() * 900 + 100).toString()
            const codigoPedido = pedido?.codigo_pedido || `${abreviacion}-${format(new Date(fechaEntrega + 'T12:00:00'), 'yyyyMMdd')}-${randomSuffix}`

            if (!pedidoId) {
                const { data, error } = await supabase
                    .from('pedidos')
                    .insert({
                        codigo_pedido: codigoPedido,
                        sucursal_id: currentSucursalId,
                        fecha_entrega: fechaEntrega,
                        total_kilos: totalKilos,
                        estado: 'borrador',
                        enviado_at: null,
                        enviado_por: null,
                    })
                    .select()
                    .single()
                if (error) {
                    console.error('Insert error:', error)
                    throw new Error(error.message)
                }
                if (data) {
                    setPedido(data as Pedido)
                    pedidoId = (data as Pedido).id
                }
            } else {
                const { error } = await supabase
                    .from('pedidos')
                    .update({ total_kilos: totalKilos, fecha_entrega: fechaEntrega })
                    .eq('id', pedidoId)
                if (error) {
                    console.error('Update error:', error)
                    throw new Error(error.message)
                }
            }

            // Upsert and Delete detalles
            if (pedidoId) {
                const upsertRows = detalles
                    .filter(d => (d.cantidad_solicitada ?? 0) > 0)
                    .map(d => ({
                        pedido_id: pedidoId as string,
                        material_id: d.material.id,
                        cantidad_kilos: d.cantidad_kilos,
                        cantidad_solicitada: d.cantidad_solicitada,
                        peso_total: d.peso_total,
                    }))

                const deleteMaterialIds = detalles
                    .filter(d => (d.cantidad_solicitada ?? 0) <= 0)
                    .map(d => d.material.id)

                if (upsertRows.length > 0) {
                    await supabase
                        .from('pedido_detalle')
                        .upsert(upsertRows, { onConflict: 'pedido_id,material_id' })
                }

                if (deleteMaterialIds.length > 0) {
                    await supabase
                        .from('pedido_detalle')
                        .delete()
                        .eq('pedido_id', pedidoId)
                        .in('material_id', deleteMaterialIds)
                }
            }
        } finally {
            setSaving(false)
        }
        if (!isAuto) console.info('Pedido guardado')
        return pedidoId
    }

    // ── Submit pedido ────────────────────────────────────────────────────
    const submitPedido = async () => {
        const pedidoId = await saveDraft()
        if (!pedidoId) throw new Error('No se pudo crear o guardar el pedido')
        const { error } = await supabase
            .from('pedidos')
            .update({ estado: 'enviado' as const, enviado_at: new Date().toISOString(), enviado_por: user?.id ?? null })
            .eq('id', pedidoId)
        if (error) throw new Error(error.message)
        setPedido(prev => prev ? { ...prev, estado: 'enviado' } : prev)
    }

    // ── Auto-save ────────────────────────────────────────────────────────
    useEffect(() => {
        if (pedido?.estado === 'borrador' && fechaEntrega) {
            autoSaveRef.current = setInterval(() => saveDraft(true), AUTOSAVE_INTERVAL)
        }
        return () => {
            if (autoSaveRef.current) clearInterval(autoSaveRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pedido?.estado, fechaEntrega, detalles])

    return {
        pedido,
        detalles,
        totalKilos,
        subtotalesPorCategoria,
        overLimit,
        saving,
        fechaEntrega,
        setFechaEntrega,
        initDetalles,
        loadExistingPedido,
        updateDetalle,
        saveDraft,
        submitPedido,
    }
}
