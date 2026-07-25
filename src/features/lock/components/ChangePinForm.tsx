import { useState, type FormEvent } from "react";
import { useAppLockStore } from "@/store/appLockStore";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

interface Props {
  onDone: () => void;
}

export default function ChangePinForm({ onDone }: Props) {
  const { changePin } = useAppLockStore();
  const toast = useToast();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPin.length < 4) {
      setError("PIN ใหม่ต้องมีอย่างน้อย 4 หลัก");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PIN ใหม่ไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    const success = await changePin(currentPin, newPin);
    setSubmitting(false);

    if (!success) {
      setError("PIN ปัจจุบันไม่ถูกต้อง");
      return;
    }

    toast.success("เปลี่ยน PIN เรียบร้อย");
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">เปลี่ยน PIN</h2>

      <FormField label="PIN ปัจจุบัน" htmlFor="change-pin-current">
        <input
          id="change-pin-current"
          type="password"
          inputMode="numeric"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="PIN ใหม่" htmlFor="change-pin-new">
        <input
          id="change-pin-new"
          type="password"
          inputMode="numeric"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="ยืนยัน PIN ใหม่" htmlFor="change-pin-confirm">
        <input
          id="change-pin-confirm"
          type="password"
          inputMode="numeric"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
