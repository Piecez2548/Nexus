// Approximate keyword matching against a transaction's category/title/
// recipient-alias text — there's no structured merchant-type field in this
// data model, so this is a heuristic, not a guarantee. Extend these lists
// as real-world category/title text turns up gaps.
export const BEHAVIOR_KEYWORDS = {
  eatingOut: ["restaurant", "dine", "eat out", "eating out", "ร้านอาหาร", "กินข้าวนอกบ้าน", "ร้านข้าว", "ทานข้าวนอกบ้าน"],
  coffee: ["coffee", "cafe", "café", "starbucks", "กาแฟ", "คาเฟ่"],
  convenienceStore: [
    "7-eleven",
    "seven eleven",
    "7-11",
    "711",
    "convenience",
    "familymart",
    "เซเว่น",
    "เซเว่นอีเลฟเว่น",
    "ร้านสะดวกซื้อ",
    "แฟมิลี่มาร์ท",
  ],
} as const satisfies Record<string, string[]>;

export type KeywordBehaviorFlagKey = keyof typeof BEHAVIOR_KEYWORDS;

// Kept as a separate export, deliberately outside BEHAVIOR_KEYWORDS —
// KeywordBehaviorFlagKey (derived from BEHAVIOR_KEYWORDS' own keys) drives
// BehaviorFlagCard's rendered grid, which is a fixed 5-tile layout. Adding a
// key here would force a 6th tile everywhere that type is used. This is a
// standalone matcher only the transport rule files import.
export const TRANSPORT_KEYWORDS = [
  "grab",
  "bolt",
  "taxi",
  "แท็กซี่",
  "วินมอเตอร์ไซค์",
  "bts",
  "mrt",
  "รถไฟฟ้า",
  "เบนซิน",
  "น้ำมัน",
  "gas station",
  "ปตท",
  "บางจาก",
  "เชลล์",
] as const;
