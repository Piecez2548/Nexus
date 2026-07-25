import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import type { Transaction } from "@/features/finance/types";

export const transactionService = {
  list: () => transactionRepository.getAll(),

  create: (transaction: Transaction) =>
    transactionRepository.add(transaction),

  update: (id: number, transaction: Transaction) =>
    transactionRepository.update(id, transaction),

  remove: (id: number) => transactionRepository.remove(id),
};
