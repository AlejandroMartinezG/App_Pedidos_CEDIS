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

    const renderAdditionalTable = (categoryKey: string) => {
        if (categoryKey === 'materiasPrimas') {
            return (
                <div className="mt-10 mx-auto w-fit border-2 border-[#1E3A6E] bg-white">
                    <div className="bg-[#1E3A6E] text-white text-center font-bold text-[10px] py-1 uppercase tracking-widest">
                        MATERIA
                    </div>
                    <table className="text-center text-[10px] border-collapse bg-white">
                        <tbody>
                            <tr className="bg-[#D4A01E] text-[#1E3A6E] font-bold">
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-20">CERRADOS</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-20">ABIERTOS</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-24">METÁLICOS</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-20">OLLA 140</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-20">CUÑETES</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-16">P60</td>
                            </tr>
                            <tr>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P50</td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P30</td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P20 TRANS</td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P10</td>
                                <td className="border-none"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border-none"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="border-none"></td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P5</td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P4</td>
                                <td className="border-none"></td>
                                <td className="border-none"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="border-none"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border-none"></td>
                                <td className="border-none"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )
        }

        if (categoryKey === 'esencias' || categoryKey === 'colores') {
            return (
                <div className="mt-10 mx-auto w-fit border-2 border-[#1E3A6E] bg-white">
                    <div className="bg-[#1E3A6E] text-white text-center font-bold text-[10px] py-1 uppercase tracking-widest">
                        ESENCIAS Y COLORES
                    </div>
                    <table className="text-center text-[10px] border-collapse bg-white">
                        <tbody>
                            <tr className="bg-[#D4A01E] text-[#1E3A6E] font-bold">
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-20">P60</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-20">P50</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-24">P20 TRANS</td>
                                <td className="border border-[#1E3A6E] px-2 py-1.5 w-24">P20 AZUL</td>
                            </tr>
                            <tr>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P10</td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P5</td>
                                <td className="border-none"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border-none"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="bg-[#D4A01E] text-[#1E3A6E] font-bold border border-[#1E3A6E] py-1">P4</td>
                                <td className="border-none"></td>
                                <td className="border-none"></td>
                            </tr>
                            <tr>
                                <td className="border-none"></td>
                                <td className="border border-[#1E3A6E] h-10"></td>
                                <td className="border-none"></td>
                                <td className="border-none"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )
        }

        if (categoryKey === 'varios' || categoryKey === 'envases') {
            return (
                <div className="mt-10 flex justify-center">
                    <div className="border-2 border-[#1E3A6E] w-48 text-center flex flex-col bg-white">
                        <div className="bg-[#D4A01E] text-[#1E3A6E] font-bold text-[10px] py-1.5 border-b-2 border-[#1E3A6E] uppercase">
                            CUÑETES
                        </div>
                        <div className="h-10"></div>
                    </div>
                </div>
            )
        }

        return null
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors">
            {/* Toolbar (hidden on print) */}
            <div className="print:hidden flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-[#E2E5EB] dark:border-slate-800 sticky top-0 z-10 transition-colors">
                <h1 className="text-sm font-bold text-[#1E3A6E] dark:text-blue-400">Formato Imprimible — {pedido?.codigo_pedido}</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-4 py-1.5 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-xs font-medium hover:bg-[#F4F6FA] dark:hover:bg-slate-800 dark:text-slate-200 transition-colors"
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
            <div className="p-4 print:p-0 flex flex-col items-center gap-4 bg-gray-100 dark:bg-slate-950 print:bg-white transition-colors">
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
                            <div className="px-6 py-4 border-b-[3px] border-[#1E3A6E] flex items-center justify-between bg-white">
                                {/* Left: Logo */}
                                <div className="w-1/3">
                                    <img src="/LogoCH.png" alt="Logo CH" className="h-[45px] object-contain" />
                                </div>

                                {/* Center: Titles */}
                                <div className="w-1/3 text-center">
                                    <p className="text-[14px] font-black text-[#1E3A6E] uppercase tracking-wide">
                                        Formato de Surtido
                                    </p>
                                    <p className="text-[12px] font-semibold text-gray-600 mt-1">
                                        Sucursal: <span className="text-[#D4A01E]">{pedido?.sucursal?.nombre}</span>
                                    </p>
                                    <p className="text-[11px] text-[#2B5EA7] font-medium mt-0.5">
                                        Entrega:{' '}
                                        <span className="font-bold">
                                            {pedido?.fecha_entrega
                                                ? format(parseISO(pedido.fecha_entrega), "d 'de' MMMM 'de' yyyy", { locale: es })
                                                : '—'}
                                        </span>
                                    </p>
                                    {pedido?.tipo_entrega && (
                                        <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                                            Tipo:{' '}
                                            <span className="font-bold text-[#1E3A6E]">{pedido.tipo_entrega}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Right: Toneladas & Folio */}
                                <div className="w-1/3 text-right">
                                    <div className="inline-block bg-[#1E3A6E] text-white px-3 py-1 rounded-md mb-1 border border-[#1E3A6E] shadow-sm">
                                        <span className="text-[10px] font-medium opacity-80 mr-1">TONELADAS</span>
                                        <span className="text-[14px] font-black">{toneladas}</span>
                                    </div>
                                    <p className="text-[12px] text-gray-500 font-bold mt-1">
                                        FOLIO:{' '}
                                        <span className="text-[14px] text-[#D4A01E] font-black tracking-wider border-b border-[#D4A01E]">
                                            {pedido?.codigo_pedido}
                                        </span>
                                    </p>
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

                                    {/* Additional tracking tables at the bottom of the category */}
                                    {renderAdditionalTable(cat.key)}
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
