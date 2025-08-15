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
          <tr className="border-2 border-primary bg-transparent rounded-lg">
            {columns.map((column, index) => (
              <th
                key={column.key}
                className={`font-semibold text-main text-sm uppercase tracking-wide p-4 text-left
                  ${index === 0 ? 'rounded-l-lg' : ''}
                  ${index === columns.length - 1 ? 'rounded-r-lg' : ''}
                `}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
          {/* Gap between thead and tbody */}
          <tr className="border-2 border-primary bg-transparent rounded-lg">
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
                    className={`p-4 text-main
                      ${colIndex === 0 ? 'rounded-l-lg font-medium' : ''}
                      ${colIndex === columns.length - 1 ? 'rounded-r-lg' : ''}
                    `}
                  >
                    {column.key === 'avatar' ? (
                      <img src={row[column.key]} alt={row.name} className="w-8 h-8 rounded-full inline-block mr-2" />
                    ) : column.key === 'index' ? (
                      rowIndex + 1
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





