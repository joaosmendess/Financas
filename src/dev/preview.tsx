// Prévia SÓ DE DESENVOLVIMENTO (preview.html não entra no build): renderiza as telas
// com dados de exemplo no cache, sem login, para conferir layout e tema.
// Uso: npm run dev e abra /preview.html?tema=dark#/lancamentos
import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { DialogoProvider } from '@/components/Dialogo'
import { ToastProvider } from '@/components/Toast'
import { DicasProvider } from '@/components/ui/tooltip'
import { chaves } from '@/data/consultas'
import { Ajustes } from '@/features/ajustes/Ajustes'
import { Lancamentos } from '@/features/lancamentos/Lancamentos'
import { Metas } from '@/features/metas/Metas'
import { QuemMeDeve } from '@/features/quem-me-deve/QuemMeDeve'
import { VisaoGeral } from '@/features/visao-geral/VisaoGeral'
import { Shell } from '@/layout/Shell'
import { queryClient } from '@/lib/queryClient'
import '@/styles/index.css'

const tema = new URLSearchParams(location.search).get('tema')
if (tema) document.documentElement.dataset.theme = tema
const vazio = new URLSearchParams(location.search).has('vazio')

queryClient.setDefaultOptions({ queries: { staleTime: Infinity, retry: false } })
const PAI = '00000000-0000-4000-8000-000000000001'
const STHE = '00000000-0000-4000-8000-000000000002'
let n = 0
const id = () => `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`
const L = (data: string, descricao: string, reais: number, parcela: string | null, categoria: string, dono = 'eu') => ({
  id: id(), mes_fatura: '2026-12', data_compra: data, descricao, valor_centavos: Math.round(reais * 100), parcela, categoria, dono, recebido: false,
})
const pessoas = [
  { id: PAI, nome: 'Painho', cor: '#2563EB', apelidos: ['José Valter'] },
  { id: STHE, nome: 'Sthe', cor: '#E5466F', apelidos: ['Elijani'] },
]
const lancamentos = [
  L('2026-10-17', 'C&A', 69.99, '02/02', 'Vestuário', PAI), L('2026-10-17', 'LOJAS RENNER', 59.95, '02/02', 'Vestuário', PAI),
  L('2026-10-17', 'ALMEIDA REFRIGERACAO', 92.48, '02/05', 'Serviços', PAI), L('2026-10-14', 'ADRY EMPREENDEDOR', 283.33, '02/06', 'Outros', PAI),
  L('2026-10-05', 'MERCADOLIVRE', 149.57, '02/02', 'Outros'), L('2026-10-02', 'JIM.COM* JOSENILDO', 157.41, '02/10', 'Serviços'),
  L('2026-09-20', 'PATRICIA VAZ DA COSTA', 110.33, '03/03', 'Outros', PAI), L('2026-09-05', 'KIKO COSMETICS BRASIL', 149.93, '03/03', 'Outros', STHE),
  L('2026-07-27', 'YOUCOM', 39.98, '05/05', 'Vestuário'), L('2026-07-13', 'MARCO SANTONIO', 485.33, '05/06', 'Serviços', PAI),
  L('2026-06-05', 'MERCADOLIVRE', 117.45, '06/10', 'Outros'), L('2026-06-05', 'MERCADOLIVRE (TV)', 116.45, '06/10', 'Outros', PAI),
  L('2026-05-23', 'CASA ESPORTIVA', 54.99, '07/10', 'Outros', PAI), L('2026-11-02', 'UBER', 5.9, null, 'Transporte'),
  L('2026-11-02', 'OUTBACK', 30.93, null, 'Alimentação'), L('2026-11-02', 'UBER', 18.95, null, 'Transporte'),
  L('2026-11-02', 'SUSHI GUGA', 55.84, null, 'Alimentação'), L('2026-11-05', 'WELLHUB', 183.3, null, 'Assinaturas'),
  L('2026-11-05', 'ZP LOJA RULINA CLOSET (CONSERTO DO AR)', 200, '01/03', 'Serviços', PAI),
]
const contas = [
  ['CLARO - DADOS MOVEIS', 61.16, 5], ['BRISANET - INTERNET', 100, 10], ['DAS - MEI', 99, 20], ['Empréstimo energia solar', 490, 15],
].map(([nome, v, dia]) => ({ id: id(), nome: nome as string, valor_centavos: Math.round((v as number) * 100), dia: dia as number, ativa: true }))
const metas = [
  { id: id(), emoji: '🛟', nome: 'Reserva de emergência', alvo_centavos: 1100000, atual_centavos: 240000, mensal_centavos: 70000, prazo: '2027-10', dia: 10 },
  { id: id(), emoji: '🏃', nome: 'Viagem Recife 2027', alvo_centavos: 250000, atual_centavos: 45000, mensal_centavos: 25000, prazo: '2027-05', dia: 10 },
]
const dividas = [
  { id: id(), pessoa_id: STHE, descricao: 'Ingresso do show', valor_centavos: 18000, mes: '2026-12', recebido: false, direcao: 'eu_devo' },
  { id: id(), pessoa_id: PAI, descricao: 'Pix emprestado', valor_centavos: 15000, mes: '2026-11', recebido: false, direcao: 'me_deve' },
]
queryClient.setQueryData(chaves.config, { renda_centavos: vazio ? 0 : 640000, cartao_nome: 'Itaú Platinum', dia_fechamento: 2, dia_vencimento: 9 })
queryClient.setQueryData(chaves.pessoas, vazio ? [] : pessoas)
queryClient.setQueryData(chaves.lancamentos, vazio ? [] : lancamentos)
queryClient.setQueryData(chaves.contas, vazio ? [] : contas)
queryClient.setQueryData(chaves.dividas, vazio ? [] : dividas)
queryClient.setQueryData(chaves.metas, vazio ? [] : metas)
for (const m of ['2026-11', '2026-12', '2027-01', '2027-02']) queryClient.setQueryData(chaves.pagamentos(m), new Set(m === '2026-12' ? [`c:${contas[0]!.id}`] : []))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <ToastProvider>
            <DicasProvider>
            <DialogoProvider>
              <Routes>
                <Route element={<Shell />}>
                  <Route index element={<VisaoGeral />} />
                  <Route path="lancamentos" element={<Lancamentos />} />
                  <Route path="quem-me-deve" element={<QuemMeDeve />} />
                  <Route path="metas" element={<Metas />} />
                  <Route path="ajustes" element={<Ajustes />} />
                </Route>
              </Routes>
            </DialogoProvider>
            </DicasProvider>
          </ToastProvider>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
