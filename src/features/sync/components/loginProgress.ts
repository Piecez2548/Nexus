// Presentation-only helpers for the login seal and strength meter. They never
// decide whether a form may be submitted; the browser and Supabase still do.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function signInProgress(email: string, password: string): number {
  return (EMAIL_PATTERN.test(email) ? 0.5 : 0) + (password.length >= 6 ? 0.5 : 0);
}

export function signUpProgress(firstName: string, lastName: string, email: string, password: string): number {
  const named = firstName.trim() !== "" && lastName.trim() !== "";
  return (named ? 0.25 : 0) + (EMAIL_PATTERN.test(email) ? 0.25 : 0) + (password.length >= 8 ? 0.5 : 0);
}

/** 0 for an empty password, otherwise 1..4. */
export function passwordScore(password: string): number {
  if (!password) return 0;
  const rules = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  return Math.max(1, rules.filter(Boolean).length);
}
