// Use as react-hook-form's `setValueAs` for optional numeric inputs.
// An empty field must resolve to `undefined` (absent), not NaN — zod's
// `.optional()` only treats `undefined` as absent, so `Number("")` (which
// is 0) or an empty number input's `valueAsNumber` (which is NaN) would
// otherwise fail validation silently for a field the user never touched.
export function numberOrUndefined(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}
