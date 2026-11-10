import {
  ChevronLeft, ChevronRight, CreditCard, LayoutGrid, LogOut, Moon, Plus, SlidersHorizontal, Sun, Target, Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth, useUsuario } from '@/auth/AuthProvider'
import { useDadosDoMes } from '@/data/useDadosDoMes'
import { useAdicionar } from '@/features/formularios/formularios'
import { nomeMes, somarMeses } from '@/domain/meses'
import { useMes } from '@/state/mes'

const NAV = [
  { to: '/', rotulo: 'Visão geral', Icone: LayoutGrid },
  { to: '/lancamentos', rotulo: 'Lançamentos', Icone: CreditCard },
  { to: '/quem-me-deve', rotulo: 'Quem me deve', Icone: Users },
  { to: '/metas', rotulo: 'Metas e reserva', Icone: Target },
  { to: '/ajustes', rotulo: 'Ajustes', Icone: SlidersHorizontal },
] as const

// ---------- tema ----------

type Tema = 'light' | 'dark' | null
function lerTema(): Tema {
  try {
    const t = localStorage.getItem('fin-tema')
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

function SeletorTema() {
  const [tema, setTema] = useState<Tema>(lerTema)
  const [sistemaEscuro, setSistemaEscuro] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const f = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  const escolher = (t: 'light' | 'dark') => {
    try {
      localStorage.setItem('fin-tema', t)
    } catch {
      /* preferência só desta sessão */
    }
    document.documentElement.dataset.theme = t
    setTema(t)
  }
  const escuro = tema ? tema === 'dark' : sistemaEscuro
  return (
    <div className="theme">
      <span>Tema</span>
      <div className="seg" role="group" aria-label="Tema">
        <button type="button" aria-label="Claro" aria-pressed={!escuro} onClick={() => escolher('light')}><Sun /></button>
        <button type="button" aria-label="Escuro" aria-pressed={escuro} onClick={() => escolher('dark')}><Moon /></button>
      </div>
    </div>
  )
}

// ---------- menu Adicionar ----------

const ITENS_ADICIONAR = [
  ['lanc', '💳', 'Lançamento no cartão'],
  ['conta', '🗓️', 'Conta fixa'],
  ['me_deve', '🤝', 'Alguém me deve'],
  ['eu_devo', '🧾', 'Eu devo a alguém'],
  ['meta', '🐷', 'Meta'],
  ['pessoa', '🙋', 'Pessoa'],
  ['import', '📄', 'Importar planilha'],
] as const

function MenuAdicionar() {
  const { mes } = useMes()
  const adicionar = useAdicionar(mes)
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])
  return (
    <div className="addwrap" ref={caixa}>
      <button type="button" className="btn primary" aria-haspopup="true" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <Plus strokeWidth={2.4} />Adicionar
      </button>
      <div className={`menu${aberto ? ' open' : ''}`} role="menu">
        {ITENS_ADICIONAR.map(([tipo, emoji, rotulo]) => (
          <button
            key={tipo}
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false)
              adicionar(tipo)
            }}
          >
            <span className="e">{emoji}</span>
            {rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- casca ----------

export function Shell() {
  const { sair } = useAuth()
  const usuario = useUsuario()
  const { mes, aberto, setMes } = useMes()
  const { pendentes } = useDadosDoMes()
  const { search, pathname } = useLocation()

  useEffect(() => window.scrollTo(0, 0), [pathname])

  return (
    <div className="app">
      <aside className="side" aria-label="Navegação">
        <div className="brand">
          <span className="logo" aria-hidden="true">J</span>
          <div><b>Minhas Finanças</b><small>Cartão, contas e metas</small></div>
        </div>
        <h4>Menu</h4>
        <nav className="nav">
          {NAV.map(({ to, rotulo, Icone }) => (
            <NavLink key={to} to={{ pathname: to, search }} end={to === '/'}>
              <Icone strokeWidth={2} />
              {rotulo}
              {to === '/quem-me-deve' && pendentes.length > 0 && <span className="badge num">{pendentes.length}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="grow" />
        <SeletorTema />
        <div className="me">
          {usuario.foto ? (
            <img className="avatar" src={usuario.foto} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="avatar" style={{ background: 'var(--blue)' }}>{usuario.nome[0]?.toUpperCase()}</span>
          )}
          <div className="min-w-0">
            <b className="truncate">{usuario.primeiroNome}</b>
            <small><span className="dot" style={{ background: 'var(--green-2)' }} />Salvo na sua conta</small>
          </div>
          <button type="button" className="iconbtn sair" aria-label="Sair" title="Sair" onClick={sair}><LogOut /></button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="top">
          <button type="button" className="iconbtn" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>
            <ChevronLeft strokeWidth={2.2} />
          </button>
          <button type="button" className="iconbtn" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>
            <ChevronRight strokeWidth={2.2} />
          </button>
          <h1 className="month">
            {nomeMes(mes).replace(/^./, (c) => c.toUpperCase())} <span>{mes.slice(0, 4)}</span>
          </h1>
          {mes !== aberto && (
            <button type="button" className="btn sm" onClick={() => setMes(aberto)}>Fatura aberta</button>
          )}
          <div className="grow" />
          <MenuAdicionar />
        </header>
        <Outlet />
      </main>
    </div>
  )
}
