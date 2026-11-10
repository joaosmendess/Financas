// Adaptador SheetJS → Planilha. Fica separado do importador para o SheetJS ser
// carregado só quando a importação é aberta (import dinâmico na tela).
import { read, utils, type WorkBook } from 'xlsx'
import type { Linha, Planilha } from './importador'

export function deWorkbook(wb: WorkBook): Planilha {
  return {
    abas: wb.SheetNames.map((nome) => ({
      nome,
      linhas: wb.Sheets[nome]
        ? utils.sheet_to_json<Linha>(wb.Sheets[nome], { header: 1, raw: true, defval: null, blankrows: false })
        : [],
    })),
  }
}

/** Lê um .xlsx (ArrayBuffer ou Buffer). Datas chegam como Date. */
export function lerXlsx(dados: ArrayBuffer | Uint8Array): Planilha {
  return deWorkbook(read(dados, { type: 'array', cellDates: true }))
}
