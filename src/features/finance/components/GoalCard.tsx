import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import { useGoalStore } from "@/features/finance/store/goalStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Goal } from "@/features/finance/types";

interface Props {
  goal: Goal;
  onEdit: () => void;
}

export default function GoalCard({ goal, onEdit }: Props) {
  const { deleteGoal, contribute } = useGoalStore();
  const [contributeAmount, setContributeAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const percentage = goal.targetAmount > 0
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    : 0;
  const isComplete = goal.currentAmount >= goal.targetAmount;

  async function handleDelete() {
    if (goal.id === undefined) return;

    try {
      setError(null);
      await deleteGoal(goal.id);
      toast.success("ลบเป้าหมายเรียบร้อย");
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  }

  async function handleContribute() {
    const amount = Number(contributeAmount);
    if (goal.id === undefined || !amount || amount <= 0) return;

    try {
      setError(null);
      await contribute(goal.id, amount);
      setContributeAmount("");

      const newAmount = goal.currentAmount + amount;
      toast.success(
        newAmount >= goal.targetAmount
          ? `🎉 บรรลุเป้าหมาย "${goal.name}" แล้ว!`
          : "เพิ่มเงินออมเรียบร้อย"
      );
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{goal.name}</h3>
          {goal.deadline && (
            <p className="text-sm text-zinc-600 dark:text-zinc-500">
              ครบกำหนด {new Date(goal.deadline).toLocaleDateString("th-TH")}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label={`Edit ${goal.name}`}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={handleDelete}
            aria-label={`Delete ${goal.name}`}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <ProgressBar percentage={percentage} colorClass={isComplete ? "bg-green-500" : "bg-brand-600"} />

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">
          ฿{goal.currentAmount.toLocaleString()} / ฿{goal.targetAmount.toLocaleString()}
        </span>
        <span className={isComplete ? "text-green-400" : "text-zinc-600 dark:text-zinc-500"}>
          {isComplete ? "สำเร็จแล้ว 🎉" : `${percentage.toFixed(0)}%`}
        </span>
      </div>

      {!isComplete && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={contributeAmount}
            onChange={(e) => setContributeAmount(e.target.value)}
            placeholder="เพิ่มเงินออม"
            aria-label={`Contribute to ${goal.name}`}
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            onClick={handleContribute}
            aria-label={`Add contribution to ${goal.name}`}
            className="flex items-center gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <Plus size={14} />
            เพิ่ม
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
