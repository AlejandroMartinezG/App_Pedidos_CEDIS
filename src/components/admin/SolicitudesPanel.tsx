import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
    Check, X, Clock, Users, AlertCircle, ChevronDown, ChevronUp,
    Search, Shield, Trash2, Edit2, Save, XCircle,
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
            <div className="flex gap-1 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('solicitudes')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'solicitudes'
                        ? 'text-[#1E3A6E] border-b-2 border-[#1E3A6E]'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Clock size={15} />
                    Solicitudes de Acceso
                    {pendientes.length > 0 && (
                        <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {pendientes.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'usuarios'
                        ? 'text-[#1E3A6E] border-b-2 border-[#1E3A6E]'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Users size={15} />
                    Gestión de Usuarios
                    <span className="bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
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
                            <div className="space-y-3">
                                {pendientes.map(s => (
                                    <div key={s.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm">{s.nombre}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{s.email}</p>
                                            {s.sucursal && (
                                                <p className="text-xs text-[#2B5EA7] mt-1 flex items-center gap-1">
                                                    <MapPin size={11} /> {s.sucursal.nombre}
                                                </p>
                                            )}
                                            {s.mensaje && (
                                                <p className="text-xs text-gray-500 italic mt-1">"{s.mensaje}"</p>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {new Date(s.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button onClick={() => aprobar(s)} disabled={procesando === s.id}
                                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                                                <Check size={13} /> Aprobar
                                            </button>
                                            <button onClick={() => rechazar(s)} disabled={procesando === s.id}
                                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                                                <X size={13} /> Rechazar
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
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre o correo..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 focus:border-[#2B5EA7]"
                            />
                        </div>
                        {/* Rol filter */}
                        <select value={filterRol} onChange={e => setFilterRol(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 bg-white">
                            <option value="todos">Todos los roles</option>
                            <option value="admin">Admin</option>
                            <option value="sucursal">Sucursal</option>
                        </select>
                        {/* Estado filter */}
                        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 bg-white">
                            <option value="todos">Todos los estados</option>
                            <option value="activo">Activo</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                        {/* Refresh */}
                        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Actualizar">
                            <RefreshCw size={15} />
                        </button>
                        <span className="text-xs text-gray-400 ml-auto">
                            {usuariosFiltrados.length} de {usuarios.length} usuarios
                        </span>
                    </div>

                    {/* Table */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                            <tbody className="divide-y divide-gray-100">
                                {usuariosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-sm text-gray-400">
                                            No se encontraron usuarios
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
                                                            <span className="font-semibold text-gray-800">{u.nombre}</span>
                                                            {u.es_superadmin && (
                                                                <span className="text-[9px] bg-[#1E3A6E] text-white px-1.5 py-0.5 rounded font-bold">SUPER</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-gray-400">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {u.sucursal ? (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={11} className="text-gray-400" />
                                                        {u.sucursal.nombre}
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.rol === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {u.rol === 'admin' ? 'Admin' : 'Sucursal'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cuentaBadge(u.estado_cuenta)}`}>
                                                    {u.estado_cuenta === 'activo' ? 'Activo' : u.estado_cuenta === 'pendiente' ? 'Pendiente' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {!u.es_superadmin && (
                                                        <>
                                                            {/* Toggle status */}
                                                            <button
                                                                onClick={() => toggleStatus(u)}
                                                                disabled={procesando === u.id}
                                                                title={u.estado_cuenta === 'activo' ? 'Desactivar usuario' : 'Activar usuario'}
                                                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${u.estado_cuenta === 'activo'
                                                                    ? 'text-red-500 hover:bg-red-50'
                                                                    : 'text-green-600 hover:bg-green-50'
                                                                    }`}>
                                                                {procesando === u.id
                                                                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" />
                                                                    : u.estado_cuenta === 'activo' ? <UserX size={15} /> : <UserCheck size={15} />
                                                                }
                                                            </button>
                                                            {/* Edit */}
                                                            <button
                                                                onClick={() => startEdit(u)}
                                                                title="Editar usuario"
                                                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                                                                <Edit2 size={15} />
                                                            </button>
                                                            {/* Delete */}
                                                            {isSuperAdmin && (
                                                                <button
                                                                    onClick={() => setDeleteConfirm(deleteConfirm === u.id ? null : u.id)}
                                                                    title="Eliminar usuario"
                                                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    {u.es_superadmin && (
                                                        <span className="text-xs text-gray-400 italic pr-2">Protegido</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Delete confirm row */}
                                        {deleteConfirm === u.id && editingId !== u.id && (
                                            <tr key={`del-${u.id}`} className="bg-red-50">
                                                <td colSpan={5} className="px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm text-red-700 font-medium">
                                                            ¿Eliminar permanentemente a <strong>{u.nombre}</strong>?
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setDeleteConfirm(null)}
                                                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">
                                                                Cancelar
                                                            </button>
                                                            <button onClick={() => deleteUser(u.id)} disabled={procesando === u.id}
                                                                className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-1">
                                                                <Trash2 size={12} />
                                                                {procesando === u.id ? 'Eliminando...' : 'Sí, eliminar'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Edit row (inline) */}
                                        {editingId === u.id && editState && (
                                            <tr key={`edit-${u.id}`} className="bg-blue-50/60">
                                                <td colSpan={5} className="px-4 py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Nombre</label>
                                                            <input
                                                                type="text"
                                                                value={editState.nombre}
                                                                onChange={e => setEditState({ ...editState, nombre: e.target.value })}
                                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 focus:border-[#2B5EA7]"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Rol</label>
                                                            <select
                                                                value={editState.rol}
                                                                onChange={e => setEditState({ ...editState, rol: e.target.value as 'admin' | 'sucursal' })}
                                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 bg-white">
                                                                <option value="sucursal">Sucursal</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Estado</label>
                                                            <select
                                                                value={editState.estado_cuenta}
                                                                onChange={e => setEditState({ ...editState, estado_cuenta: e.target.value as 'activo' | 'pendiente' | 'inactivo' })}
                                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 bg-white">
                                                                <option value="activo">Activo</option>
                                                                <option value="pendiente">Pendiente</option>
                                                                <option value="inactivo">Inactivo</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Sucursal</label>
                                                            <select
                                                                value={editState.sucursal_id}
                                                                onChange={e => setEditState({ ...editState, sucursal_id: e.target.value })}
                                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA7]/20 bg-white">
                                                                <option value="">— Sin sucursal —</option>
                                                                {sucursales.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={cancelEdit}
                                                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">
                                                            <XCircle size={13} /> Cancelar
                                                        </button>
                                                        <button onClick={() => saveEdit(u.id)} disabled={saving}
                                                            className="flex items-center gap-1 text-xs px-4 py-1.5 rounded-lg bg-[#1E3A6E] text-white hover:bg-[#2B5EA7] transition-colors disabled:opacity-60">
                                                            {saving
                                                                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                : <Save size={13} />}
                                                            Guardar cambios
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
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
