import { useState, type FormEvent } from "react";
import { Lock, Mail, KeyRound } from "lucide-react";

import { useAppLockStore } from "@/store/appLockStore";
import { recoverDekFromEscrow, RecoveryNotAvailableError } from "@/features/encryption/recovery/recoverDekFromEscrow";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-center text-lg tracking-[0.5em] outline-none focus:border-violet-500";

const textInputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-sm outline-none focus:border-violet-500";

interface Props {
  onDone: () => void;
  // Omit when there's no prior "enter PIN" screen to return to (e.g. the
  // cross-device catch-up flow, which can trigger before this device has
  // ever had a PIN at all).
  onCancel?: () => void;
  title?: string;
  description?: string;
}

// Fetches the DEK escrowed at enable-time (see enableEncryption.ts) using
// the account's email/password, then lets the user set a (new) local PIN
// that re-wraps that same DEK. Shared by two entry points that are
// conceptually identical — "I don't have a working local PIN/DEK, but I do
// have my Sync account password": AppLockScreen's "Forgot PIN?" link, and
// AppLockGate's cross-device catch-up screen (this device received
// already-encrypted data from another device and has never unlocked it).
export default function EncryptionRecoveryFlow({ onDone, onCancel, title, description }: Props) {
  const completeRecovery = useAppLockStore((s) => s.completeRecovery);

  const [step, setStep] = useState<"credentials" | "new-pin">("credentials");
  const [email, setEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [recoveredDek, setRecoveredDek] = useState<CryptoKey | null>(null);
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRecoverCredentials(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const dek = await recoverDekFromEscrow(email, accountPassword);
      setRecoveredDek(dek);
      setStep("new-pin");
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
      setStep("credentials");
      return;
    }

    setSubmitting(true);
    await completeRecovery(newPin, recoveredDek);
    setSubmitting(false);
    onDone();
  }

  if (step === "new-pin") {
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
          <label htmlFor="recovery-new-pin" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
            <Lock size={14} className="mr-1 inline" />
            PIN ใหม่
          </label>
          <input
            id="recovery-new-pin"
            type="password"
            inputMode="numeric"
            autoFocus
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="recovery-new-pin-confirm" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
            ยืนยัน PIN ใหม่
          </label>
          <input
            id="recovery-new-pin-confirm"
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
      onSubmit={handleRecoverCredentials}
      className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8"
    >
      <div className="text-center">
        <h1 className="text-xl font-bold">{title ?? "กู้คืนด้วยบัญชี Sync"}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description ?? "ลงชื่อเข้าใช้ด้วยอีเมลและรหัสผ่านบัญชี Sync ของคุณเพื่อกู้คืนกุญแจเข้ารหัส"}
        </p>
      </div>

      <div>
        <label htmlFor="recovery-email" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
          <Mail size={14} className="mr-1 inline" />
          อีเมล
        </label>
        <input
          id="recovery-email"
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={textInputClassName}
        />
      </div>

      <div>
        <label htmlFor="recovery-password" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
          <KeyRound size={14} className="mr-1 inline" />
          รหัสผ่านบัญชี Sync
        </label>
        <input
          id="recovery-password"
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

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ย้อนกลับ
        </button>
      )}
    </form>
  );
}
