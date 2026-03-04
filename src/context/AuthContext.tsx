import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
    session: Session | null
    user: UserProfile | null
    loading: boolean
    loginMessage: string | null
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (params: SignUpParams) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
    isSuperAdmin: boolean
}

export interface SignUpParams {
    email: string
    password: string
    nombre: string
    sucursal_id: string | null
    mensaje?: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SUPERADMIN_EMAILS = [
    'auxiliar.almacen@clorodehidalgo.com',
    'alejandro2310.am@gmail.com',
]

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ── Fetch profile using native fetch (bypasses supabase-js client queue) ──
async function fetchProfileRaw(userId: string, accessToken: string): Promise<UserProfile | null> {
    try {
        const url = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,email,nombre,rol,estado_cuenta,es_superadmin,sucursal_id,sucursal:sucursales(id,nombre,abreviacion,ciudad)&limit=1`
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })
        if (!res.ok) return null
        const rows: UserProfile[] = await res.json()
        return rows[0] ?? null
    } catch {
        return null
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [loginMessage, setLoginMessage] = useState<string | null>(null)

    const handleSession = async (sess: Session | null) => {
        setSession(sess)
        if (!sess?.user) { setUser(null); return }

        const profile = await fetchProfileRaw(sess.user.id, sess.access_token)

        if (!profile) {
            await supabase.auth.signOut()
            setUser(null)
            setSession(null)
            setLoginMessage('No se encontró tu perfil. Contacta al administrador.')
            return
        }
        if (profile.estado_cuenta === 'pendiente') {
            await supabase.auth.signOut()
            setUser(null)
            setSession(null)
            setLoginMessage('pending')
            return
        }
        if (profile.estado_cuenta === 'inactivo') {
            await supabase.auth.signOut()
            setUser(null)
            setSession(null)
            setLoginMessage('Tu cuenta ha sido desactivada. Contacta al administrador.')
            return
        }
        setUser(profile)
        setLoginMessage(null)
    }

    useEffect(() => {
        // Load initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session).finally(() => setLoading(false))
        })

        // React to future auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                // Use setTimeout to prevent supabase-js internal deadlock
                // when making HTTP requests inside the auth event callback
                setTimeout(() => handleSession(session), 0)
            }
        )
        return () => subscription.unsubscribe()
    }, [])

    // ── signIn ──────────────────────────────────────────────────────────
    const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
        setLoginMessage(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: 'Correo o contraseña incorrectos.' }
        return { error: null }
        // onAuthStateChange → setTimeout → handleSession → fetchProfileRaw → setUser
    }

    // ── signUp ──────────────────────────────────────────────────────────
    const signUp = async (params: SignUpParams): Promise<{ error: string | null }> => {
        const { email, password, nombre, sucursal_id, mensaje } = params

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { nombre } },
        })

        if (error) {
            if (error.message.includes('already registered') || error.message.includes('already exists')) {
                return { error: 'Este correo ya está registrado.' }
            }
            return { error: error.message }
        }

        if (!data.user) return { error: 'No se pudo crear la cuenta.' }

        const isSuperAdm = SUPERADMIN_EMAILS.includes(email.toLowerCase())
        const estado_cuenta = isSuperAdm ? 'activo' : 'pendiente'
        const rol = isSuperAdm ? 'admin' : 'sucursal'

        const { error: profileError } = await supabase.from('users').upsert({
            id: data.user.id,
            email,
            nombre,
            rol,
            sucursal_id: isSuperAdm ? null : sucursal_id,
            estado_cuenta,
            es_superadmin: isSuperAdm,
        }, { onConflict: 'id' })

        if (profileError) {
            console.error('Profile insert error:', profileError)
            return { error: 'Cuenta creada pero hubo un error al guardar el perfil.' }
        }

        if (!isSuperAdm) {
            await supabase.from('solicitudes_acceso').insert({
                user_id: data.user.id,
                nombre,
                email,
                sucursal_id,
                mensaje: mensaje || null,
            })
            await supabase.auth.signOut()
        }

        return { error: null }
    }

    // ── signOut ─────────────────────────────────────────────────────────
    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
    }

    const isSuperAdmin = user?.es_superadmin === true ||
        SUPERADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? '')

    return (
        <AuthContext.Provider value={{
            session, user, loading, loginMessage,
            signIn, signUp, signOut, isSuperAdmin,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
