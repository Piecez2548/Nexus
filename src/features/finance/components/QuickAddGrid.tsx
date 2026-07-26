import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { useTransactionTemplateStore } from "@/features/finance/store/transactionTemplateStore";
import { useUIStore } from "@/features/finance/store/uiStore";
import { getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import Drawer from "@/components/ui/Drawer";
import TransactionTemplateForm from "@/features/finance/components/TransactionTemplateForm";
import type { Transaction, TransactionTemplate } from "@/features/finance/types";

function templateToTransaction(template: TransactionTemplate): Transaction {
  return {
    title: template.name,
    amount: template.amount ?? 0,
    type: template.type,
    category: template.category,
    account: template.account,
    toAccount: template.toAccount,
    recipient: template.recipient,
    date: new Date().toISOString().slice(0, 10),
    status: "completed",
  };
}

export default function QuickAddGrid() {
  const { templates, loading, loadTemplates, deleteTemplate } = useTransactionTemplateStore();
  const { openTransactionDrawer } = useUIStore();
  const toast = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TransactionTemplate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function handleQuickAdd(template: TransactionTemplate) {
    openTransactionDrawer(templateToTransaction(template));
  }

  function handleAdd() {
    setSelectedTemplate(null);
    setIsFormOpen(true);
  }

  function handleEdit(template: TransactionTemplate) {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setSelectedTemplate(null);
  }

  async function handleDelete(template: TransactionTemplate) {
    if (template.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteTemplate(template.id);
      toast.success("ลบ Quick Add เรียบร้อย");
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quick Add</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            กดครั้งเดียวเพื่อเพิ่มรายการที่ใช้บ่อย
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <Plus size={16} />
          เพิ่ม
        </button>
      </div>

      {deleteError && <p className="mb-3 text-sm text-red-500">{deleteError}</p>}

      {loading && templates.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">กำลังโหลด...</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ยังไม่มี Quick Add — กด "เพิ่ม" เพื่อสร้างรายการที่ใช้บ่อย เช่น กาแฟ, ค่าเช่า, เงินเดือน
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {templates.map((template) => {
            const Icon = getIcon(template.icon ?? "zap");

            return (
              <div
                key={template.id}
                className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-2 pl-3 pr-2 transition hover:border-brand-500"
              >
                <button
                  type="button"
                  onClick={() => handleQuickAdd(template)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: template.color ?? "#8b5cf6" }}
                  >
                    <Icon size={13} />
                  </span>
                  <span className="text-sm font-medium">{template.name}</span>
                </button>

                <div className="ml-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(template)}
                    aria-label={`Edit quick add ${template.name}`}
                    className="rounded-full p-1 text-zinc-500 transition hover:bg-brand-600/20 hover:text-brand-400"
                  >
                    <Pencil size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(template)}
                    aria-label={`Delete quick add ${template.name}`}
                    className="rounded-full p-1 text-zinc-500 transition hover:bg-red-600/20 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer open={isFormOpen} onClose={handleCloseForm}>
        <TransactionTemplateForm template={selectedTemplate} onDone={handleCloseForm} />
      </Drawer>
    </div>
  );
}
