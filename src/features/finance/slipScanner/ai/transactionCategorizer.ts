// AI Transaction Categorization (GS-043): guess a category for a slip-derived
// transaction from its merchant/title text, with learned user corrections
// taking precedence. Deterministic keyword rules (Thai + English) — the app's
// local "AI"; corrections are stored locally (GS-045 learning), no cloud.

export type SlipCategory =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Education"
  | "Healthcare"
  | "Entertainment"
  | "Salary"
  | "Investment"
  | "Others";

export interface CategoryGuess {
  category: SlipCategory;
  confidence: number; // 0–1
  source: "learned" | "keyword" | "default";
}

// Ordered most-specific-first; the first category with a keyword hit wins.
const KEYWORDS: Array<{ category: SlipCategory; words: string[] }> = [
  { category: "Salary", words: ["เงินเดือน", "ค่าจ้าง", "salary", "payroll", "wage"] },
  { category: "Investment", words: ["หุ้น", "กองทุน", "ลงทุน", "stock", "fund", "invest", "crypto", "bitcoin"] },
  { category: "Bills", words: ["ค่าไฟ", "ค่าน้ำ", "ค่าไฟฟ้า", "ค่าโทรศัพท์", "ค่าเน็ต", "electric", "water", "bill", "internet", "true", "ais", "dtac"] },
  { category: "Transport", words: ["แท็กซี่", "รถไฟ", "รถเมล์", "น้ำมัน", "ปตท", "bts", "mrt", "grab", "taxi", "ptt", "fuel", "bus"] },
  { category: "Healthcare", words: ["โรงพยาบาล", "คลินิก", "ยา", "หมอ", "hospital", "clinic", "pharmacy", "doctor", "health"] },
  { category: "Education", words: ["โรงเรียน", "มหาวิทยาลัย", "เรียน", "หนังสือ", "course", "school", "tuition", "education", "book"] },
  { category: "Entertainment", words: ["หนัง", "เกม", "คาราโอเกะ", "movie", "netflix", "spotify", "game", "cinema", "ktv"] },
  { category: "Food", words: ["กาแฟ", "ข้าว", "อาหาร", "ร้านอาหาร", "ก๋วยเตี๋ยว", "พิซซ่า", "coffee", "food", "restaurant", "cafe", "pizza", "starbucks"] },
  { category: "Shopping", words: ["ช้อป", "ห้าง", "เซเว่น", "shopee", "lazada", "central", "mall", "shopping", "seven", "7-11"] },
];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function categorize(text: string, learned?: Map<string, SlipCategory>): CategoryGuess {
  const key = normalize(text);
  if (key === "") return { category: "Others", confidence: 0.2, source: "default" };

  const learnedHit = learned?.get(key);
  if (learnedHit) return { category: learnedHit, confidence: 1, source: "learned" };

  for (const { category, words } of KEYWORDS) {
    if (words.some((word) => key.includes(word))) {
      return { category, confidence: 0.7, source: "keyword" };
    }
  }

  return { category: "Others", confidence: 0.2, source: "default" };
}

// Normalise a merchant/title into the key used for learned corrections.
export function categoryLearningKey(text: string): string {
  return normalize(text);
}
