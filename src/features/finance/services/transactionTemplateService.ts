import { transactionTemplateRepository } from "@/features/finance/repositories/transactionTemplateRepository";
import type { TransactionTemplate } from "../types";

export const transactionTemplateService = {
  list: () => transactionTemplateRepository.getAll(),

  create: (template: TransactionTemplate) => transactionTemplateRepository.add(template),

  update: (id: number, template: TransactionTemplate) =>
    transactionTemplateRepository.update(id, template),

  remove: (id: number) => transactionTemplateRepository.remove(id),
};
