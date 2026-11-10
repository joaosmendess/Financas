// Ícones (lucide) no lugar dos emojis do protótipo.
import {
  CarFront, Clapperboard, GraduationCap, Gift, HeartPulse, House, Laptop, Package, PartyPopper, PiggyBank, Pill, Plane,
  Sandwich, Shield, Shirt, ShoppingBag, ShoppingCart, Target, TrendingUp, Tv, Utensils, Wrench, type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { normalizar } from '@/domain/categoria'
import { iconeMeta, type IconeMeta } from '@/domain/icones'

export const ICONE_META: Record<IconeMeta, { rotulo: string; Icone: LucideIcon }> = {
  alvo: { rotulo: 'Objetivo', Icone: Target },
  reserva: { rotulo: 'Reserva', Icone: Shield },
  casa: { rotulo: 'Casa', Icone: House },
  viagem: { rotulo: 'Viagem', Icone: Plane },
  carro: { rotulo: 'Carro', Icone: CarFront },
  estudo: { rotulo: 'Estudo', Icone: GraduationCap },
  saude: { rotulo: 'Saúde', Icone: HeartPulse },
  presente: { rotulo: 'Presente', Icone: Gift },
  tecnologia: { rotulo: 'Tecnologia', Icone: Laptop },
  cofre: { rotulo: 'Cofrinho', Icone: PiggyBank },
  investimento: { rotulo: 'Investimento', Icone: TrendingUp },
  festa: { rotulo: 'Festa', Icone: PartyPopper },
}

export function IconeDaMeta({ chave, className }: { chave: string | null | undefined; className?: string }) {
  const { Icone } = ICONE_META[iconeMeta(chave)]
  return <Icone className={className} strokeWidth={2} aria-hidden="true" />
}

const ICONE_CATEGORIA: Record<string, LucideIcon> = {
  restaurante: Utensils,
  alimentacao: Sandwich,
  supermercado: ShoppingCart,
  transporte: CarFront,
  saude: Pill,
  educacao: GraduationCap,
  assinaturas: Tv,
  compras: ShoppingBag,
  vestuario: Shirt,
  servicos: Wrench,
  lazer: Clapperboard,
  outros: Package,
}

export function IconeDaCategoria({ nome, className }: { nome: string; className?: string }) {
  const Icone = ICONE_CATEGORIA[normalizar(nome)] ?? Package
  return <Icone className={className} strokeWidth={2} aria-hidden="true" />
}

export type NomeIlustracao = 'carteira' | 'calendario' | 'dinheiro' | 'cartao' | 'reserva'

/** Ilustração 3D (public/ilustracoes, 3dicons CC0). */
export function Imagem3D({ nome, className }: { nome: NomeIlustracao; className?: string }) {
  return <img src={`/ilustracoes/${nome}.webp`} alt="" width={192} height={192} decoding="async" draggable={false} className={className} />
}

/**
 * O "desenho" grande do canto dos cards (no protótipo era um emoji inclinado).
 * Mostra a ilustração 3D; se a imagem falhar, cai para o ícone com fundo colorido.
 */
export function Ilustracao({ imagem, Icone, tom }: { imagem: NomeIlustracao; Icone: LucideIcon; tom: 'verde' | 'azul' | 'rosa' | 'laranja' | 'ambar' }) {
  const [falhou, setFalhou] = useState(false)
  if (falhou)
    return (
      <div className={`illus2 tom-${tom}`} aria-hidden="true">
        <Icone strokeWidth={1.9} />
      </div>
    )
  return (
    <div className="illus3" aria-hidden="true">
      <img src={`/ilustracoes/${imagem}.webp`} alt="" width={192} height={192} decoding="async" draggable={false} onError={() => setFalhou(true)} />
    </div>
  )
}
