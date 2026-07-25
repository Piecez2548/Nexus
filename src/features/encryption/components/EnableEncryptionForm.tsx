import { useState, type FormEvent } from "react";

import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { enableEncryption, type MigrationProgress } from "@/features/encryption/migration/enableEncryption";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

interface Props {
  onDone: () => void;
}

const PHASE_LABEL: Record<MigrationProgress["phase"], string> = {
  backup: "กำลังสำรองข้อมูลก่อนเข้ารหัส...",
  escrow: "กำลังฝากกุญแจกู้คืนไว้กับบัญชี Sync...",
  encrypting: "กำลังเข้ารหัสข้อมูล...",
  verifying: "กำลังตรวจสอบความถูกต้อง...",
  done: "เสร็จสิ้น",
};

export default function EnableEncryptionForm({ onDone }: Props) {
  const toast = useToast();

  const [pin, setPin] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError("กรอก PIN ของคุณ");
      return;
    }
    if (accountPassword.length === 0) {
      setError("กรอกรหัสผ่านบัญชี Sync ของคุณ");
      return;
    }

    setSubmitting(true);
    try {
      await enableEncryption({ pin, accountPassword, onProgress: setProgress });
      toast.success("เปิดใช้งานการเข้ารหัสเรียบร้อย");
      onDone();
    } catch (err) {
      setSubmitting(false);
      setProgress(null);
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างเข้ารหัส ลองอีกครั้ง");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">เปิดใช้งานการเข้ารหัสข้อมูล</h2>

      <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
        <p>ระบบจะดาวน์โหลดไฟล์สำรองข้อมูล (ยังไม่เข้ารหัส) ให้อัตโนมัติก่อนเริ่ม เก็บไฟล์นี้ไว้ในที่ปลอดภัย</p>
        <p>
          หลังเปิดใช้งานแล้ว อุปกรณ์อื่นที่ล็อกอินด้วยบัญชีเดียวกันแต่ยังใช้แอปเวอร์ชันเก่า
          จะไม่สามารถอ่านข้อมูลที่ซิงค์มาได้ จนกว่าจะอัปเดตเป็นเวอร์ชันที่รองรับการเข้ารหัส
        </p>
      </div>

      <FormField label="PIN ปัจจุบันของคุณ" htmlFor="enable-encryption-pin">
        <input
          id="enable-encryption-pin"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={submitting}
          className={inputClassName}
        />
      </FormField>

      <FormField label="ยืนยันรหัสผ่านบัญชี Sync" htmlFor="enable-encryption-password">
        <input
          id="enable-encryption-password"
          type="password"
          value={accountPassword}
          onChange={(e) => setAccountPassword(e.target.value)}
          disabled={submitting}
          className={inputClassName}
        />
      </FormField>

      {progress && (
        <p className="text-sm text-violet-500">
          {PHASE_LABEL[progress.phase]}
          {progress.phase === "encrypting" && progress.tableCount !== undefined && (
            <>
              {" "}
              ({(progress.tableIndex ?? 0) + 1}/{progress.tableCount})
            </>
          )}
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังเข้ารหัส..." : "เริ่มเข้ารหัสข้อมูล"}
      </button>
    </form>
  );
}
