// Trivial but real, per the spec's explicit "Estimated Annual Savings"
// output field — every rule already produces estimatedMonthlySavings, this
// just extrapolates it across a year.
export function estimateAnnualSavings(estimatedMonthlySavings: number): number {
  return estimatedMonthlySavings * 12;
}
