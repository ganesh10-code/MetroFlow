import React from 'react';

export interface ColDef<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => React.ReactNode;
}

interface TrainTableProps<T> {
  columns: ColDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
}

export function TrainTable<T>({ columns, rows, rowKey, emptyText = 'No data.' }: TrainTableProps<T>) {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr
            className="uppercase tracking-[0.15em] border-b text-left"
            style={{
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-background-surface)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-5 py-4 font-black transition-colors"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/30">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-text-muted font-medium italic"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row)}
                className="hover:bg-white/[0.02] transition-colors group"
                style={{
                  opacity: 1,
                  animationDelay: `${i * 20}ms`,
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-4 text-text-secondary font-medium group-hover:text-white transition-colors">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
