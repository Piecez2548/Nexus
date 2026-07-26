import { useState, type FormEvent } from "react";
import { Lock, Zap } from "lucide-react";

import { useAppLockStore, EncryptionStateCorruptedError } from "@/store/appLockStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import EncryptionRecoveryFlow from "@/features/encryption/components/EncryptionRecoveryFlow";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-center text-lg tracking-[0.5em] outline-none focus:border-brand-500";

interface Props {
  mode: "setup" | "unlock";
  onDone?: () => void;
}

export default function AppLockScreen({ mode, onDone }: Props) {
  const { setupPin, unlock, encryptionEnabled } = useAppLockStore();

  const [showRecovery, setShowRecovery] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canRecover = mode === "unlock" && isSyncConfigured && encryptionEnabled;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError("PIN ต้องมีอย่างน้อย 4 หลัก");
      return;
    }

    if (mode === "setup") {
      if (pin !== confirmPin) {
        setError("PIN ไม่ตรงกัน กรุณายืนยันอีกครั้ง");
        return;
      }

      setSubmitting(true);
      await setupPin(pin, remember);
      setSubmitting(false);
      onDone?.();
      return;
    }

    setSubmitting(true);

    try {
      const success = await unlock(pin, remember);
      setSubmitting(false);

      if (!success) {
        setError("PIN ไม่ถูกต้อง");
        setPin("");
        return;
      }

      onDone?.();
    } catch (err) {
      setSubmitting(false);
      setPin("");

      if (err instanceof EncryptionStateCorruptedError) {
        setError("PIN ถูกต้อง แต่ไม่สามารถปลดล็อกข้อมูลที่เข้ารหัสไว้ได้ ลองกู้คืนผ่านบัญชี Sync ของคุณ");
        return;
      }

      throw err;
    }
  }

  if (showRecovery) {
    return <EncryptionRecoveryFlow onDone={() => onDone?.()} onCancel={() => setShowRecovery(false)} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-glow"
          style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
        >
          <Zap size={22} className="text-white" fill="currentColor" />
        </div>

        <div>
          <h1 className="text-xl font-bold">
            {mode === "setup" ? "ตั้งค่า App Lock" : "ปลดล็อก Nexus"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "setup"
              ? "ตั้ง PIN เพื่อป้องกันข้อมูลส่วนตัวของคุณ"
              : "กรอก PIN เพื่อเข้าใช้งาน"}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="lock-pin" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
          <Lock size={14} className="mr-1 inline" />
          PIN
        </label>
        <input
          id="lock-pin"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={inputClassName}
        />
      </div>

      {mode === "setup" && (
        <div>
          <label htmlFor="lock-pin-confirm" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
            ยืนยัน PIN
          </label>
          <input
            id="lock-pin-confirm"
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className={inputClassName}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        จดจำฉันไว้ในอุปกรณ์นี้ (7 วัน)
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังดำเนินการ..." : mode === "setup" ? "ตั้งค่า PIN" : "ปลดล็อก"}
      </button>

      {canRecover && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowRecovery(true);
          }}
          className="w-full text-center text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          ลืม PIN? กู้คืนผ่านบัญชี Sync
        </button>
      )}
    </form>
  );
}
