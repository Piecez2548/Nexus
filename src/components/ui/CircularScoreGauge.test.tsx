import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CircularScoreGauge from "./CircularScoreGauge";

describe("CircularScoreGauge", () => {
  it("shows the rounded score and an accessible label", () => {
    render(<CircularScoreGauge score={73.6} />);
    expect(screen.getByText("74")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "74 / 100" })).toBeInTheDocument();
  });

  it("shows a dash and an N/A label when the score is null", () => {
    render(<CircularScoreGauge score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "N/A" })).toBeInTheDocument();
  });

  it("renders an optional label under the score", () => {
    render(<CircularScoreGauge score={90} label="/ 100" />);
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });
});
