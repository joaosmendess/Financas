// Cartão de crédito com giro 3D, adaptado do "Card-15 – Credit Card" do Shadcn Space
// (https://github.com/shadcnspace/shadcnspace, commit cb1197f).
//
// MIT License — Copyright (c) 2026 Shadcn Space
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
// following conditions: The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
// LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
// THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// Mudanças: visual Itaú do protótipo; o "saldo" virou o valor da fatura (escondido por padrão); o verso
// mostra fatura, minha parte e dos outros; botão próprio para virar (o original aninhava um botão dentro
// de um role=button); tamanho fluido por container query; respeita prefers-reduced-motion.
import { Eye, EyeOff, RotateCw, Wifi } from 'lucide-react'
import { useState } from 'react'
import { formatar } from '@/domain/dinheiro'
import { cn } from '@/lib/cn'

const OCULTO = '••••••'

function Chip() {
  return (
    <svg viewBox="0 0 44 34" className="cc3-chip" aria-hidden="true">
      <rect width="44" height="34" rx="5" fill="#E9C46A" />
      <rect x="14" width="16" height="34" fill="#D9AE4E" />
      <rect y="11" width="44" height="12" fill="#D9AE4E" />
      <rect x="14" y="11" width="16" height="12" fill="#F3D98C" />
      <path d="M14 0v11M30 0v11M14 23v11M30 23v11M0 11h14M0 23h14M30 11h14M30 23h14" stroke="#A9832F" strokeWidth=".6" />
    </svg>
  )
}

function Bandeira() {
  return (
    <span className="cc3-bandeira" aria-label="Mastercard" role="img">
      <i style={{ background: 'rgba(235,0,27,.92)' }} />
      <i style={{ background: 'rgba(247,158,27,.92)', marginLeft: '-0.42em' }} />
    </span>
  )
}

export interface CartaoCreditoProps {
  /** Ex.: "Itaú Platinum" — a 1ª palavra vira o logo, o resto a categoria. */
  nome: string
  titular: string
  aberta: boolean
  /** 'DD/MM' */
  fecha: string
  vence: string
  /** Rótulo do mês, ex.: "dezembro" */
  mes: string
  fatura: number
  minhaParte: number
  dosOutros: number
  className?: string
}

export function CartaoCredito(p: CartaoCreditoProps) {
  const [virado, setVirado] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const [logo, ...resto] = p.nome.trim().split(/\s+/)
  const categoria = (resto.join(' ') || 'Platinum').toUpperCase()
  const valor = (c: number) => (mostrar ? formatar(c) : OCULTO)

  return (
    <div className={cn('cc3', p.className)}>
      <div className={cn('cc3-giro', virado && 'virado')}>
        {/* ── FRENTE ── */}
        <div className="cc3-face cc3-frente" aria-hidden={virado} onClick={() => setVirado(true)}>
          <div className="cc3-brilho" />
          <div className="cc3-linha">
            <span className="logo">{(logo ?? 'itaú').toLowerCase()}</span>
            <div className="cc3-valor">
              <small>Fatura · {p.aberta ? 'aberta' : 'fechada'}</small>
              <span className="num">
                <b>{valor(p.fatura)}</b>
                <button
                  type="button"
                  className="cc3-olho"
                  aria-label={mostrar ? 'Esconder valores' : 'Mostrar valores'}
                  aria-pressed={mostrar}
                  tabIndex={virado ? -1 : 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMostrar((m) => !m)
                  }}
                >
                  {mostrar ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </div>
          </div>
          <div className="cc3-linha cc3-meio">
            <Chip />
            <span className="cc3-tier">{categoria}</span>
            <Wifi className="cc3-nfc" aria-hidden="true" />
          </div>
          <div className="cc3-linha cc3-rodape">
            <div className="min-w-0">
              <small>Titular</small>
              <b className="truncate block">{p.titular.toUpperCase()}</b>
            </div>
            <div>
              <small>Fecha · Vence</small>
              <b className="num">{p.fecha} · {p.vence}</b>
            </div>
            <Bandeira />
          </div>
        </div>

        {/* ── VERSO ── */}
        <div className="cc3-face cc3-verso" aria-hidden={!virado} onClick={() => setVirado(false)}>
          <div className="cc3-tarja" />
          <div className="cc3-verso-conteudo">
            <div className="cc3-assinatura">
              <span>
                {Array.from({ length: 22 }).map((_, i) => (
                  <i key={i} />
                ))}
              </span>
              <div>
                <small>Minha parte</small>
                <b className="num">{valor(p.minhaParte)}</b>
              </div>
            </div>
            <div className="cc3-linha">
              <div>
                <small>Fatura de {p.mes}</small>
                <b className="num">{valor(p.fatura)}</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small>Compras dos outros</small>
                <b className="num">{valor(p.dosOutros)}</b>
              </div>
            </div>
            <small className="cc3-nota">
              Fecha dia {p.fecha.slice(0, 2)} · vence dia {p.vence.slice(0, 2)}. Toque para voltar.
            </small>
          </div>
        </div>
      </div>
      <button type="button" className="cc3-virar" aria-label={virado ? 'Mostrar a frente do cartão' : 'Virar o cartão'} onClick={() => setVirado((v) => !v)}>
        <RotateCw />
      </button>
    </div>
  )
}
