import type { Categoria } from './types'

// ─────────────────────────────────────────────
// Business rules
// ─────────────────────────────────────────────
export const LIMITE_KG = 11_500
export const ALERTA_KG = 9_500

// ─────────────────────────────────────────────
// Color palette
// ─────────────────────────────────────────────
export const COLORS = {
    primaryDark: '#1E3A6E',
    primaryMid: '#2B5EA7',
    accent: '#D4A01E',
    bg: '#F4F6FA',
    cardBorder: '#E2E5EB',
    danger: '#DC2626',
    success: '#1B8553',
    warning: '#D97706',
} as const

// ─────────────────────────────────────────────
// Category metadata
// ─────────────────────────────────────────────
export interface CategoriaInfo {
    key: Categoria
    label: string
    shortLabel: string
    color: string
    dot: string
}

export const CATEGORIAS: CategoriaInfo[] = [
    { key: 'materia_prima', label: 'Materias Primas', shortLabel: 'MP', color: '#2B5EA7', dot: 'bg-blue-600' },
    { key: 'esencia', label: 'Esencias', shortLabel: 'Esen', color: '#7C3AED', dot: 'bg-purple-600' },
    { key: 'varios', label: 'Varios', shortLabel: 'Var', color: '#059669', dot: 'bg-emerald-600' },
    { key: 'color', label: 'Colores', shortLabel: 'Col', color: '#DC2626', dot: 'bg-red-600' },
    { key: 'envase_vacio', label: 'Envases Vacíos', shortLabel: 'Env', color: '#D97706', dot: 'bg-amber-600' },
]

export const CATEGORIA_MAP = Object.fromEntries(
    CATEGORIAS.map(c => [c.key, c])
) as Record<Categoria, CategoriaInfo>

// ─────────────────────────────────────────────
// Order status
// ─────────────────────────────────────────────
export const ESTADO_LABELS: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    aprobado: 'Aprobado',
    impreso: 'Impreso',
}

export const ESTADO_COLORS: Record<string, string> = {
    borrador: 'bg-gray-100 text-gray-700 border-gray-300',
    enviado: 'bg-amber-50 text-amber-700 border-amber-300',
    aprobado: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    impreso: 'bg-blue-50 text-blue-700 border-blue-300',
}

// ─────────────────────────────────────────────
// Auto-save interval (ms)
// ─────────────────────────────────────────────
export const AUTOSAVE_INTERVAL = 30_000
