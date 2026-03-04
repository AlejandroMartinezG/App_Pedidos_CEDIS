import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Pedido, PedidoDetalle, Material, Sucursal } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface DetRow extends PedidoDetalle { material: Material }

export function FormatoImprimible() {
    const { id } = useParams<{ id: string }>()
    const printRef = useRef<HTMLDivElement>(null)
    const [pedido, setPedido] = useState<Pedido & { sucursal: Sucursal } | null>(null)
    const [detalles, setDetalles] = useState<DetRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        Promise.all([
            supabase.from('pedidos').select('*, sucursal:sucursales(*)').eq('id', id).single(),
            supabase.from('pedido_detalle').select('*, material:materiales(*)').eq('pedido_id', id),
        ]).then(([{ data: ped }, { data: dets }]) => {
            if (ped) setPedido(ped as Pedido & { sucursal: Sucursal })
            if (dets) setDetalles((dets as DetRow[]).filter(d =>
                (d.cantidad_kilos ?? 0) > 0 || (d.cantidad_solicitada ?? 0) > 0
            ))
            setLoading(false)
        })
    }, [id])

    const handlePrint = () => window.print()

    const handlePDF = async () => {
        const { default: html2pdf } = await import('html2pdf.js')
        html2pdf()
            .set({
                margin: 8,
                filename: `${pedido?.codigo_pedido ?? 'pedido'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            })
            .from(printRef.current)
            .save()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Split detalles by category for 3-column layout
    const materiasPrimas = detalles.filter(d => d.material.categoria === 'materia_prima')
    const varios = detalles.filter(d => d.material.categoria === 'varios')
    const envases = detalles.filter(d => d.material.categoria === 'envase_vacio')
    const esencias = detalles.filter(d => d.material.categoria === 'esencia')
    const colores = detalles.filter(d => d.material.categoria === 'color')

    const toneladas = ((pedido?.total_kilos ?? 0) / 1000).toFixed(3)

    const categoriasParaImprimir = [
        { key: 'materiasPrimas', title: 'Materias Primas', rows: materiasPrimas, type: 'standard' as const },
        { key: 'varios', title: 'Varios', rows: varios, type: 'standard' as const },
        { key: 'esencias', title: 'Esencias', rows: esencias, type: 'standard' as const },
        ...(colores.length > 0 ? [{ key: 'colores', title: 'Colores', rows: colores, type: 'standard' as const }] : []),
        { key: 'envases', title: 'Envases Vacíos', rows: envases, type: 'envase' as const }
    ]

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Toolbar (hidden on print) */}
            <div className="print:hidden flex items-center justify-between px-6 py-3 bg-white border-b border-[#E2E5EB] sticky top-0 z-10">
                <h1 className="text-sm font-bold text-[#1E3A6E]">Formato Imprimible — {pedido?.codigo_pedido}</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-4 py-1.5 border border-[#E2E5EB] rounded-lg text-xs font-medium hover:bg-[#F4F6FA] transition-colors"
                    >
                        <Printer size={13} /> Imprimir
                    </button>
                    <button
                        onClick={handlePDF}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1E3A6E] text-white rounded-lg text-xs font-semibold hover:bg-[#2B5EA7] transition-colors"
                    >
                        ↓ Exportar PDF
                    </button>
                </div>
            </div>

            {/* Printable document */}
            <div className="p-4 print:p-0 flex flex-col items-center gap-4 bg-gray-100 print:bg-white">
                <div ref={printRef} className="print:w-full flex flex-col">
                    {categoriasParaImprimir.map((cat, index) => (
                        <div
                            key={cat.key}
                            className="bg-white print:w-full print:shadow-none shadow-sm mb-4 print:mb-0"
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '11px',
                                pageBreakAfter: index === categoriasParaImprimir.length - 1 ? 'auto' : 'always',
                                breakAfter: index === categoriasParaImprimir.length - 1 ? 'auto' : 'page',
                            }}
                        >
                            {/* Header (repite por hoja) */}
                            <div className="px-6 py-3 border-b-2 border-[#1E3A6E]">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-[#1E3A6E]">Formato Pedido Sucursal</p>
                                        <p className="text-[10px] text-gray-500">{pedido?.sucursal?.nombre}</p>
                                        <p className="text-[9px] text-[#2B5EA7] mt-0.5">
                                            Fecha de entrega:{' '}
                                            {pedido?.fecha_entrega
                                                ? format(parseISO(pedido.fecha_entrega), "d 'de' MMMM 'de' yyyy", { locale: es })
                                                : '—'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-[#1E3A6E]">TONELADAS {toneladas}</p>
                                        <p className="text-[9px] text-gray-500">FOLIO: {pedido?.codigo_pedido}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Body para la categoría */}
                            <div className="flex flex-col gap-6 pt-4 px-6 border-t border-[#E2E5EB]" style={{ minHeight: '250mm' }}>
                                <div className="mb-2">
                                    <p className="text-[12px] font-bold text-[#1E3A6E] uppercase tracking-wider mb-2">{cat.title}</p>
                                    {cat.rows.length === 0 ? (
                                        <p className="text-[11px] text-gray-400 italic">Sin {cat.key === 'envases' ? 'envases solicitados' : 'materiales en esta categoría'}</p>
                                    ) : (
                                        <PrintTable rows={cat.rows} type={cat.type} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:w-full { width: 100% !important; }
        }
      `}</style>
        </div>
    )
}

// Mini table component for the print layout
function PrintTable({ rows, type }: { rows: DetRow[]; type: 'standard' | 'envase' }) {
    if (type === 'standard') {
        return (
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #E2E5EB' }}>
                        <th className="text-left pb-1 font-semibold text-gray-500" style={{ width: '35%' }}>MATERIAL</th>
                        <th className="text-right pb-1 font-semibold text-gray-500" style={{ width: '10%' }}>CANT. KG</th>
                        <th className="text-right pb-1 font-semibold text-gray-500" style={{ width: '10%' }}>CANT. SOL.</th>
                        <th className="text-center pb-1 font-semibold text-gray-500" style={{ width: '25%' }}>LOTE</th>
                        <th className="text-center pb-1 font-semibold text-gray-500" style={{ width: '20%' }}>PESO FÍSICO</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F4F6FA', height: '28px' }}>
                            <td className="py-1 text-gray-800 font-medium">{r.material.nombre}</td>
                            <td className="py-1 text-right font-mono text-gray-700">{r.cantidad_kilos ?? '—'}</td>
                            <td className="py-1 text-right font-mono text-gray-700">{r.cantidad_solicitada ?? '—'}</td>
                            <td className="py-1 px-3">
                                <div className="border-b border-gray-300 w-full h-full pt-3"></div>
                            </td>
                            <td className="py-1 px-3">
                                <div className="border-b border-gray-300 w-full h-full pt-3"></div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    }

    return (
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid #E2E5EB' }}>
                    <th className="text-left pb-1 font-semibold text-gray-500" style={{ width: '35%' }}>MATERIAL</th>
                    <th className="text-right pb-1 font-semibold text-gray-500" style={{ width: '15%' }}>PESO UNI</th>
                    <th className="text-right pb-1 font-semibold text-gray-500" style={{ width: '15%' }}>CANT. SOL.</th>
                    <th className="text-center pb-1 font-semibold text-gray-500" style={{ width: '20%' }}>PRESENTACIÓN</th>
                    <th className="text-right pb-1 font-semibold text-gray-500" style={{ width: '15%' }}>PESO TOT.</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F4F6FA', height: '24px' }}>
                        <td className="py-1 text-gray-800 font-medium">{r.material.nombre}</td>
                        <td className="py-1 text-right font-mono text-gray-700">{r.material.peso_aproximado ?? '—'}</td>
                        <td className="py-1 text-right font-mono text-gray-700">{r.cantidad_solicitada ?? '—'}</td>
                        <td className="py-1 text-center text-gray-500">{r.material.envase ?? '—'}</td>
                        <td className="py-1 text-right font-mono font-semibold text-gray-800">{r.peso_total ?? 0}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
