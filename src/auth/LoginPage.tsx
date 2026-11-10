import { useState } from 'react'
import { Navigate } from 'react-router'
import { Carregando } from './RequireAuth'
import { useAuth } from './AuthProvider'

function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px] flex-none" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** Vitrine decorativa: cartão do Itaú flutuando e fichas do app entrando em sequência. */
function Vitrine() {
  return (
    <div className="login-vitrine" aria-hidden="true">
      <div className="login-cartao">
        <div className="login-cartao-brilho" />
        <div className="flex items-center justify-between">
          <span className="login-cartao-logo">itaú</span>
          <span className="login-cartao-pill">Aberta</span>
        </div>
        <div className="login-cartao-tier">PLATINUM</div>
        <div className="flex items-end justify-between">
          <svg viewBox="0 0 34 26" className="w-[34px]">
            <rect x=".5" y=".5" width="33" height="25" rx="5" fill="#F5D58A" stroke="#C9A24E" />
            <path d="M0 9h11M0 17h11M23 9h11M23 17h11M11 0v26M23 0v26" stroke="#C9A24E" />
          </svg>
          <span className="flex">
            <i className="login-bola" style={{ background: 'rgba(235,0,27,.9)' }} />
            <i className="login-bola" style={{ background: 'rgba(247,158,27,.9)', marginLeft: -10 }} />
          </span>
        </div>
      </div>
      <div className="login-ficha" style={{ ['--i' as string]: 0 }}>
        <span className="login-ficha-ico">👛</span>
        <div><small>Saldo previsto</small><b className="num">sobra no fim do mês</b></div>
      </div>
      <div className="login-ficha" style={{ ['--i' as string]: 1 }}>
        <span className="login-ficha-ico">🤝</span>
        <div><small>Quem me deve</small><b className="num">compras do cartão e Pix</b></div>
      </div>
      <div className="login-ficha" style={{ ['--i' as string]: 2 }}>
        <span className="login-ficha-ico">🐷</span>
        <div><small>Metas e reserva</small><b className="num">quanto guardar por mês</b></div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { session, carregando, entrarComGoogle } = useAuth()
  const [erro, setErro] = useState<string | null>(null)
  const [indo, setIndo] = useState(false)

  if (carregando) return <Carregando />
  if (session) return <Navigate to="/" replace />

  async function entrar() {
    setErro(null)
    setIndo(true)
    try {
      await entrarComGoogle()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui abrir o login do Google.')
      setIndo(false)
    }
  }

  return (
    <main className="login">
      <div className="login-fundo" aria-hidden="true">
        <i className="login-blob azul" />
        <i className="login-blob laranja" />
        <i className="login-blob verde" />
      </div>

      <div className="login-grade">
        <section className="login-texto">
          <span className="login-selo">Fatura, contas e metas</span>
          <h1>Seu mês inteiro,<br />sem planilha.</h1>
          <p>A fatura do cartão, o que cada pessoa te deve, as contas fixas e quanto sobra, num lugar só.</p>
          <Vitrine />
        </section>

        <section className="login-card" aria-labelledby="login-titulo">
          <div className="login-logo" aria-hidden="true">J</div>
          <h2 id="login-titulo">Minhas Finanças</h2>
          <p className="login-sub">Entre para ver a fatura aberta.</p>
          <button type="button" onClick={entrar} disabled={indo} className="login-google" aria-busy={indo}>
            {indo ? <span className="login-spinner" aria-hidden="true" /> : <LogoGoogle />}
            {indo ? 'Abrindo o Google…' : 'Entrar com Google'}
          </button>
          {erro && <p className="login-erro" role="alert">{erro}</p>}
          <p className="login-rodape">🔒 Só você vê os seus dados.</p>
        </section>
      </div>
    </main>
  )
}
