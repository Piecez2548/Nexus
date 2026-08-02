import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Account } from "../types";

export const accountRepository = createRepository<Account>(db.accounts, "accounts");
