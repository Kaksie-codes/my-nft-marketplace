import React from 'react';

interface TableColumn {
  key: string;
  header: string;
  width?: string;
}

interface TableRow {
  id: string;
  [key: string]: any;
}

interface TopCreatorsTableProps {
  columns: TableColumn[];
  data: TableRow[];
}

const TopCreatorsTable: React.FC<TopCreatorsTableProps> = ({ columns, data }) => {
  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <table className="w-full border-separate border-spacing-0">
        {/* Table Header */}
        <thead>
          <tr className="border-2 border-primary rounded-lg bg-surface">
            {columns.map((column, index) => (
              <th
                key={column.key}
                className={`font-semibold text-main text-sm uppercase tracking-wide p-4 text-center align-middle
                  ${index === 0 ? 'rounded-l-lg' : ''}
                  ${index === columns.length - 1 ? 'rounded-r-lg' : ''}
                `}
                style={column.width ? { width: column.width } : {}}
              >
                {column.header}
              </th>
            ))}
          </tr>
          {/* Gap between thead and tbody */}
          <tr>
            <td colSpan={columns.length} className="h-4"></td>
          </tr>
        </thead>
        {/* Table Body */}
        <tbody className="space-y-3">
          {data.map((row, rowIndex) => (
            <React.Fragment key={row.id}>
              <tr className="bg-surface border border-primary rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key}
                    className={`p-4 text-main text-center align-middle
                      ${colIndex === 0 ? 'rounded-l-lg font-medium' : ''}
                      ${colIndex === columns.length - 1 ? 'rounded-r-lg' : ''}
                    `}
                    style={column.width ? { width: column.width } : {}}
                  >
                    {column.key === 'artist' ? (
                      <div className="flex items-center gap-3 justify-center">
                        <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-full" />
                        <span className="font-medium">{row.name}</span>
                      </div>
                    ) : column.key === 'change' ? (
                      <span className={
                        row.change > 0
                          ? 'text-green-600 font-bold'
                          : row.change < 0
                          ? 'text-red-600 font-bold'
                          : 'text-gray-500 font-bold'
                      }>
                        {row.change > 0 ? `+${row.change}` : row.change}
                      </span>
                    ) : column.key === 'index' ? (
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-background font-bold mx-auto">{rowIndex + 1}</div>
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
              </tr>
              {/* Gap between rows */}
              {rowIndex < data.length - 1 && (
                <tr>
                  <td colSpan={columns.length} className="h-3"></td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopCreatorsTable;





