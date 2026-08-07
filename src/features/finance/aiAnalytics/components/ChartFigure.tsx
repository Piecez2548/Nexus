import type { ReactNode } from "react";

interface Props {
  /**
   * Accessible name announced by assistive technology in place of the
   * chart's decorative internals. Should be one concise, data-driven
   * sentence (e.g. "Bar chart of weekly spending across 6 weeks").
   */
  label: string;
  children: ReactNode;
}

// Wraps a chart — a Recharts SVG or a CSS-grid visualization — so screen
// readers announce it as a single labelled image instead of walking its
// meaningless internal nodes (unlabeled <path>/<rect> elements, hover-only
// tooltips). `role="img"` + `aria-label` is the WAI-ARIA pattern for a
// complex graphic that has one text alternative. The wrapper is a plain
// transparent block, so it adds no visual box and does not change layout;
// it must not carry an explicit height, so charts sized with
// height="100%" (which measure this element) are wrapped elsewhere or left
// as-is instead.
export default function ChartFigure({ label, children }: Props) {
  return (
    <div role="img" aria-label={label}>
      {children}
    </div>
  );
}
