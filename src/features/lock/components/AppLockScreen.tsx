import { useState, type FormEvent } from "react";
import { Lock, Mail, KeyRound, Zap } from "lucide-react";

import { useAppLockStore, EncryptionStateCorruptedError } from "@/store/appLockStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import { recoverDekFromEscrow, RecoveryNotAvailableError } from "@/features/encryption/recovery/recoverDekFromEscrow";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-center text-lg tracking-[0.5em] outline-none focus:border-violet-500";

const textInputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-sm outline-none focus:border-violet-500";

interface Props {
  mode: "setup" | "unlock";
  onDone?: () => void;
}

type Step = "pin" | "recover-credentials" | "recover-new-pin";

export default function AppLockScreen({ mode, onDone }: Props) {
  const { setupPin, unlock, encryptionEnabled, completeRecovery } = useAppLockStore();

  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [recoveredDek, setRecoveredDek] = useState<CryptoKey | null>(null);
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");

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

  async function handleRecoverCredentials(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const dek = await recoverDekFromEscrow(email, accountPassword);
      setRecoveredDek(dek);
      setStep("recover-new-pin");
    } catch (err) {
      if (err instanceof RecoveryNotAvailableError) {
        setError(err.message);
      } else {
        setError("เกิดข้อผิดพลาดระหว่างกู้คืน ลองอีกครั้ง");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetNewPin(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPin.length < 4) {
      setError("PIN ต้องมีอย่างน้อย 4 หลัก");
      return;
    }
    if (newPin !== newPinConfirm) {
      setError("PIN ไม่ตรงกัน กรุณายืนยันอีกครั้ง");
      return;
    }
    if (!recoveredDek) {
      setError("ไม่พบกุญแจที่กู้คืนมา กรุณาเริ่มใหม่อีกครั้ง");
      setStep("recover-credentials");
      return;
    }

    setSubmitting(true);
    await completeRecovery(newPin, recoveredDek);
    setSubmitting(false);
    onDone?.();
  }

  if (step === "recover-credentials") {
    return (
      <form
        onSubmit={handleRecoverCredentials}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold">กู้คืนด้วยบัญชี Sync</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ลงชื่อเข้าใช้ด้วยอีเมลและรหัสผ่านบัญชี Sync ของคุณเพื่อกู้คืนกุญแจเข้ารหัส
          </p>
        </div>

        <div>
          <label htmlFor="recover-email" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
            <Mail size={14} className="mr-1 inline" />
            อีเมล
          </label>
          <input
            id="recover-email"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={textInputClassName}
          />
        </div>

        <div>
          <label htmlFor="recover-password" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
            <KeyRound size={14} className="mr-1 inline" />
            รหัสผ่านบัญชี Sync
          </label>
          <input
            id="recover-password"
            type="password"
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            className={textInputClassName}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "กำลังกู้คืน..." : "กู้คืน"}
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep("pin");
          }}
          className="w-full text-center text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ย้อนกลับ
        </button>
      </form>
    );
  }

  if (step === "recover-new-pin") {
    return (
      <form
        onSubmit={handleSetNewPin}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold">ตั้ง PIN ใหม่</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            กู้คืนกุญแจเข้ารหัสสำเร็จ — ตั้ง PIN ใหม่เพื่อใช้ปลดล็อกอุปกรณ์นี้ต่อไป
          </p>
        </div>

        <div>
          <label htmlFor="new-pin" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
            <Lock size={14} className="mr-1 inline" />
            PIN ใหม่
          </label>
          <input
            id="new-pin"
            type="password"
            inputMode="numeric"
            autoFocus
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="new-pin-confirm" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
            ยืนยัน PIN ใหม่
          </label>
          <input
            id="new-pin-confirm"
            type="password"
            inputMode="numeric"
            value={newPinConfirm}
            onChange={(e) => setNewPinConfirm(e.target.value)}
            className={inputClassName}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "ตั้ง PIN ใหม่"}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-600"
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
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังดำเนินการ..." : mode === "setup" ? "ตั้งค่า PIN" : "ปลดล็อก"}
      </button>

      {canRecover && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep("recover-credentials");
          }}
          className="w-full text-center text-sm text-violet-600 hover:underline dark:text-violet-400"
        >
          ลืม PIN? กู้คืนผ่านบัญชี Sync
        </button>
      )}
    </form>
  );
}
