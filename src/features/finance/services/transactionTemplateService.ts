import { transactionTemplateRepository } from "@/features/finance/repositories/transactionTemplateRepository";
import { createCrudService } from "@/database/createCrudService";
import type { TransactionTemplate } from "../types";

export const transactionTemplateService = createCrudService<TransactionTemplate>(transactionTemplateRepository);
