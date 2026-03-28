import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import RankingPage from '@/pages/RankingPage'
import DraftPage from '@/pages/DraftPage'
import PredictionsPage from '@/pages/PredictionsPage'
import KnockoutPage from '@/pages/KnockoutPage'
import ChurrascoPage from '@/pages/ChurrascoPage'
import ProfilePage from '@/pages/ProfilePage'
import HistoryPage from '@/pages/HistoryPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return null
  if (user) return <Navigate to="/ranking" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter basename="/churrasdasnacoes">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/cadastro" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Authenticated */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<Navigate to="/ranking" replace />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/draft" element={<DraftPage />} />
          <Route path="/palpites" element={<PredictionsPage />} />
          <Route path="/mata-mata" element={<KnockoutPage />} />
          <Route path="/churrasco" element={<ChurrascoPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
