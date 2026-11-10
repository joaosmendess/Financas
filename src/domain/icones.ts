// Ícones que uma meta pode ter. O banco guarda só a chave (coluna metas.emoji, mantida pelo nome
// histórico); quem desenha é src/components/icones.tsx. Valor desconhecido (ex.: um emoji antigo) vira 'alvo'.
export const ICONES_META = [
  'alvo', 'reserva', 'casa', 'viagem', 'carro', 'estudo', 'saude', 'presente', 'tecnologia', 'cofre', 'investimento', 'festa',
] as const

export type IconeMeta = (typeof ICONES_META)[number]
export const ICONE_META_PADRAO: IconeMeta = 'alvo'

export function iconeMeta(v: string | null | undefined): IconeMeta {
  return (ICONES_META as readonly string[]).includes(v ?? '') ? (v as IconeMeta) : ICONE_META_PADRAO
}
