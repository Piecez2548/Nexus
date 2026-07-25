import { tradeRepository } from "@/features/trading/repositories/tradeRepository";
import type { Trade } from "../types";

export const tradeService = {
  list: () => tradeRepository.getAll(),

  create: (trade: Trade) => tradeRepository.add(trade),

  update: (id: number, trade: Trade) =>
    tradeRepository.update(id, trade),

  remove: (id: number) => tradeRepository.remove(id),
};
