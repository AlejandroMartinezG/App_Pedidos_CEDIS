import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
    Check, X, Clock, Users, AlertCircle, ChevronDown, ChevronUp,
    Search, Shield, Trash2, Edit2, Save,
    UserCheck, UserX, RefreshCw, MapPin
} from 'lucide-react'
import type { SolicitudAcceso, UserProfile } from '@/lib/types'

type SolicitudConSucursal = SolicitudAcceso & { sucursal?: { nombre: string } }
type UserWithSucursal = UserProfile & { sucursal?: { nombre: string; ciudad: string } }

interface EditState {
    nombre: string
    rol: 'admin' | 'sucursal'
    estado_cuenta: 'activo' | 'pendiente' | 'inactivo'
    sucursal_id: string
}

export function SolicitudesPanel() {
    const { isSuperAdmin } = useAuth()
    const [solicitudes, setSolicitudes] = useState<SolicitudConSucursal[]>([])
    const [usuarios, setUsuarios] = useState<UserWithSucursal[]>([])
    const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'solicitudes' | 'usuarios'>('solicitudes')
    const [procesando, setProcesando] = useState<string | null>(null)

    // User management state
    const [search, setSearch] = useState('')
    const [filterRol, setFilterRol] = useState<string>('todos')
    const [filterEstado, setFilterEstado] = useState<string>('todos')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editState, setEditState] = useState<EditState | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [solRes, usrRes, sucRes] = await Promise.all([
            supabase
                .from('solicitudes_acceso')
                .select('*, sucursal:sucursales(nombre)')
                .order('created_at', { ascending: false }),
            supabase
                .from('users')
                .select('*, sucursal:sucursales(nombre, ciudad)')
                .order('nombre'),
            supabase
                .from('sucursales')
                .select('id, nombre')
                .eq('activa', true)
                .order('nombre'),
        ])
        if (solRes.data) setSolicitudes(solRes.data as SolicitudConSucursal[])
        if (usrRes.data) setUsuarios(usrRes.data as UserWithSucursal[])
        if (sucRes.data) setSucursales(sucRes.data)
        setLoading(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    /* ── Solicitudes Actions ─────────────────────────────────────── */
    const aprobar = async (s: SolicitudConSucursal) => {
        if (!s.user_id) return
        setProcesando(s.id)
        try {
            await supabase.from('users').update({ estado_cuenta: 'activo' }).eq('id', s.user_id)
            await supabase.from('solicitudes_acceso')
                .update({ estado: 'aprobado', revisado_at: new Date().toISOString() })
                .eq('id', s.id)
            await fetchData()
        } finally { setProcesando(null) }
    }

    const rechazar = async (s: SolicitudConSucursal) => {
        if (!s.user_id) return
        setProcesando(s.id)
        try {
            await supabase.from('users').update({ estado_cuenta: 'inactivo' }).eq('id', s.user_id)
            await supabase.from('solicitudes_acceso')
                .update({ estado: 'rechazado', revisado_at: new Date().toISOString() })
                .eq('id', s.id)
            await fetchData()
        } finally { setProcesando(null) }
    }

    /* ── User Editing ────────────────────────────────────────────── */
    const startEdit = (u: UserWithSucursal) => {
        setEditingId(u.id)
        setEditState({
            nombre: u.nombre,
            rol: u.rol as 'admin' | 'sucursal',
            estado_cuenta: u.estado_cuenta as 'activo' | 'pendiente' | 'inactivo',
            sucursal_id: u.sucursal_id ?? '',
        })
        setDeleteConfirm(null)
    }

    const cancelEdit = () => { setEditingId(null); setEditState(null) }

    const saveEdit = async (userId: string) => {
        if (!editState) return
        setSaving(true)
        try {
            await supabase.from('users').update({
                nombre: editState.nombre,
                rol: editState.rol,
                estado_cuenta: editState.estado_cuenta,
                sucursal_id: editState.sucursal_id || null,
            }).eq('id', userId)
            setEditingId(null)
            setEditState(null)
            await fetchData()
        } finally { setSaving(false) }
    }

    const toggleStatus = async (u: UserWithSucursal) => {
        const next = u.estado_cuenta === 'activo' ? 'inactivo' : 'activo'
        setProcesando(u.id)
        try {
            await supabase.from('users').update({ estado_cuenta: next }).eq('id', u.id)
            await fetchData()
        } finally { setProcesando(null) }
    }

    const deleteUser = async (userId: string) => {
        setProcesando(userId)
        try {
            await supabase.from('users').delete().eq('id', userId)
            setDeleteConfirm(null)
            await fetchData()
        } finally { setProcesando(null) }
    }

    /* ── Filters ─────────────────────────────────────────────────── */
    const usuariosFiltrados = usuarios.filter(u => {
        const matchSearch = search === '' ||
            u.nombre.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        const matchRol = filterRol === 'todos' || u.rol === filterRol
        const matchEstado = filterEstado === 'todos' || u.estado_cuenta === filterEstado
        return matchSearch && matchRol && matchEstado
    })

    const pendientes = solicitudes.filter(s => s.estado === 'pendiente')
    const revisadas = solicitudes.filter(s => s.estado !== 'pendiente')

    const estadoBadge = (e: string) => {
        if (e === 'pendiente') return 'bg-amber-100 text-amber-700 border border-amber-200'
        if (e === 'aprobado') return 'bg-green-100 text-green-700 border border-green-200'
        return 'bg-red-100 text-red-700 border border-red-200'
    }
    const cuentaBadge = (e: string) => {
        if (e === 'activo') return 'bg-green-100 text-green-700'
        if (e === 'pendiente') return 'bg-amber-100 text-amber-700'
        return 'bg-red-100 text-red-700'
    }

    if (loading) return (
        <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-gray-200 -mx-4 px-4 md:mx-0 md:px-0">
                <button
                    onClick={() => setActiveTab('solicitudes')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'solicitudes'
                        ? 'text-[#1E3A6E] border-b-2 border-[#1E3A6E] font-bold'
                        : 'text-gray-500 hover:text-gray-700 font-medium'
                        }`}
                >
                    <Clock size={15} />
                    Solicitudes
                    {pendientes.length > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {pendientes.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'usuarios'
                        ? 'text-[#1E3A6E] border-b-2 border-[#1E3A6E] font-bold'
                        : 'text-gray-500 hover:text-gray-700 font-medium'
                        }`}
                >
                    <Users size={15} />
                    Gestión Usuarios
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {usuarios.length}
                    </span>
                </button>
            </div>

            {/* ── SOLICITUDES TAB ──────────────────────────────────────── */}
            {activeTab === 'solicitudes' && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <AlertCircle size={15} className="text-amber-500" />
                            Pendientes de revisión ({pendientes.length})
                        </h3>
                        {pendientes.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-xl">
                                No hay solicitudes pendientes
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                                {pendientes.map(s => (
                                    <div key={s.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-gray-800 text-sm md:text-base">{s.nombre}</p>
                                                {s.sucursal && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap">
                                                        {s.sucursal.nombre}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium">{s.email}</p>
                                            {s.mensaje && (
                                                <div className="mt-2 p-2 bg-white/50 border border-amber-100 rounded text-[11px] text-gray-600 italic">
                                                    "{s.mensaje}"
                                                </div>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                Solicitado: {new Date(s.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-0 border-amber-100">
                                            <button onClick={() => aprobar(s)} disabled={procesando === s.id}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-60 shadow-sm">
                                                <Check size={14} /> Aprobar
                                            </button>
                                            <button onClick={() => rechazar(s)} disabled={procesando === s.id}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-60 shadow-sm">
                                                <X size={14} /> Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {revisadas.length > 0 && (
                        <details className="group">
                            <summary className="text-sm font-semibold text-gray-500 cursor-pointer flex items-center gap-2 list-none">
                                <ChevronDown size={14} className="group-open:hidden" />
                                <ChevronUp size={14} className="hidden group-open:block" />
                                Historial revisadas ({revisadas.length})
                            </summary>
                            <div className="mt-3 space-y-2">
                                {revisadas.map(s => (
                                    <div key={s.id} className="border border-gray-200 bg-white rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700 text-sm">{s.nombre}</p>
                                            <p className="text-xs text-gray-400">{s.email}</p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${estadoBadge(s.estado)}`}>
                                            {s.estado}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            )}

            {/* ── USUARIOS TAB ─────────────────────────────────────────── */}
            {activeTab === 'usuarios' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 bg-white p-1 rounded-xl">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar nombre o correo..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 focus:border-[#2B5EA7] font-medium"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            {/* Rol filter */}
                            <select value={filterRol} onChange={e => setFilterRol(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 bg-white font-bold text-gray-700 flex-shrink-0">
                                <option value="todos">Todos los roles</option>
                                <option value="admin">Admin</option>
                                <option value="sucursal">Sucursal</option>
                            </select>
                            {/* Estado filter */}
                            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 bg-white font-bold text-gray-700 flex-shrink-0">
                                <option value="todos">Todos los estados</option>
                                <option value="activo">Activo</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                            {/* Refresh */}
                            <button onClick={fetchData} className="p-2 text-gray-500 hover:text-[#1E3A6E] hover:bg-gray-100 rounded-lg transition-all active:scale-95 flex-shrink-0" title="Actualizar">
                                <RefreshCw size={15} />
                            </button>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 sm:ml-auto tracking-widest text-center sm:text-right">
                            {usuariosFiltrados.length} / {usuarios.length} usuarios
                        </span>
                    </div>

                    {/* Users List / Table */}
                    <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Usuario</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Sucursal</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Rol</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {usuariosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20 text-gray-400 font-medium">
                                            No se encontraron usuarios matching los filtros
                                        </td>
                                    </tr>
                                ) : usuariosFiltrados.map(u => (
                                    <>
                                        {/* Normal row */}
                                        <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${editingId === u.id ? 'hidden' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#1E3A6E] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {u.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-gray-800">{u.nombre}</span>
                                                            {u.es_superadmin && (
                                                                <span className="text-[9px] bg-[#1E3A6E] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Superadmin</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-gray-400 font-medium">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 font-bold">
                                                {u.sucursal ? (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={11} className="text-[#2B5EA7]" />
                                                        {u.sucursal.nombre}
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${u.rol === 'admin' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                    {u.rol === 'admin' ? 'Admin' : 'Sucursal'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${cuentaBadge(u.estado_cuenta)} border opacity-90`}>
                                                    {u.estado_cuenta}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {!u.es_superadmin && (
                                                        <>
                                                            <button
                                                                onClick={() => toggleStatus(u)}
                                                                disabled={procesando === u.id}
                                                                className={`p-2 rounded-lg transition-all active:scale-90 ${u.estado_cuenta === 'activo' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                                {procesando === u.id ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin block" /> : u.estado_cuenta === 'activo' ? <UserX size={16} /> : <UserCheck size={16} />}
                                                            </button>
                                                            <button onClick={() => startEdit(u)} className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-all active:scale-90"><Edit2 size={16} /></button>
                                                            {isSuperAdmin && (
                                                                <button onClick={() => setDeleteConfirm(u.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-all active:scale-90"><Trash2 size={16} /></button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {editingId === u.id && editState && (
                                            <tr key={`edit-${u.id}`} className="bg-blue-50/50">
                                                <td colSpan={5} className="px-4 py-4">
                                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                                        <div className="col-span-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Nombre</label>
                                                            <input type="text" value={editState.nombre} onChange={e => setEditState({ ...editState, nombre: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Rol</label>
                                                            <select value={editState.rol} onChange={e => setEditState({ ...editState, rol: e.target.value as any })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
                                                                <option value="sucursal">Sucursal</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Estado</label>
                                                            <select value={editState.estado_cuenta} onChange={e => setEditState({ ...editState, estado_cuenta: e.target.value as any })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-bold">
                                                                <option value="activo">Activo</option>
                                                                <option value="pendiente">Pendiente</option>
                                                                <option value="inactivo">Inactivo</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Sucursal</label>
                                                            <select value={editState.sucursal_id} onChange={e => setEditState({ ...editState, sucursal_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
                                                                <option value="">— Ninguna —</option>
                                                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={cancelEdit} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                                        <button onClick={() => saveEdit(u.id)} disabled={saving} className="px-5 py-2 bg-[#1E3A6E] text-white text-xs font-bold rounded-lg hover:bg-[#2B5EA7] flex items-center gap-2">
                                                            {saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                                                            Guardar Cambios
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {deleteConfirm === u.id && (
                                            <tr key={`del-${u.id}`} className="bg-red-50">
                                                <td colSpan={5} className="px-4 py-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-bold text-red-800">¿Confirmas la eliminación permanente de {u.nombre}?</p>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs font-bold text-gray-500">No, cancelar</button>
                                                            <button onClick={() => deleteUser(u.id)} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Sí, eliminar</button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Users List (Cards) */}
                    <div className="md:hidden space-y-3">
                        {usuariosFiltrados.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 font-medium bg-gray-50 rounded-xl">Sin resultados</div>
                        ) : usuariosFiltrados.map(u => (
                            <div key={u.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${editingId === u.id ? 'border-[#2B5EA7] ring-1 ring-[#2B5EA7]/20 bg-blue-50/20' : 'border-gray-200'}`}>
                                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-[#1E3A6E] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                        {u.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-800 text-sm truncate">{u.nombre}</p>
                                            <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${u.rol === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {u.rol}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate font-medium">{u.email}</p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${u.estado_cuenta === 'activo' ? 'bg-green-500' : 'bg-red-400'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sucursal</p>
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#1E3A6E]">
                                            <MapPin size={12} className="text-[#2B5EA7]" />
                                            {u.sucursal?.nombre || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estatus</p>
                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${cuentaBadge(u.estado_cuenta)} border opacity-80 inline-block`}>
                                            {u.estado_cuenta}
                                        </span>
                                    </div>
                                </div>

                                {editingId === u.id && editState ? (
                                    <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-gray-400 block mb-1 ml-1">Rol</label>
                                                <select value={editState.rol} onChange={e => setEditState({ ...editState, rol: e.target.value as any })} className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white">
                                                    <option value="sucursal">Sucursal</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-gray-400 block mb-1 ml-1">Estatus</label>
                                                <select value={editState.estado_cuenta} onChange={e => setEditState({ ...editState, estado_cuenta: e.target.value as any })} className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white font-bold">
                                                    <option value="activo">Activo</option>
                                                    <option value="pendiente">Pendiente</option>
                                                    <option value="inactivo">Inactivo</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={cancelEdit} className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-50 rounded-lg border border-gray-200">Cancelar</button>
                                            <button onClick={() => saveEdit(u.id)} disabled={saving} className="flex-1 py-2 bg-[#1E3A6E] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm">
                                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                        {!u.es_superadmin ? (
                                            <>
                                                <div className="flex gap-2">
                                                    <button onClick={() => toggleStatus(u)} disabled={procesando === u.id} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold transition-all active:scale-95 ${u.estado_cuenta === 'activo' ? 'border-red-100 text-red-500 bg-red-50/30' : 'border-green-100 text-green-600 bg-green-50/30'}`}>
                                                        {u.estado_cuenta === 'activo' ? <UserX size={14} /> : <UserCheck size={14} />}
                                                        {u.estado_cuenta === 'activo' ? 'Suspender' : 'Activar'}
                                                    </button>
                                                    <button onClick={() => startEdit(u)} className="p-2 rounded-lg border border-blue-100 text-[#2B5EA7] bg-blue-50/30 flex items-center gap-2 text-xs font-bold transition-all active:scale-95">
                                                        <Edit2 size={14} /> Editar
                                                    </button>
                                                </div>
                                                {isSuperAdmin && (
                                                    <button onClick={() => setDeleteConfirm(u.id === deleteConfirm ? null : u.id)} className={`p-2 rounded-lg transition-all ${deleteConfirm === u.id ? 'bg-red-600 text-white shadow-md' : 'text-red-400 hover:bg-red-50'}`}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest pl-1">Protegido por sistema</span>
                                        )}
                                    </div>
                                )}

                                {deleteConfirm === u.id && editingId !== u.id && (
                                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 animate-in fade-in zoom-in duration-200">
                                        <p className="text-[11px] font-bold text-red-800 mb-2">¿Estás seguro de eliminar este usuario para siempre?</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-1.5 text-[10px] font-bold text-gray-500 bg-white border border-gray-200 rounded-lg">No, cancelar</button>
                                            <button onClick={() => deleteUser(u.id)} className="flex-1 py-1.5 text-[10px] font-bold text-white bg-red-600 rounded-lg shadow-sm">Sí, borrar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                        <span className="flex items-center gap-1"><UserCheck size={12} className="text-green-600" /> Activar/Desactivar</span>
                        <span className="flex items-center gap-1"><Edit2 size={12} className="text-blue-500" /> Editar datos</span>
                        {isSuperAdmin && <span className="flex items-center gap-1"><Trash2 size={12} className="text-red-400" /> Eliminar (solo superadmin)</span>}
                        <span className="flex items-center gap-1"><Shield size={12} className="text-[#1E3A6E]" /> Usuarios SUPER están protegidos</span>
                    </div>
                </div>
            )}
        </div>
    )
}
