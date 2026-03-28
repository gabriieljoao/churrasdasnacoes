import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, Lock, User, AlertCircle } from 'lucide-react'

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
      const email = `${username.toLowerCase()}@churrascoapp.internal`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setServerError('Usuário ou senha inválidos.'); return }
      await initialize()
      navigate('/ranking', { replace: true })
    } catch {
      setServerError('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      gap: 0,
      /* Ambient glow behind form */
      background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,96,57,0.18) 0%, transparent 65%)',
    }}>

      {/* ── Logo Block ── */}
      <div style={{ textAlign: 'center', marginBottom: 48, userSelect: 'none' }}>
        {/* Icon badge */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          margin: '0 auto 24px',
          background: 'linear-gradient(145deg, rgba(0,135,90,0.22), rgba(0,60,36,0.12))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,135,90,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 -1px 0 rgba(0,0,0,0.20),
            0 8px 32px rgba(0,96,57,0.28),
            0 2px 8px rgba(0,0,0,0.40)
          `,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(0,200,120,0.90)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>

        <h1 className="font-display" style={{
          fontSize: 44,
          letterSpacing: '0.06em',
          lineHeight: 1,
          background: 'linear-gradient(to bottom, #f5f0e8 0%, rgba(245,240,232,0.50) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          ChurrAsco
        </h1>
        <p className="font-display" style={{
          fontSize: 16,
          letterSpacing: '0.22em',
          background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          DAS NAÇÕES
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
          Copa do Mundo · 2026
        </p>
      </div>

      {/* ── Form glass card ── */}
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'rgba(14, 18, 15, 0.70)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        padding: '28px 24px',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.10),
          inset 0 -1px 0 rgba(0,0,0,0.18),
          0 24px 64px rgba(0,0,0,0.60),
          0 4px 12px rgba(0,0,0,0.40)
        `,
      }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <label className="input-label">
              <User size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
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
              <Lock size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
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
              background: 'rgba(229,83,83,0.08)',
              border: '1px solid rgba(229,83,83,0.22)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--color-error)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertCircle size={14} strokeWidth={2} />
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            id="login-submit"
            style={{ marginTop: 4 }}
          >
            {isSubmitting
              ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              : null}
            Entrar
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Sem conta?{' '}
          <Link
            to="/cadastro"
            style={{
              color: 'var(--color-accent-light)',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Criar conta
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
