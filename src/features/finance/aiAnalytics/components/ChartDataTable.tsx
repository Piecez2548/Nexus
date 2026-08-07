interface Props {
  /** Describes the table for assistive tech — reuse the chart's own summary. */
  caption: string;
  /** Column headers, left to right. The first column is treated as each row's header. */
  columns: string[];
  /** One array of cells per row, aligned to `columns`. */
  rows: (string | number)[][];
}

// A visually-hidden (`sr-only`) data table that accompanies a chart, giving
// screen-reader users the underlying numbers the chart shows visually — the
// per-point detail a `role="img"` + `aria-label` summary can't convey, and
// which Recharts' mouse-only tooltip never exposes to the keyboard. Rendered
// as a sibling of (never inside) ChartFigure, whose `role="img"` would
// otherwise hide this table from assistive tech. `sr-only` is
// position:absolute, so it adds no visible box and never shifts layout.
export default function ChartDataTable({ caption, columns, rows }: Props) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column, i) => (
            <th key={i} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) =>
              c === 0 ? (
                <th key={c} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={c}>{cell}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
