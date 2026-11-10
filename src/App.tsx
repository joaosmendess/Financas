import { Navigate, Route, Routes } from 'react-router'
import { useAuth, useUsuario } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { useConfig, useDividas, useLancamentos, useMetas, usePessoas } from './data/consultas'

// Tela provisória da Fase 2: confirma login e leitura do banco. As telas reais entram na Fase 3.
function Provisorio({ titulo }: { titulo: string }) {
  const { sair } = useAuth()
  const { primeiroNome } = useUsuario()
  const config = useConfig()
  const contagens = [
    ['Pessoas', usePessoas().data?.length],
    ['Lançamentos', useLancamentos().data?.length],
    ['Dívidas', useDividas().data?.length],
    ['Metas', useMetas().data?.length],
  ] as const
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <section className="w-full max-w-[420px] rounded-card bg-surface p-6 shadow-card">
        <h1 className="m-0 text-xl font-extrabold tracking-tight">{titulo}</h1>
        <p className="text-muted">Olá, {primeiroNome}. Login e banco funcionando.</p>
        <p className="text-[13px] text-muted">
          Cartão: {config.data?.cartao_nome ?? '…'} · fecha dia {config.data?.dia_fechamento ?? '…'}
        </p>
        <ul className="my-3 list-none p-0 text-[13px]">
          {contagens.map(([n, v]) => (
            <li key={n} className="flex justify-between border-b border-line py-1.5">
              <span>{n}</span>
              <b className="num">{v ?? '…'}</b>
            </li>
          ))}
        </ul>
        <button type="button" onClick={sair} className="rounded-[11px] border border-line px-3 py-2 font-bold hover:bg-surface-2">
          Sair
        </button>
      </section>
    </main>
  )
}

const ROTAS = [
  ['/', 'Visão geral'],
  ['/lancamentos', 'Lançamentos'],
  ['/quem-me-deve', 'Quem me deve'],
  ['/metas', 'Metas e reserva'],
  ['/ajustes', 'Ajustes'],
] as const

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {ROTAS.map(([path, titulo]) => (
        <Route key={path} path={path} element={<RequireAuth><Provisorio titulo={titulo} /></RequireAuth>} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
