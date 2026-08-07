import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ChartFigure from "./ChartFigure";

describe("ChartFigure", () => {
  it("exposes its children as a single labelled image to assistive technology", () => {
    render(
      <ChartFigure label="Bar chart of weekly spending across 6 weeks">
        <svg data-testid="chart" />
      </ChartFigure>
    );

    const figure = screen.getByRole("img", { name: "Bar chart of weekly spending across 6 weeks" });
    expect(figure).toBeInTheDocument();
    // The decorative chart internals stay rendered inside the labelled node.
    expect(figure).toContainElement(screen.getByTestId("chart"));
  });
});
