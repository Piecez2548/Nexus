import { describe, expect, it } from "vitest";
import { computeRouteDistanceMeters } from "./distance";

describe("computeRouteDistanceMeters", () => {
  it("returns 0 for an empty route", () => {
    expect(computeRouteDistanceMeters([])).toBe(0);
  });

  it("returns 0 for a single-point route (nothing to sum yet)", () => {
    expect(computeRouteDistanceMeters([{ lat: 13.75, lng: 100.5, t: 0 }])).toBe(0);
  });

  it("returns 0 when consecutive points are identical (no movement)", () => {
    const point = { lat: 13.75, lng: 100.5, t: 0 };
    expect(computeRouteDistanceMeters([point, { ...point, t: 1000 }])).toBe(0);
  });

  it("computes a known real-world distance within a reasonable tolerance", () => {
    // Bangkok's Democracy Monument to Wat Suthat -- roughly 1.5km apart by
    // straight-line (great-circle) distance.
    const democracyMonument = { lat: 13.7567, lng: 100.5019, t: 0 };
    const watSuthat = { lat: 13.7524, lng: 100.5017, t: 60_000 };

    const distance = computeRouteDistanceMeters([democracyMonument, watSuthat]);

    expect(distance).toBeGreaterThan(400);
    expect(distance).toBeLessThan(600);
  });

  it("sums consecutive segments across a multi-point route rather than measuring start-to-end", () => {
    // An out-and-back path: A -> B -> A should sum to roughly double the
    // single A->B leg, not collapse to ~0 (which a naive start-vs-end
    // distance calculation would wrongly produce).
    const a = { lat: 13.75, lng: 100.5, t: 0 };
    const b = { lat: 13.76, lng: 100.5, t: 1000 };

    const oneLeg = computeRouteDistanceMeters([a, b]);
    const outAndBack = computeRouteDistanceMeters([a, b, a]);

    expect(outAndBack).toBeCloseTo(oneLeg * 2, 0);
  });
});
