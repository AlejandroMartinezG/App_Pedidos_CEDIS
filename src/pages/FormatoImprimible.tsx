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
            if (dets) {
                const sortedDets = (dets as DetRow[])
                    .filter(d => (d.cantidad_kilos ?? 0) > 0 || (d.cantidad_solicitada ?? 0) > 0)
                    .sort((a, b) => a.material.nombre.localeCompare(b.material.nombre))
                setDetalles(sortedDets)
            }
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

    const materiasPrimas = detalles.filter(d => d.material.categoria === 'materia_prima')
    const varios = detalles.filter(d => d.material.categoria === 'varios')
    const envases = detalles.filter(d => d.material.categoria === 'envase_vacio')
    const esencias = detalles.filter(d => d.material.categoria === 'esencia')
    const colores = detalles.filter(d => d.material.categoria === 'color')
    const toneladas = ((pedido?.total_kilos ?? 0) / 1000).toFixed(3)

    const bloquesParaImprimir = [
        {
            blockKey: 'materiasPrimas',
            sections: [{ key: 'materiasPrimas', title: 'Materias Primas', rows: materiasPrimas, type: 'standard' as const }]
        },
        {
            blockKey: 'varios_envases',
            sections: [
                { key: 'varios', title: 'Varios', rows: varios, type: 'standard' as const },
                { key: 'envases', title: 'Envases Vacíos', rows: envases, type: 'envase' as const }
            ]
        },
        {
            blockKey: 'esencias_colores',
            sections: [
                { key: 'esencias', title: 'Esencias', rows: esencias, type: 'standard' as const },
                ...(colores.length > 0 ? [{ key: 'colores', title: 'Colores', rows: colores, type: 'standard' as const }] : [])
            ]
        }
    ]

    const renderAdditionalTable = (blockKey: string) => {
        const signatureBoxes = (
            <div className="flex justify-center gap-24 mt-4 mb-2">
                <div className="flex flex-col items-center">
                    <div className="w-48 border-b-2 border-gray-600 h-8"></div>
                    <span className="text-[10px] text-gray-700 font-bold mt-1.5 uppercase tracking-widest">ENTREGÓ</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-48 border-b-2 border-gray-600 h-8"></div>
                    <span className="text-[10px] text-gray-700 font-bold mt-1.5 uppercase tracking-widest">RECIBIÓ</span>
                </div>
            </div>
        )

        const evaluationTable = (
            <div className="mx-auto w-[85%] mt-6 mb-4">
                <table className="w-full text-center text-[9px] border-collapse bg-white">
                    <tbody>
                        <tr className="bg-gray-200 text-[#1E3A6E] font-bold">
                            <td colSpan={3} className="border border-gray-400 py-1">ENTREGA DE PEDIDO</td>
                            <td className="border border-gray-400 py-1 w-[35%]">OBSERVACIÓN</td>
                        </tr>
                        <tr className="bg-gray-200 text-[#1E3A6E] font-bold">
                            <td className="border border-gray-400 w-8"></td>
                            <td className="border border-gray-400 py-1">ACTIVIDAD</td>
                            <td className="border border-gray-400 w-12"></td>
                            <td className="border border-gray-400"></td>
                        </tr>
                        {[
                            'IDENTIFICADO',
                            'LIMPIO',
                            'ETIQUETADO',
                            'ROTULADO',
                            'PEDIDO COMPLETO SEGÚN REGISTRO',
                            'ENTREGA EN FORMA',
                            'REGISTRO CORRECTO EN HOJA',
                            'UBICADO EN AREA CORRESPONDIENTE'
                        ].map((actividad, idx) => (
                            <tr key={idx}>
                                <td className="border border-gray-400 py-1 font-bold text-gray-600">{idx + 1}</td>
                                <td className="border border-gray-400 py-1 text-left px-2 font-semibold text-gray-700">{actividad}</td>
                                <td className="border border-gray-400 py-1"></td>
                                <td className="border border-gray-400 py-1"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )

        if (blockKey === 'materiasPrimas') {
            return (
                <div className="mt-8 flex flex-col w-full">
                    <div className="mx-auto w-fit bg-white mb-2">
                        <div className="text-[#1E3A6E] text-center font-bold text-[11px] py-1 mb-1 uppercase tracking-widest border-b-2 border-[#1E3A6E]">MATERIA</div>
                        <table className="text-center text-[10px] border-collapse bg-white">
                            <tbody>
                                <tr className="bg-gray-200 text-gray-700 font-bold">
                                    <td className="border border-gray-300 px-2 py-1.5 w-20">CERRADOS</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-20">ABIERTOS</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-24">METÁLICOS</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-20">OLLA 140</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-20">CUÑETES</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-16">P60</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P50</td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P30</td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P20 TRANS</td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P10</td>
                                    <td className="border-none"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border-none"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td><td className="border-none"></td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P5</td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P4</td>
                                    <td className="border-none"></td><td className="border-none"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td><td className="border-none"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border-none"></td><td className="border-none"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {evaluationTable}
                    {signatureBoxes}
                </div>
            )
        }

        if (blockKey === 'esencias_colores') {
            return (
                <div className="mt-8 flex flex-col w-full">
                    <div className="mx-auto w-fit bg-white mb-2">
                        <div className="text-[#1E3A6E] text-center font-bold text-[11px] py-1 mb-1 uppercase tracking-widest border-b-2 border-[#1E3A6E]">ESENCIAS Y COLORES</div>
                        <table className="text-center text-[10px] border-collapse bg-white">
                            <tbody>
                                <tr className="bg-gray-200 text-gray-700 font-bold">
                                    <td className="border border-gray-300 px-2 py-1.5 w-20">P60</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-20">P50</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-24">P20 TRANS</td>
                                    <td className="border border-gray-300 px-2 py-1.5 w-24">P20 AZUL</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P10</td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P5</td>
                                    <td className="border-none"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td><td className="border border-gray-300 h-10"></td><td className="border border-gray-300 h-10"></td><td className="border-none"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td>
                                    <td className="border border-gray-300 bg-gray-200 text-gray-700 font-bold py-1">P4</td>
                                    <td className="border-none"></td><td className="border-none"></td>
                                </tr>
                                <tr>
                                    <td className="border-none"></td><td className="border border-gray-300 h-10"></td><td className="border-none"></td><td className="border-none"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {evaluationTable}
                    {signatureBoxes}
                </div>
            )
        }

        if (blockKey === 'varios_envases') {
            return (
                <div className="mt-8 flex flex-col w-full">
                    <div className="mx-auto w-48 text-center flex flex-col bg-white mb-2">
                        <div className="text-[#1E3A6E] font-bold text-[11px] py-1 mb-1 border-b-2 border-[#1E3A6E] uppercase tracking-widest">CUÑETES</div>
                        <div className="border border-gray-300 h-10"></div>
                    </div>
                    {evaluationTable}
                    {signatureBoxes}
                </div>
            )
        }
        return null
    }

    return (
        <>
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors">
                <div className="print:hidden flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-[#E2E5EB] dark:border-slate-800 sticky top-0 z-10 transition-colors">
                    <h1 className="text-sm font-bold text-[#1E3A6E] dark:text-blue-400">Formato Imprimible — {pedido?.codigo_pedido}</h1>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-1.5 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-xs font-medium hover:bg-[#F4F6FA] dark:hover:bg-slate-800 dark:text-slate-200 transition-colors"><Printer size={13} /> Imprimir</button>
                        <button onClick={handlePDF} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1E3A6E] text-white rounded-lg text-xs font-semibold hover:bg-[#2B5EA7] transition-colors">↓ Exportar PDF</button>
                    </div>
                </div>

                <div className="p-4 print:p-0 flex flex-col items-center gap-4 bg-gray-100 dark:bg-slate-950 print:bg-white transition-colors">
                    <div ref={printRef} id="print-area" className="print:w-full flex flex-col w-[8.5in] max-w-full print:block relative">
                        {bloquesParaImprimir.map((bloque, index) => (
                            <div
                                key={bloque.blockKey}
                                className={`bg-white shadow-sm mb-4 print:shadow-none print:mb-0 print-block relative ${index < bloquesParaImprimir.length - 1 ? 'print:break-after-page' : ''}`}
                                style={{ minHeight: '11in', fontFamily: 'Inter, sans-serif', fontSize: '11px' }}
                            >
                                <div className="px-6 py-4 border-b-[3px] border-[#1E3A6E] flex items-center justify-between bg-white">
                                    <div className="w-1/3"><img src="/LogoCH.png" alt="Logo CH" className="h-[45px] object-contain" /></div>
                                    <div className="w-1/3 text-center">
                                        <p className="text-[14px] font-black text-[#1E3A6E] uppercase tracking-wide">Formato de Surtido</p>
                                        <p className="text-[12px] font-semibold text-gray-600 mt-1">Sucursal: <span className="text-[#D4A01E]">{pedido?.sucursal?.nombre}</span></p>
                                        <p className="text-[11px] text-[#2B5EA7] font-medium mt-0.5">Entrega: <span className="font-bold">{pedido?.fecha_entrega ? format(parseISO(pedido.fecha_entrega), "d 'de' MMMM 'de' yyyy", { locale: es }) : '—'}</span></p>
                                    </div>
                                    <div className="w-1/3 text-right">
                                        <div className="inline-block bg-[#1E3A6E] text-white px-3 py-1 rounded-md mb-1 border border-[#1E3A6E] shadow-sm">
                                            <span className="text-[10px] font-medium opacity-80 mr-1">TONELADAS</span>
                                            <span className="text-[14px] font-black">{toneladas}</span>
                                        </div>
                                        <p className="text-[12px] text-gray-500 font-bold mt-1">FOLIO: <span className="text-[14px] text-[#D4A01E] font-black tracking-wider border-b border-[#D4A01E]">{pedido?.codigo_pedido}</span></p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-6 pt-4 px-6 border-t border-[#E2E5EB]" style={{ minHeight: '250mm' }}>
                                    {bloque.sections.map(sec => (
                                        <div key={sec.key} className="mb-2">
                                            <p className="text-[12px] font-bold text-[#1E3A6E] uppercase tracking-wider mb-2">{sec.title}</p>
                                            {sec.rows.length === 0 ? <p className="text-[11px] text-gray-400 italic">Sin materiales</p> : <PrintTable rows={sec.rows} type={sec.type} />}
                                        </div>
                                    ))}
                                    {renderAdditionalTable(bloque.blockKey)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
        @media print {
          @page { 
            size: letter portrait; 
            margin: 15mm 12mm 15mm 12mm; 
          }
          html, body {
            height: auto;
          }
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
          }
          .print-block { 
            min-height: auto !important; 
            page-break-after: always;
            break-after: page;
          }
          table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
        </>
    )
}

function PrintTable({ rows, type }: { rows: DetRow[]; type: 'standard' | 'envase' }) {
    if (type === 'standard') {
        return (
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10px', pageBreakInside: 'auto' }}>
                <thead style={{ display: 'table-header-group' }}>
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
                        <tr key={r.id} style={{ borderBottom: '1px solid #D1D5DB', height: '28px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <td className="py-1 text-gray-800 font-medium">{r.material.nombre}</td>
                            <td className="py-1 text-right font-mono text-gray-700">{r.cantidad_kilos != null ? Number(r.cantidad_kilos.toFixed(2)) : '—'}</td>
                            <td className="py-1 text-right font-mono text-gray-700">{r.cantidad_solicitada ?? '—'}</td>
                            <td className="py-1 px-3"><div className="border-b border-gray-400 w-full h-full pt-3"></div></td>
                            <td className="py-1 px-3"><div className="border-b border-gray-400 w-full h-full pt-3"></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    }
    const totalSolicitado = rows.reduce((sum, r) => sum + (r.cantidad_solicitada ?? 0), 0)

    return (
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10px', pageBreakInside: 'auto' }}>
            <thead style={{ display: 'table-header-group' }}>
                <tr style={{ borderBottom: '2px solid #E2E5EB' }}>
                    <th className="text-left pb-1 font-semibold text-gray-500" style={{ width: '35%' }}>MATERIAL</th>
                    <th className="text-right pb-1 font-semibold text-gray-500" style={{ width: '15%' }}>PESO UNI</th>
                    <th className="text-right pb-1 font-semibold text-gray-500" style={{ width: '20%' }}>CANT. SOL.</th>
                    <th className="text-center pb-1 font-semibold text-gray-500" style={{ width: '30%' }}>LOTE</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #D1D5DB', height: '28px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <td className="py-1 text-gray-800 font-medium">{r.material.nombre}</td>
                        <td className="py-1 text-right font-mono text-gray-700">{r.material.peso_aproximado ?? '—'}</td>
                        <td className="py-1 text-right font-mono text-gray-700">{r.cantidad_solicitada ?? '—'}</td>
                        <td className="py-1 px-3"><div className="border-b border-gray-400 w-full h-full pt-3"></div></td>
                    </tr>
                ))}
                {/* Total Row */}
                <tr style={{ borderTop: '2px solid #1E3A6E', height: '32px', backgroundColor: '#F9FAFB' }}>
                    <td colSpan={2} className="py-2 text-right font-bold text-[#1E3A6E] pr-4 uppercase tracking-wider">Total:</td>
                    <td className="py-2 text-right font-black text-[#D4A01E] text-[12px]">{totalSolicitado}</td>
                    <td className="py-2"></td>
                </tr>
            </tbody>
        </table>
    )
}
