'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface AdminContextType {
  isAdmin: boolean
  loading: boolean
  error: string | null
  refreshAdminStatus: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('is_user_admin', { p_user_id: userId })

      if (rpcError) {
        console.error('Error checking admin status:', rpcError)
        setError('Failed to verify admin status')
        return false
      }

      return data || false
    } catch (err) {
      console.error('Exception checking admin status:', err)
      setError(err instanceof Error ? err.message : 'Failed to verify admin status')
      return false
    }
  }, [])

  const refreshAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const adminStatus = await checkAdminStatus(user.id)
      setIsAdmin(adminStatus)
    } catch (err) {
      console.error('Error refreshing admin status:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh admin status')
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [user, checkAdminStatus])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Check admin status when user changes
    refreshAdminStatus()
  }, [user, authLoading, refreshAdminStatus])

  return (
    <AdminContext.Provider value={{ 
      isAdmin, 
      loading, 
      error,
      refreshAdminStatus 
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
