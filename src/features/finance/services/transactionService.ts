import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Transaction } from "@/features/finance/types";

export const transactionService = createCrudService<Transaction>(transactionRepository);
