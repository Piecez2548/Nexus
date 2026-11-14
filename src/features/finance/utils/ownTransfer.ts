// A transfer slip whose payee is the payer themself (money moved between the
// person's own accounts) is not spending. Thai banking apps print both names
// on the slip, K PLUS shortening the payer to a first name and an initial
// ("นาย สมชาย ใ"). OCR misreads a character here and there on both, so first
// names count as equal within a small edit distance. The result only sets the
// transaction type on a candidate the person still reviews before import.

const TITLE = /^(?:นางสาว|นาง|นาย|น\.ส\.|mrs\.?|mr\.?|ms\.?|miss)\s*/i;
const PERSON_TITLE = /^(?:นางสาว|นาง|นาย|น\.ส\.|mrs\.?|mr\.?|ms\.?|miss)(?:\s|$)/i;

function nameTokens(name: string): string[] {
  return name.replace(TITLE, "").trim().split(/\s+/).filter(Boolean);
}

function letterCount(text: string): number {
  return text.replace(/[^\p{L}]/gu, "").length;
}

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j]!;
      prev[j] = Math.min(above + 1, prev[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length]!;
}

// True when both names are people (a title or a first name plus surname) and
// their first names match, allowing one misread character in a name of 5+
// code points (two in 9+).
export function isOwnAccountTransfer(payer: string | undefined, payee: string | undefined): boolean {
  if (!payer || !payee) return false;
  const payerTokens = nameTokens(payer);
  const payeeTokens = nameTokens(payee);
  const payerFirst = payerTokens[0];
  const payeeFirst = payeeTokens[0];
  if (!payerFirst || !payeeFirst) return false;
  if (letterCount(payerFirst) < 3 || letterCount(payeeFirst) < 3) return false;
  const looksLikePerson = (name: string, tokens: string[]) => PERSON_TITLE.test(name.trim()) || tokens.length >= 2;
  if (!looksLikePerson(payer, payerTokens) || !looksLikePerson(payee, payeeTokens)) return false;

  const a = payerFirst.toLowerCase();
  const b = payeeFirst.toLowerCase();
  const longest = Math.max(a.length, b.length);
  const allowed = longest >= 9 ? 2 : longest >= 5 ? 1 : 0;
  return editDistance(a, b) <= allowed;
}
