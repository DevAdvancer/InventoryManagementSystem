// Minimal data table with a "loading" state and an "empty" placeholder.

function DataTable({ columns, rows, loading, emptyMessage = "No records yet" }) {
  if (loading) {
    return <div className="table-state">Loading…</div>;
  }
  if (!rows || rows.length === 0) {
    return <div className="table-state">{emptyMessage}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.headerStyle || {}}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((c) => (
                <td key={c.key} style={c.cellStyle || {}}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
