import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import ChartDataTable from "./ChartDataTable";

describe("ChartDataTable", () => {
  it("exposes the chart's data as an accessible table with row/column headers", () => {
    render(
      <ChartDataTable
        caption="Monthly income, expense, and savings"
        columns={["Month", "Income", "Expense", "Saving"]}
        rows={[
          ["2026-06", "฿30,000", "฿20,000", "฿10,000"],
          ["2026-07", "฿32,000", "฿25,000", "฿7,000"],
        ]}
      />
    );

    const table = screen.getByRole("table", { name: "Monthly income, expense, and savings" });
    expect(within(table).getByRole("columnheader", { name: "Month" })).toBeInTheDocument();
    // The first cell of each row is a row header (scope="row").
    expect(within(table).getByRole("rowheader", { name: "2026-07" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "฿25,000" })).toBeInTheDocument();
  });
});
