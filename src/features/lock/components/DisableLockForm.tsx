import { useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";
import { useAppLockStore } from "@/store/appLockStore";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  onDone: () => void;
}

export default function DisableLockForm({ onDone }: Props) {
  const { disableLock } = useAppLockStore();
  const toast = useToast();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    setSubmitting(true);
    const success = await disableLock(pin);
    setSubmitting(false);

    if (!success) {
      setError("PIN ไม่ถูกต้อง");
      return;
    }

    toast.success("ปิดการใช้งาน App Lock แล้ว");
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">ปิดการใช้งาน App Lock</h2>

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        การปิด App Lock จะทำให้ทุกคนที่เข้าถึงอุปกรณ์นี้เปิดแอปได้โดยไม่ต้องใส่ PIN
      </p>

      <FormField label="กรอก PIN เพื่อยืนยัน" htmlFor="disable-lock-pin">
        <input
          id="disable-lock-pin"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-semibold text-red-500 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังดำเนินการ..." : "ปิดการใช้งาน App Lock"}
      </button>
    </form>
  );
}
