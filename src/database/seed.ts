import { db } from "./db";

export async function seedDatabase() {
  const accountCount = await db.accounts.count();

  if (accountCount === 0) {
    await db.accounts.bulkAdd([
      {
        name: "Cash",
        type: "cash",
        icon: "wallet",
        color: "#16a34a",
      },
      {
        name: "Bank",
        type: "bank",
        icon: "landmark",
        color: "#2563eb",
      },
    ]);
  }

  const categoryCount =
    await db.categories.count();

  if (categoryCount === 0) {
    await db.categories.bulkAdd([
      { name: "Salary", type: "income", icon: "briefcase", color: "#16a34a" },
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Transport", type: "expense", icon: "car", color: "#3b82f6" },
      { name: "Shopping", type: "expense", icon: "shopping-bag", color: "#ec4899" },
      { name: "Investment", type: "expense", icon: "trending-up", color: "#0891b2" },
      { name: "Education", type: "expense", icon: "graduation-cap", color: "#7c3aed" },
      { name: "Health", type: "expense", icon: "heart-pulse", color: "#dc2626" },
      { name: "Entertainment", type: "expense", icon: "film", color: "#f59e0b" },
      { name: "Utilities", type: "expense", icon: "zap", color: "#eab308" },
      { name: "Travel", type: "expense", icon: "plane", color: "#14b8a6" },
      { name: "Insurance", type: "expense", icon: "shield", color: "#64748b" },
      { name: "Others", type: "expense", icon: "more-horizontal", color: "#71717a" },
    ]);
  }

  const merchantCount = await db.merchants.count();

  if (merchantCount === 0) {
    await db.merchants.bulkAdd([
      { name: "Starbucks", category: "Food", icon: "utensils" },
      { name: "MK", category: "Food", icon: "utensils" },
      { name: "7-Eleven", category: "Food", icon: "utensils" },
      { name: "Shopee", category: "Shopping", icon: "shopping-bag" },
      { name: "Lazada", category: "Shopping", icon: "shopping-bag" },
      { name: "Netflix", category: "Entertainment", icon: "film" },
      { name: "Spotify", category: "Entertainment", icon: "film" },
      { name: "Grab", category: "Transport", icon: "car" },
      { name: "BTS", category: "Transport", icon: "car" },
    ]);
  }
}
