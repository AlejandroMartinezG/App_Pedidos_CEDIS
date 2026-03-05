import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

export function Layout() {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="min-h-screen bg-[#F4F6FA] dark:bg-slate-950 flex transition-colors duration-300">
            {/* Sidebar Desktop */}
            <Sidebar
                isCollapsed={isCollapsed}
                onToggle={() => setIsCollapsed(!isCollapsed)}
            />

            {/* Mobile Bottom Navigation */}
            <MobileNav />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-h-screen w-full transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} pb-16 md:pb-0`}>
                <main className="flex-1 w-full max-w-full overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
