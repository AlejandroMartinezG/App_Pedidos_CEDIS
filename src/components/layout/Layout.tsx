import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
    return (
        <div className="min-h-screen bg-[#F4F6FA] flex">
            <Sidebar />
            <div className="flex-1 ml-56 flex flex-col min-h-screen">
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
