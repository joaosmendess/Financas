/** Blocos com brilho passando enquanto os dados carregam. */
export function Esqueleto({ cards = 3 }: { cards?: number }) {
  return (
    <div className="esqueleto" role="status" aria-label="Carregando">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card">
          <i style={{ width: '32%' }} />
          <i className="alto" style={{ width: '56%' }} />
          <i style={{ width: '88%' }} />
          <i style={{ width: '72%' }} />
        </div>
      ))}
    </div>
  )
}
