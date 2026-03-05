// ─────────────────────────────────────────────
// Enums / Union Types
// ─────────────────────────────────────────────

export type Categoria =
    | 'materia_prima'
    | 'esencia'
    | 'varios'
    | 'envase_vacio'
    | 'color'

export type Rol = 'admin' | 'sucursal'
export type EstadoCuenta = 'pendiente' | 'activo' | 'inactivo'
export type EstadoPedido = 'borrador' | 'enviado' | 'aprobado' | 'impreso'
export type TipoEntrega = 'HINO' | 'Recolección en CEDIS'
export type EstadoSolicitud = 'pendiente' | 'aprobado' | 'rechazado'

// ─────────────────────────────────────────────
// Database Row Types
// ─────────────────────────────────────────────

export interface Sucursal {
    id: string
    nombre: string
    abreviacion: string
    ciudad: string
    activa: boolean
}

export interface UserProfile {
    id: string
    nombre: string
    email: string
    rol: Rol
    sucursal_id: string | null
    sucursal?: Sucursal
    estado_cuenta: EstadoCuenta
    es_superadmin: boolean
}

export interface SolicitudAcceso {
    id: string
    user_id: string | null
    nombre: string
    email: string
    sucursal_id: string | null
    sucursal?: Sucursal
    mensaje: string | null
    estado: EstadoSolicitud
    revisado_por: string | null
    revisado_at: string | null
    created_at: string
}

export interface Material {
    id: string
    codigo: string | null
    nombre: string
    categoria: Categoria
    unidad_base: string
    peso_aproximado: number | null
    envase: string | null
    orden: number
    activo: boolean
}

export interface Pedido {
    id: string
    codigo_pedido: string
    sucursal_id: string
    fecha_entrega: string
    tipo_entrega: TipoEntrega | null
    total_kilos: number
    estado: EstadoPedido
    created_at: string
    updated_at: string
    enviado_at: string | null
    enviado_por: string | null
    sucursal?: Sucursal
}

export interface PedidoDetalle {
    id: string
    pedido_id: string
    material_id: string
    cantidad_kilos: number | null
    cantidad_solicitada: number | null
    peso_total: number | null
    lote: string | null
    peso: number | null
    material?: Material
}

// ─────────────────────────────────────────────
// Frontend State Types
// ─────────────────────────────────────────────

export interface DetalleLinea {
    material: Material
    cantidad_kilos: number | null
    cantidad_solicitada: number | null
    peso_total: number | null
}

export interface PedidoState {
    pedido: Pedido | null
    detalles: DetalleLinea[]
}

// ─────────────────────────────────────────────
// Database Types (unused with any client, kept for docs)
// ─────────────────────────────────────────────

export interface Database {
    public: {
        Tables: {
            sucursales: { Row: Sucursal; Insert: Omit<Sucursal, 'id'>; Update: Partial<Omit<Sucursal, 'id'>> }
            users: { Row: UserProfile; Insert: Omit<UserProfile, 'sucursal'>; Update: Partial<Omit<UserProfile, 'id' | 'sucursal'>> }
            materiales: { Row: Material; Insert: Omit<Material, 'id'>; Update: Partial<Omit<Material, 'id'>> }
            pedidos: { Row: Pedido; Insert: Omit<Pedido, 'id' | 'created_at' | 'updated_at' | 'sucursal'>; Update: Partial<Omit<Pedido, 'id' | 'sucursal'>> }
            pedido_detalle: { Row: PedidoDetalle; Insert: Omit<PedidoDetalle, 'id' | 'material'>; Update: Partial<Omit<PedidoDetalle, 'id' | 'material'>> }
            solicitudes_acceso: { Row: SolicitudAcceso; Insert: Omit<SolicitudAcceso, 'id' | 'created_at'>; Update: Partial<SolicitudAcceso> }
        }
        Functions: {
            validate_pedido_limit: { Args: { p_pedido_id: string }; Returns: boolean }
        }
    }
}
