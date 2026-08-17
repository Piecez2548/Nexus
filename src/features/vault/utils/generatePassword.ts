export interface GeneratePasswordOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}",
} as const;

// crypto.getRandomValues, not Math.random -- this generates real secrets.
export function generatePassword(options: GeneratePasswordOptions = {}): string {
  const { length = 20, uppercase = true, lowercase = true, numbers = true, symbols = true } = options;

  const parts: string[] = [];
  if (uppercase) parts.push(CHARSETS.uppercase);
  if (lowercase) parts.push(CHARSETS.lowercase);
  if (numbers) parts.push(CHARSETS.numbers);
  if (symbols) parts.push(CHARSETS.symbols);
  const alphabet = parts.join("");

  if (alphabet.length === 0) return "";

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[randomValues[i]! % alphabet.length];
  }
  return result;
}
