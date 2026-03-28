import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, LogOut, User, Lock } from 'lucide-react'

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Obrigatório'),
  new_password: z.string().min(8, 'Mínimo 8 caracteres').regex(/\d/, 'Deve conter ao menos 1 número'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const changePassword = async ({ new_password }: PasswordFormData) => {
    setPwError('')
    setPwSuccess('')
    const { error } = await supabase.auth.updateUser({ password: new_password })
    if (error) { setPwError(error.message); return }
    setPwSuccess('Senha alterada com sucesso!')
    reset()
  }

  return (
    <div className="page">
      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px 0' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--color-primary-muted)',
          border: '2px solid var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--color-primary)',
        }}>
          {user?.display_name?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>{user?.display_name}</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>@{user?.username}</div>
          {user?.is_admin && <span className="badge badge-primary" style={{ marginTop: 4 }}>Admin</span>}
        </div>
      </div>

      {/* Account info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <User size={16} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Dados da conta</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>Nome de exibição</div>
            <div style={{ fontSize: 15, color: 'var(--color-text-primary)' }}>{user?.display_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>Usuário</div>
            <div style={{ fontSize: 15, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>@{user?.username}</div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Lock size={16} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Alterar senha</span>
        </div>

        <form onSubmit={handleSubmit(changePassword)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="input-label">Senha atual</label>
            <input {...register('current_password')} type="password" className={`input ${errors.current_password ? 'error' : ''}`} placeholder="••••••••" id="current_password" />
            {errors.current_password && <p className="input-error">{errors.current_password.message}</p>}
          </div>
          <div>
            <label className="input-label">Nova senha</label>
            <input {...register('new_password')} type="password" className={`input ${errors.new_password ? 'error' : ''}`} placeholder="Mínimo 8 caracteres + 1 número" id="new_password" />
            {errors.new_password && <p className="input-error">{errors.new_password.message}</p>}
          </div>
          <div>
            <label className="input-label">Confirmar nova senha</label>
            <input {...register('confirm_password')} type="password" className={`input ${errors.confirm_password ? 'error' : ''}`} placeholder="Repita a nova senha" id="confirm_password" />
            {errors.confirm_password && <p className="input-error">{errors.confirm_password.message}</p>}
          </div>

          {pwError && <div style={{ background: 'var(--color-error-muted)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, color: 'var(--color-error)' }}>{pwError}</div>}
          {pwSuccess && <div style={{ background: 'var(--color-success-muted)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, color: 'var(--color-success)' }}>{pwSuccess}</div>}

          <button type="submit" className="btn btn-accent" disabled={isSubmitting} id="change-password-submit">
            {isSubmitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Alterar senha
          </button>
        </form>
      </div>

      {/* Logout */}
      <button
        className="btn btn-ghost"
        style={{ width: '100%', color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.3)' }}
        onClick={handleLogout}
        id="logout-btn"
      >
        <LogOut size={16} /> Sair da conta
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
