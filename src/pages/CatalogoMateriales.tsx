import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Material, Categoria } from '@/lib/types'
import { Plus, Edit2, CheckCircle2, XCircle, Search } from 'lucide-react'
import { clsx } from 'clsx'

export function CatalogoMateriales() {
    const [materiales, setMateriales] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoriaFiltro, setCategoriaFiltro] = useState<Categoria | 'todos'>('todos')

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

    // Form state
    const [nombre, setNombre] = useState('')
    const [categoria, setCategoria] = useState<Categoria>('materia_prima')
    const [unidadBase, setUnidadBase] = useState('kgs')
    const [pesoAproximado, setPesoAproximado] = useState<string>('')
    const [envase, setEnvase] = useState('')
    const [codigo, setCodigo] = useState('')

    useEffect(() => {
        loadMateriales()
    }, [])

    const loadMateriales = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('materiales')
            .select('*')
            .order('categoria')
            .order('orden')
            .order('nombre')

        if (data) setMateriales(data)
        setLoading(false)
    }

    const filteredMateriales = materiales.filter(m => {
        const matchesSearch = m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.codigo && m.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCat = categoriaFiltro === 'todos' || m.categoria === categoriaFiltro
        return matchesSearch && matchesCat
    })

    const handleToggleActivo = async (id: string, currentActivo: boolean) => {
        const { error } = await supabase
            .from('materiales')
            .update({ activo: !currentActivo })
            .eq('id', id)

        if (!error) {
            setMateriales(prev => prev.map(m => m.id === id ? { ...m, activo: !currentActivo } : m))
        } else {
            alert('Error al actualizar el estado')
        }
    }

    const openCreateModal = () => {
        setEditingMaterial(null)
        setNombre('')
        setCodigo('')
        setCategoria('materia_prima')
        setUnidadBase('kgs')
        setPesoAproximado('')
        setEnvase('')
        setIsModalOpen(true)
    }

    const openEditModal = (material: Material) => {
        setEditingMaterial(material)
        setNombre(material.nombre)
        setCodigo(material.codigo || '')
        setCategoria(material.categoria)
        setUnidadBase(material.unidad_base)
        setPesoAproximado(material.peso_aproximado !== null ? String(material.peso_aproximado) : '')
        setEnvase(material.envase || '')
        setIsModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        const payload = {
            nombre,
            codigo: codigo || null,
            categoria,
            unidad_base: unidadBase,
            peso_aproximado: pesoAproximado ? parseFloat(pesoAproximado) : null,
            envase: envase || null,
            orden: editingMaterial ? editingMaterial.orden : materiales.filter(m => m.categoria === categoria).length + 1
        }

        if (editingMaterial) {
            const { error } = await supabase
                .from('materiales')
                .update(payload)
                .eq('id', editingMaterial.id)
            if (!error) {
                loadMateriales()
                setIsModalOpen(false)
            } else {
                alert('Error al guardar: ' + error.message)
            }
        } else {
            const { error } = await supabase
                .from('materiales')
                .insert([{ ...payload, activo: true }])
            if (!error) {
                loadMateriales()
                setIsModalOpen(false)
            } else {
                alert('Error al crear: ' + error.message)
            }
        }
    }

    const formatCategoria = (cat: Categoria) => {
        const map: Record<Categoria, string> = {
            materia_prima: 'Materia Prima',
            esencia: 'Esencia',
            varios: 'Varios',
            color: 'Color',
            envase_vacio: 'Envase Vacío'
        }
        return map[cat] || cat
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E3A6E] dark:text-blue-400">Catálogo de Materiales</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Gestiona los materiales que aparecen en los pedidos.
                        Aquellos marcados como inactivos ya no aparecerán disponibles para nuevas requisiciones.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 bg-[#2B5EA7] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#1E3A6E] transition-colors whitespace-nowrap"
                >
                    <Plus size={18} /> Nuevo Material
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-[#E2E5EB] dark:border-slate-800 p-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]"
                        />
                    </div>
                    <select
                        value={categoriaFiltro}
                        onChange={e => setCategoriaFiltro(e.target.value as Categoria | 'todos')}
                        className="py-2 pl-3 pr-8 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]"
                    >
                        <option value="todos">Todas las categorías</option>
                        <option value="materia_prima">Materias Primas</option>
                        <option value="esencia">Esencias</option>
                        <option value="color">Colores</option>
                        <option value="varios">Varios</option>
                        <option value="envase_vacio">Envases Vacíos</option>
                    </select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[#E2E5EB] dark:border-slate-800">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#F4F6FA] dark:bg-slate-800/50 text-[#1E3A6E] dark:text-blue-400 font-semibold border-b border-[#E2E5EB] dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">Categoría</th>
                                <th className="px-4 py-3">Unidad</th>
                                <th className="px-4 py-3">Peso Aprox.</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E5EB] dark:divide-slate-800">
                            {filteredMateriales.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron materiales.
                                    </td>
                                </tr>
                            ) : (
                                filteredMateriales.map((mat) => (
                                    <tr key={mat.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{mat.codigo || '—'}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{mat.nombre}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatCategoria(mat.categoria)}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{mat.unidad_base}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{mat.peso_aproximado ? `${mat.peso_aproximado} kg` : '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleActivo(mat.id, mat.activo)}
                                                className={clsx(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
                                                    mat.activo
                                                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                                                )}
                                                title={mat.activo ? "Click para desactivar" : "Click para activar"}
                                            >
                                                {mat.activo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                {mat.activo ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openEditModal(mat)}
                                                className="p-1.5 text-gray-400 hover:text-[#2B5EA7] dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                                title="Editar material"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-[#E2E5EB] dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-[#E2E5EB] dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900">
                            <h3 className="text-lg font-bold text-[#1E3A6E] dark:text-blue-400">
                                {editingMaterial ? 'Editar Material' : 'Nuevo Material'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    className="w-full px-3 py-2 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2B5EA7]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Código (Opcional)</label>
                                    <input
                                        type="text"
                                        value={codigo}
                                        onChange={e => setCodigo(e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2B5EA7]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Categoría</label>
                                    <select
                                        value={categoria}
                                        onChange={e => setCategoria(e.target.value as Categoria)}
                                        className="w-full px-3 py-2 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2B5EA7]"
                                    >
                                        <option value="materia_prima">Materia Prima</option>
                                        <option value="esencia">Esencia</option>
                                        <option value="color">Color</option>
                                        <option value="varios">Varios</option>
                                        <option value="envase_vacio">Envase Vacío</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Unidad</label>
                                    <input
                                        type="text"
                                        required
                                        value={unidadBase}
                                        onChange={e => setUnidadBase(e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2B5EA7]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pesox Aprox.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={pesoAproximado}
                                        onChange={e => setPesoAproximado(e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2B5EA7]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Envase</label>
                                    <input
                                        type="text"
                                        value={envase}
                                        onChange={e => setEnvase(e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E2E5EB] dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2B5EA7]"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-[#E2E5EB] dark:border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-semibold bg-[#2B5EA7] text-white rounded-lg hover:bg-[#1E3A6E] transition-colors shadow-sm"
                                >
                                    {editingMaterial ? 'Guardar Cambios' : 'Crear Material'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
