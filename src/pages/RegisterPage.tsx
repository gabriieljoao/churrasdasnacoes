import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, CheckCircle2, XCircle, Trophy, Flame } from 'lucide-react'

const schema = z.object({
  display_name: z.string().min(2, 'Mínimo 2 caracteres').max(40, 'Máximo 40 caracteres'),
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/\d/, 'Deve conter ao menos 1 número'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { initialize } = useAuthStore()
  const [serverError, setServerError] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const checkUsername = useCallback((value: string) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (!value || value.length < 3) { setUsernameStatus('idle'); return }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value.toLowerCase())
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
    setDebounceTimer(timer)
  }, [debounceTimer])

  const onSubmit = async ({ display_name, username, password }: FormData) => {
    setServerError('')
    if (usernameStatus === 'taken') { setServerError('Nome de usuário já está em uso.'); return }

    try {
      const email = `${username.toLowerCase()}@churrascoapp.internal`
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        if (error.message.includes('rate limit')) {
          setServerError('Limite do Supabase atingido. Vá no seu painel: Authentication > Providers > Email e DESATIVE a opção "Confirm email". Depois tente novamente.')
        } else {
          setServerError(error.message)
        }
        return
      }
      if (!data.user) { setServerError('Erro ao criar conta.'); return }

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username.toLowerCase(),
        display_name,
        is_admin: false,
      })
      if (profileError) { setServerError('Erro ao criar perfil.'); return }

      await initialize()
      navigate('/ranking', { replace: true })
    } catch {
      setServerError('Erro de conexão. Tente novamente.')
    }
  }

  const IconForStatus = () => {
    if (usernameStatus === 'checking') return <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />
    if (usernameStatus === 'available') return <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
    if (usernameStatus === 'taken') return <XCircle size={14} style={{ color: 'var(--color-error)' }} />
    return null
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', color: 'var(--color-accent)' }}>
          <Trophy size={48} strokeWidth={1} />
          <Flame size={48} strokeWidth={1} />
        </div>
        <h1 className="font-display" style={{ fontSize: 28, color: 'var(--color-text-primary)' }}>Criar Conta</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Copa do Mundo 2026</p>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Nome de exibição</label>
            <input {...register('display_name')} className={`input ${errors.display_name ? 'error' : ''}`} placeholder="Seu nome" id="display_name" />
            {errors.display_name && <p className="input-error">{errors.display_name.message}</p>}
          </div>

          <div>
            <label className="input-label">Usuário</label>
            <div style={{ position: 'relative' }}>
              <input
                {...register('username', { onChange: (e) => checkUsername(e.target.value) })}
                className={`input ${errors.username || usernameStatus === 'taken' ? 'error' : usernameStatus === 'available' ? '' : ''}`}
                placeholder="seu_usuario"
                autoCapitalize="none"
                id="username"
                style={{ paddingRight: 36 }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <IconForStatus />
              </span>
            </div>
            {errors.username && <p className="input-error">{errors.username.message}</p>}
            {!errors.username && usernameStatus === 'taken' && <p className="input-error">Nome de usuário já em uso</p>}
            {!errors.username && usernameStatus === 'available' && <p style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4 }}>Disponível ✓</p>}
            {!errors.username && !usernameStatus && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Letras minúsculas, números e _ · máx 20</p>}
          </div>

          <div>
            <label className="input-label">Senha</label>
            <input {...register('password')} type="password" className={`input ${errors.password ? 'error' : ''}`} placeholder="Mínimo 8 caracteres + 1 número" id="password" autoComplete="new-password" />
            {errors.password && <p className="input-error">{errors.password.message}</p>}
          </div>

          <div>
            <label className="input-label">Confirmar senha</label>
            <input {...register('confirm_password')} type="password" className={`input ${errors.confirm_password ? 'error' : ''}`} placeholder="Repita a senha" id="confirm_password" autoComplete="new-password" />
            {errors.confirm_password && <p className="input-error">{errors.confirm_password.message}</p>}
          </div>

          {serverError && (
            <div style={{ background: 'var(--color-error-muted)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, color: 'var(--color-error)' }}>
              {serverError}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting || usernameStatus === 'taken'} id="register-submit" style={{ marginTop: 8 }}>
            {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Criar conta
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-text-muted)' }}>
          Já tem conta?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>Entrar</Link>
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
