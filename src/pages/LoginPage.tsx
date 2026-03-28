import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, Lock, User, Trophy, Flame } from 'lucide-react'

const schema = z.object({
  username: z.string().min(1, 'Obrigatório'),
  password: z.string().min(1, 'Obrigatório'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { initialize } = useAuthStore()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ username, password }: FormData) => {
    setServerError('')
    try {
      // Supabase auth uses email; we store email as username@app.internal
      const email = `${username.toLowerCase()}@churrascoapp.internal`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setServerError('Usuário ou senha inválidos.')
        return
      }
      await initialize()
      navigate('/ranking', { replace: true })
    } catch {
      setServerError('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', color: 'var(--color-accent)' }}>
          <Trophy size={48} strokeWidth={1} />
          <Flame size={48} strokeWidth={1} />
        </div>
        <h1 className="font-display" style={{ fontSize: 36, letterSpacing: '0.04em', color: 'var(--color-text-primary)', lineHeight: 1 }}>
          ChurrAsco
        </h1>
        <p className="font-display" style={{ fontSize: 18, color: 'var(--color-primary)', letterSpacing: '0.06em' }}>
          DAS NAÇÕES
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
          Copa do Mundo 2026
        </p>
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: 380 }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">
              <User size={13} style={{ display: 'inline', marginRight: 4 }} />
              Usuário
            </label>
            <input
              {...register('username')}
              className={`input ${errors.username ? 'error' : ''}`}
              placeholder="seu_usuario"
              autoCapitalize="none"
              autoComplete="username"
              id="username"
            />
            {errors.username && <p className="input-error">{errors.username.message}</p>}
          </div>

          <div>
            <label className="input-label">
              <Lock size={13} style={{ display: 'inline', marginRight: 4 }} />
              Senha
            </label>
            <input
              {...register('password')}
              type="password"
              className={`input ${errors.password ? 'error' : ''}`}
              placeholder="••••••••"
              autoComplete="current-password"
              id="password"
            />
            {errors.password && <p className="input-error">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div style={{
              background: 'var(--color-error-muted)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--color-error)',
            }}>
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            id="login-submit"
            style={{ marginTop: 8 }}
          >
            {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Entrar
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--color-text-muted)' }}>
          Não tem conta?{' '}
          <Link to="/cadastro" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
            Criar conta
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
