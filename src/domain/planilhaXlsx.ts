// Adaptador SheetJS → Planilha. Fica separado do importador para o SheetJS ser
// carregado só quando a importação é aberta (import dinâmico na tela).
import { read, utils, write, type WorkBook } from 'xlsx'
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

/** Modelo de planilha de metas, com as colunas que o importador reconhece. */
export function modeloMetas(): ArrayBuffer {
  const wb = utils.book_new()
  const ws = utils.aoa_to_sheet([
    ['Metas e reserva'],
    ['Emoji', 'Meta', 'Alvo', 'Guardado', 'Por mês', 'Prazo', 'Dia'],
    ['🛟', 'Reserva de emergência', 11000, 2400, 700, '10/2027', 10],
    ['🏠', 'Entrada do apartamento', 40000, 3500, 600, '12/2028', 10],
  ])
  ws['!cols'] = [{ wch: 7 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 6 }]
  utils.book_append_sheet(wb, ws, 'Metas')
  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
