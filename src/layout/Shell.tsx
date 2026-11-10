import {
  CalendarCheck, CalendarClock, ChevronLeft, FileSpreadsheet, HandCoins, PiggyBank, Receipt, UserPlus, ChevronRight, CreditCard, LayoutGrid, LogOut, Moon, Plus, SlidersHorizontal, Sun, Target, Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth, useUsuario } from '@/auth/AuthProvider'
import { BotaoIcone } from '@/components/BotaoIcone'
import { Menu, MenuConteudo, MenuGatilho, MenuItem } from '@/components/ui/dropdown-menu'
import { useDadosDoMes } from '@/data/useDadosDoMes'
import { useAdicionar } from '@/features/formularios/formularios'
import { nomeMes, somarMeses } from '@/domain/meses'
import { useMes } from '@/state/mes'

const NAV = [
  { to: '/', rotulo: 'Visão geral', curto: 'Início', Icone: LayoutGrid },
  { to: '/lancamentos', rotulo: 'Lançamentos', curto: 'Lançamentos', Icone: CreditCard },
  { to: '/quem-me-deve', rotulo: 'Quem me deve', curto: 'Me deve', Icone: Users },
  { to: '/metas', rotulo: 'Metas e reserva', curto: 'Metas', Icone: Target },
  { to: '/ajustes', rotulo: 'Ajustes', curto: 'Ajustes', Icone: SlidersHorizontal },
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

/** Claro/escuro. Fica na barra lateral e, no celular, em Ajustes. */
export function SeletorTema({ comRotulo = true }: { comRotulo?: boolean }) {
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
      {comRotulo && <span>Tema</span>}
      <div className="seg" role="group" aria-label="Tema">
        <button type="button" aria-label="Claro" aria-pressed={!escuro} onClick={() => escolher('light')}><Sun /></button>
        <button type="button" aria-label="Escuro" aria-pressed={escuro} onClick={() => escolher('dark')}><Moon /></button>
      </div>
    </div>
  )
}

// ---------- menu Adicionar ----------

const ITENS_ADICIONAR = [
  ['lanc', CreditCard, 'Lançamento no cartão'],
  ['conta', CalendarClock, 'Conta fixa'],
  ['me_deve', HandCoins, 'Alguém me deve'],
  ['eu_devo', Receipt, 'Eu devo a alguém'],
  ['meta', PiggyBank, 'Meta'],
  ['pessoa', UserPlus, 'Pessoa'],
  ['import', FileSpreadsheet, 'Importar planilha'],
] as const

function MenuAdicionar() {
  const { mes } = useMes()
  const adicionar = useAdicionar(mes)
  return (
    <Menu modal={false}>
      <MenuGatilho asChild>
        <button type="button" className="btn primary" aria-label="Adicionar">
          <Plus strokeWidth={2.4} />
          <span className="rotulo-add">Adicionar</span>
        </button>
      </MenuGatilho>
      <MenuConteudo>
        {ITENS_ADICIONAR.map(([tipo, Icone, rotulo]) => (
          // setTimeout: deixa o menu fechar antes de abrir o modal (o foco não briga entre os dois)
          <MenuItem key={tipo} onSelect={() => setTimeout(() => adicionar(tipo), 0)}>
            <Icone className="e" aria-hidden="true" />
            {rotulo}
          </MenuItem>
        ))}
      </MenuConteudo>
    </Menu>
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

  const badge = (to: string) => (to === '/quem-me-deve' && pendentes.length > 0 ? pendentes.length : null)

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
              {badge(to) && <span className="badge num">{badge(to)}</span>}
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
          <BotaoIcone rotulo="Sair" className="sair" onClick={sair}><LogOut /></BotaoIcone>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="top">
          <BotaoIcone rotulo="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}><ChevronLeft strokeWidth={2.2} /></BotaoIcone>
          <BotaoIcone rotulo="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}><ChevronRight strokeWidth={2.2} /></BotaoIcone>
          <h1 className="month">
            {nomeMes(mes).replace(/^./, (c) => c.toUpperCase())} <span>{mes.slice(0, 4)}</span>
          </h1>
          {mes !== aberto && (
            <button type="button" className="btn sm" aria-label="Ir para a fatura aberta" onClick={() => setMes(aberto)}>
              <CalendarCheck />
              <span className="rotulo-add">Fatura aberta</span>
            </button>
          )}
          <div className="grow" />
          <MenuAdicionar />
        </header>
        {/* key: a tela (e o mês) entram animadas a cada troca */}
        <div key={pathname + mes} className="pagina">
          <Outlet />
        </div>
      </main>

      {/* Celular: abas fixas embaixo, no lugar da barra lateral */}
      <nav className="tabbar" aria-label="Navegação">
        {NAV.map(({ to, curto, Icone }) => (
          <NavLink key={to} to={{ pathname: to, search }} end={to === '/'}>
            <Icone strokeWidth={2} aria-hidden="true" />
            <span>{curto}</span>
            {badge(to) && <span className="badge num" aria-label={`${badge(to)} pendentes`}>{badge(to)}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
