// Command Palette core (PLT-018): the command model + fuzzy search. Pure and
// testable; the React component and global Ctrl+K wiring build on this.

export interface Command {
  id: string;
  title: string;
  keywords?: string[];
  group?: string;
  run: () => void;
}

// Subsequence fuzzy score: returns null when `query` isn't a subsequence of
// `text`, otherwise a score that rewards consecutive matches. Case-insensitive.
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (q === "") return 0;

  let qi = 0;
  let score = 0;
  let lastIndex = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastIndex === ti - 1 ? 2 : 1; // consecutive-match bonus
      lastIndex = ti;
      qi += 1;
    }
  }
  return qi === q.length ? score : null;
}

// Filter + rank commands against a query (matches title or keywords). Empty
// query returns all commands unchanged.
export function filterCommands(commands: Command[], query: string): Command[] {
  if (query.trim() === "") return commands;

  const scored: Array<{ command: Command; score: number }> = [];
  for (const command of commands) {
    const haystacks = [command.title, ...(command.keywords ?? [])];
    let best: number | null = null;
    for (const h of haystacks) {
      const s = fuzzyScore(query, h);
      if (s !== null && (best === null || s > best)) best = s;
    }
    if (best !== null) scored.push({ command, score: best });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.command);
}
