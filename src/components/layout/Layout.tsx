import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="min-h-screen bg-[#F4F6FA] dark:bg-slate-950 flex transition-colors duration-300">
            <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
