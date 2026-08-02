import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { TransactionTemplate } from "../types";

export const transactionTemplateRepository = createRepository<TransactionTemplate>(db.transactionTemplates, "transactionTemplates");
