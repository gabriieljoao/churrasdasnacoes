import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}
