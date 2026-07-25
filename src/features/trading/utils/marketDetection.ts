import type { MarketType } from "@/features/trading/types";

const INDEX_PREFIXES = [
  "US30", "US500", "US100", "SPX500", "NAS100",
  "UK100", "DE30", "DE40", "GER40", "FRA40", "JPN225", "AUS200",
];

const COMMODITY_PREFIXES = ["XAU", "XAG", "XPT", "XPD", "WTI", "BRENT", "NATGAS", "UKOIL", "USOIL"];

const CRYPTO_PREFIXES = [
  "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "BNB", "LTC", "DOT", "MATIC", "AVAX", "LINK",
];

const FOREX_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNH", "SEK", "NOK", "SGD", "HKD",
];

// Rule-based symbol classifier — not real AI, just pattern matching against
// common broker symbol conventions. Returns null (leave the user's current
// choice alone) when the symbol doesn't match a known pattern.
export function detectMarketFromSymbol(rawSymbol: string): MarketType | null {
  const symbol = rawSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!symbol) return null;

  if (INDEX_PREFIXES.some((prefix) => symbol.startsWith(prefix))) return "indices";
  if (COMMODITY_PREFIXES.some((prefix) => symbol.startsWith(prefix))) return "cfd";
  if (CRYPTO_PREFIXES.some((prefix) => symbol.startsWith(prefix))) return "crypto";

  if (
    symbol.length === 6 &&
    FOREX_CURRENCIES.includes(symbol.slice(0, 3)) &&
    FOREX_CURRENCIES.includes(symbol.slice(3, 6))
  ) {
    return "forex";
  }

  return null;
}
