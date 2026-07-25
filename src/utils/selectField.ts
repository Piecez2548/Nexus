// Use as react-hook-form's `setValueAs` for optional <select> fields that
// render an empty "not selected" placeholder option (value=""). Zod's
// `.optional()` on an enum only treats `undefined` as absent — an empty
// string isn't a valid enum member, so it would otherwise fail validation
// even though the user simply left the field unset.
export function emptyToUndefined(value: string): string | undefined {
  return value === "" ? undefined : value;
}
