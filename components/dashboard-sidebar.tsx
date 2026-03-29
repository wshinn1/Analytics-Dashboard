'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { BarChart3, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardSidebarProps {
  userEmail: string
}

export function DashboardSidebar({ userEmail }: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <BarChart3 className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-semibold text-sidebar-foreground">Analytics</span>
      </div>

      <nav className="flex-1 p-4">
        <div className="rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
          Dashboard
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 truncate text-xs text-muted-foreground">{userEmail}</div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-sidebar-primary" />
          <span className="text-base font-semibold text-sidebar-foreground">Analytics</span>
        </div>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="flex h-full w-64 flex-col border-r border-border bg-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-sidebar-primary" />
                <span className="text-lg font-semibold text-sidebar-foreground">Analytics</span>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-4">
              <div className="rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
                Dashboard
              </div>
            </nav>
            <div className="border-t border-sidebar-border p-4">
              <div className="mb-3 truncate text-xs text-muted-foreground">{userEmail}</div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
