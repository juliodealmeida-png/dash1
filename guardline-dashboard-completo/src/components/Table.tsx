import './table.css'

export function Table({
  columns,
  rows,
  onRowClick,
}: {
  columns: Array<{ key: string; label: string; render?: (row: any) => React.ReactNode }>
  rows: any[]
  onRowClick?: (row: any) => void
}) {
  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r?.id ?? idx} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'clickable' : ''}>
              {columns.map(c => (
                <td key={c.key}>{c.render ? c.render(r) : String(r?.[c.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

