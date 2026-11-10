import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

type Ouvinte = (mensagem: string) => void
let ouvinteErro: Ouvinte = (m) => console.error(m)

/** O Toast registra aqui como mostrar erros de leitura/gravação. */
export function aoErro(fn: Ouvinte) {
  ouvinteErro = fn
}

const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (e) => ouvinteErro(`Não consegui carregar: ${mensagem(e)}`) }),
  mutationCache: new MutationCache({ onError: (e) => ouvinteErro(`Não salvou: ${mensagem(e)}`) }),
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: true, retry: 1 },
  },
})
