import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Printer, ChevronLeft, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Viaje {
    trayecto: number
    dia: string
    fecha: string
    origen: string
    destino: string
    motivo: string
}

interface NominaReporte {
    id: string
    operador: string
    economico: string
    placas: string
    semana_inicio: string
    semana_fin: string
    pagar_en: string
    viajes: Viaje[]
    total_viajes: number
    created_at: string
}

export function FormatoNominaHino() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [reporte, setReporte] = useState<NominaReporte | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchReporte()
    }, [id])

    const fetchReporte = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('nominas_hino')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setReporte(data)
        } catch (err) {
            console.error('Error fetching report:', err)
            alert('Error al cargar el reporte para impresión.')
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        )
    }

    if (!reporte) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
                <h1 className="text-xl font-bold text-red-600 mb-4">No se encontró el reporte</h1>
                <button onClick={() => navigate('/nomina-hino')} className="text-blue-600 underline">Volver</button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
            {/* Control Bar (Hidden on print) */}
            <div className="max-w-[1000px] mx-auto mb-6 flex justify-between items-center print:hidden">
                <button
                    onClick={() => navigate('/nomina-hino')}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#1E3A6E] font-bold transition-colors"
                >
                    <ChevronLeft size={20} /> Volver
                </button>
                <button
                    onClick={handlePrint}
                    className="bg-[#1E3A6E] text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all"
                >
                    <Printer size={20} /> IMPRIMIR REPORTE
                </button>
            </div>

            {/* Document Container */}
            <div className="max-w-[1000px] mx-auto bg-white shadow-2xl p-10 print:shadow-none print:p-4 print:m-0 min-h-[1056px] print:min-h-0 flex flex-col font-sans overflow-hidden">

                {/* Header section matches image */}
                <div className="flex justify-between items-start mb-8">
                    <div className="w-1/3">
                        <img src="/LogoCH.png" alt="Cloro de Hidalgo" className="h-20 object-contain mb-2" />
                    </div>

                    <div className="w-1/3 text-center pt-4">
                        <h1 className="text-2xl font-black text-[#1E3A6E] leading-tight uppercase tracking-wide">
                            CONTROL DE NOMINA SEMANAL OPERADOR HINO
                        </h1>
                    </div>

                    <div className="w-1/3 text-right">
                        <img
                            src="/UnaMarcadeGrupoGinez.png"
                            alt="Una Marca de Grupo Ginez"
                            className="h-20 ml-auto"
                        />
                    </div>
                </div>

                {/* Info Fields Grid */}
                <div className="grid grid-cols-12 border-2 border-[#1E3A6E] mb-6">
                    <div className="col-span-2 bg-[#1E3A6E] text-white px-3 py-2 text-xs font-black uppercase border-b border-white">OPERADOR:</div>
                    <div className="col-span-10 px-4 py-2 text-sm font-bold border-b border-[#1E3A6E] text-center uppercase">{reporte.operador}</div>

                    <div className="col-span-2 bg-[#1E3A6E] text-white px-3 py-2 text-xs font-black uppercase border-b border-white">ECONOMICO:</div>
                    <div className="col-span-3 px-4 py-2 text-sm font-bold border-b border-[#1E3A6E] border-r border-[#1E3A6E] text-center">{reporte.economico}</div>
                    <div className="col-span-2 bg-[#1E3A6E] text-white px-3 py-2 text-xs font-black uppercase border-b border-white border-l border-[#1E3A6E]">PLACAS:</div>
                    <div className="col-span-5 px-4 py-2 text-sm font-bold border-b border-[#1E3A6E] text-center">{reporte.placas}</div>

                    <div className="col-span-2 bg-[#1E3A6E] text-white px-3 py-2 text-xs font-black uppercase">SEMANA:</div>
                    <div className="col-span-3 px-4 py-2 text-sm font-bold border-r border-[#1E3A6E] text-center uppercase">
                        {format(parseISO(reporte.semana_inicio), 'dd/MM/yyyy')} AL {format(parseISO(reporte.semana_fin), 'dd/MM/yyyy')}
                    </div>
                    <div className="col-span-2 bg-[#1E3A6E] text-white px-3 py-2 text-xs font-black uppercase border-l border-[#1E3A6E]">PAGAR EN:</div>
                    <div className="col-span-5 px-4 py-2 text-sm font-bold text-center uppercase">{reporte.pagar_en}</div>
                </div>

                {/* Main Trips Table */}
                <div className="flex-1">
                    <table className="w-full border-2 border-[#1E3A6E] text-center border-collapse">
                        <thead>
                            <tr className="bg-[#1E3A6E] text-white">
                                <th rowSpan={2} className="border-r border-white px-2 py-3 text-xs font-black uppercase w-[10%]">Trayecto</th>
                                <th rowSpan={2} className="border-r border-white px-2 py-3 text-xs font-black uppercase w-[25%]">Dia</th>
                                <th colSpan={2} className="border-b border-white px-2 py-2 text-xs font-black uppercase">Detalle del Viaje</th>
                                <th rowSpan={2} className="px-2 py-3 text-xs font-black uppercase w-[25%]">Motivo de viaje</th>
                            </tr>
                            <tr className="bg-[#1E3A6E] text-white border-t border-white">
                                <th className="border-r border-white px-2 py-2 text-[10px] font-black uppercase">Origen</th>
                                <th className="border-r border-white px-2 py-2 text-[10px] font-black uppercase">Destino</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reporte.viajes.map((viaje, index) => (
                                <tr key={index} className="border-b border-[#1E3A6E] h-8 print:h-7">
                                    <td className="border-r border-[#1E3A6E] text-sm font-bold">{viaje.trayecto}</td>
                                    <td className="border-r border-[#1E3A6E] text-xs font-bold text-center">
                                        <div className="flex justify-center gap-4">
                                            <span className="w-20 text-left">{viaje.dia}</span>
                                            <span className="text-gray-600">{viaje.fecha}</span>
                                        </div>
                                    </td>
                                    <td className="border-r border-[#1E3A6E] text-xs font-bold px-2 uppercase">{viaje.origen}</td>
                                    <td className="border-r border-[#1E3A6E] text-xs font-bold px-2 uppercase">{viaje.destino}</td>
                                    <td className="text-xs font-black uppercase">{viaje.motivo}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#1E3A6E] text-white">
                                <td className="px-2 py-3 text-sm font-black uppercase">TOTAL:</td>
                                <td className="px-2 py-3 text-lg font-black">{reporte.total_viajes}</td>
                                <td colSpan={3} className="bg-white border-l border-[#1E3A6E]"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer / Auth */}
                <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-20">
                    <div className="text-center">
                        <div className="border-b border-black mb-2 mx-auto w-48 h-12"></div>
                        <p className="text-[10px] font-black uppercase tracking-wider">Firma del Operador</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black mb-2 mx-auto w-48 h-12"></div>
                        <p className="text-[10px] font-black uppercase tracking-wider">Autorización CEDIS</p>
                    </div>
                </div>

                <div className="mt-auto pt-10 text-center opacity-30 text-[8px] uppercase font-bold tracking-[0.3em]">
                    SISTEMA DE GESTIÓN DE PEDIDOS — CLORO DE HIDALGO — CEDIS PACHUCA
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: letter; 
                        margin: 0.5cm; 
                    }
                    body { 
                        margin: 0; 
                        background: white; 
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-hidden { display: none; }
                    /* Ensure content fits by scaling if necessary */
                    body > div {
                        zoom: 0.95;
                    }
                }
            `}} />
        </div>
    )
}
