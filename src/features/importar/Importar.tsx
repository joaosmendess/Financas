import { useDialogo } from '@/components/Dialogo'
import { nomeMesAno } from '@/domain/meses'
import type { Mes } from '@/domain/tipos'

// Provisório: a importação de verdade entra na Fase 4.
export function Importar({ mes }: { mes: Mes }) {
  const { fechar } = useDialogo()
  return (
    <>
      <h3>Importar planilha</h3>
      <p>A importação para a fatura de <b>{nomeMesAno(mes)}</b> chega na próxima etapa.</p>
      <div className="mfoot"><button type="button" className="btn primary" onClick={fechar}>Entendi</button></div>
    </>
  )
}
