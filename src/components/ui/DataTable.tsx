import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export type DataTableColumn<TItem> = {
  key: string
  header: string
  render: (item: TItem) => ReactNode
  align?: 'left' | 'right' | 'center'
}

type DataTableProps<TItem> = {
  columns: Array<DataTableColumn<TItem>>
  data: TItem[]
  getRowKey: (item: TItem) => string
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<TItem>({
  columns,
  data,
  getRowKey,
  emptyTitle = 'Sin registros',
  emptyDescription = 'No hay datos disponibles para mostrar.',
}: DataTableProps<TItem>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.align ? `align-${column.align}` : undefined} key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={getRowKey(item)}>
              {columns.map((column) => (
                <td className={column.align ? `align-${column.align}` : undefined} key={column.key}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
