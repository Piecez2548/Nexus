import { holdingRepository } from "@/features/portfolio/repositories/holdingRepository";
import type { Holding } from "../types";

export const holdingService = {
  list: () => holdingRepository.getAll(),

  create: (holding: Holding) => holdingRepository.add(holding),

  update: (id: number, holding: Holding) =>
    holdingRepository.update(id, holding),

  remove: (id: number) => holdingRepository.remove(id),
};
