import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout/Layout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { NuevoPedido } from '@/pages/NuevoPedido'
import { MisPedidos } from '@/pages/MisPedidos'
import { FormatoImprimible } from '@/pages/FormatoImprimible'
import { useAuth } from '@/context/AuthContext'

function RootRedirect() {
    const { user, loading } = useAuth()
    if (loading) return null
    if (!user) return <Navigate to="/login" replace />
    return user.rol === 'admin'
        ? <Navigate to="/dashboard" replace />
        : <Navigate to="/nuevo-pedido" replace />
}

export function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <Routes>
                        {/* Public */}
                        <Route path="/login" element={<Login />} />

                        {/* Print route (no sidebar) */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/imprimir/:id" element={<FormatoImprimible />} />
                        </Route>

                        {/* Protected with layout */}
                        <Route element={<ProtectedRoute />}>
                            <Route element={<Layout />}>
                                <Route path="/" element={<RootRedirect />} />

                                {/* Admin routes */}
                                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                                    <Route path="/dashboard" element={<Dashboard />} />
                                </Route>

                                {/* Sucursal routes */}
                                <Route element={<ProtectedRoute allowedRoles={['sucursal']} />}>
                                    <Route path="/nuevo-pedido" element={<NuevoPedido />} />
                                    <Route path="/mis-pedidos" element={<MisPedidos />} />
                                </Route>

                                {/* Shared */}
                                <Route path="/nuevo-pedido/:id" element={<NuevoPedido />} />
                                <Route path="/historial" element={<MisPedidos />} />
                            </Route>
                        </Route>

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    )
}
