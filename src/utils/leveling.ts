const XP_PER_LEVEL = 100;

export function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export interface XpProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  percentage: number;
}

export function getXpProgress(xp: number): XpProgress {
  const level = getLevel(xp);
  const xpIntoLevel = xp % XP_PER_LEVEL;

  return {
    level,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    percentage: (xpIntoLevel / XP_PER_LEVEL) * 100,
  };
}
