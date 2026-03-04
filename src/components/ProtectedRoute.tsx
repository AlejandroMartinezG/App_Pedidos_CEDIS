import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Rol } from '@/lib/types'

interface Props {
    allowedRoles?: Rol[]
}

export function ProtectedRoute({ allowedRoles }: Props) {
    const { user, loading, session } = useAuth()

    // AuthProvider initializing (page load)
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA]">
                <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // No session → go to login
    if (!session) return <Navigate to="/login" replace />

    // Session exists but profile still loading (fetchProfile in progress via onAuthStateChange)
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA]">
                <span className="w-8 h-8 border-4 border-[#2B5EA7] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Wrong role
    if (allowedRoles && !allowedRoles.includes(user.rol)) {
        return <Navigate to={user.rol === 'admin' ? '/dashboard' : '/nuevo-pedido'} replace />
    }

    return <Outlet />
}
