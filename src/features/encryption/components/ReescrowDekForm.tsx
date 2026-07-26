import { useState, type FormEvent } from "react";

import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { reescrowDek, ReescrowFailedError } from "@/features/encryption/migration/reescrowDek";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  onDone: () => void;
}

export default function ReescrowDekForm({ onDone }: Props) {
  const toast = useToast();

  const [accountPassword, setAccountPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (accountPassword.length === 0) {
      setError("กรอกรหัสผ่านบัญชี Sync ของคุณ");
      return;
    }

    setSubmitting(true);
    try {
      await reescrowDek(accountPassword);
      toast.success("อัปเดตกุญแจสำรองเรียบร้อย");
      onDone();
    } catch (err) {
      setError(err instanceof ReescrowFailedError ? err.message : "เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">อัปเดตกุญแจสำรอง</h2>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        ใช้เมื่ออุปกรณ์อื่นกู้คืนกุญแจเข้ารหัสด้วยรหัสผ่านบัญชี Sync ไม่สำเร็จ — อุปกรณ์นี้ปลดล็อกอยู่และมีกุญแจที่ถูกต้องอยู่แล้ว
        ยืนยันรหัสผ่านบัญชี Sync ปัจจุบันเพื่อฝากกุญแจสำรองชุดใหม่แทนของเดิม
      </p>

      <FormField label="รหัสผ่านบัญชี Sync ปัจจุบัน" htmlFor="reescrow-password">
        <input
          id="reescrow-password"
          type="password"
          value={accountPassword}
          onChange={(e) => setAccountPassword(e.target.value)}
          disabled={submitting}
          className={inputClassName}
        />
      </FormField>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังอัปเดต..." : "อัปเดตกุญแจสำรอง"}
      </button>
    </form>
  );
}
