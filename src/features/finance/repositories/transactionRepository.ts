import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Transaction } from "../types";

export const transactionRepository = createRepository<Transaction>(db.transactions, "transactions");
