import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Copy, RefreshCw } from "lucide-react";

import { vaultEntrySchema, type VaultEntryFormData } from "@/features/vault/schemas/vaultEntrySchema";
import { useVaultEntryStore } from "@/features/vault/store/vaultEntryStore";
import { generatePassword } from "@/features/vault/utils/generatePassword";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { VaultEntry } from "@/features/vault/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: VaultEntryFormData = {
  type: "password",
  title: "",
  username: "",
  password: "",
  url: "",
  content: "",
  serviceName: "",
  code: "",
  note: "",
};

interface Props {
  entry: VaultEntry | null;
  onDone: () => void;
}

export default function VaultEntryForm({ entry, onDone }: Props) {
  const { addEntry, updateEntry } = useVaultEntryStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [revealSecret, setRevealSecret] = useState(false);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => vaultEntrySchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VaultEntryFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  const type = watch("type");

  useEffect(() => {
    reset(entry ? { ...blankValues, ...entry } : blankValues);
    setSubmitError(null);
    setRevealSecret(false);
  }, [entry, reset]);

  async function copyToClipboard(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("vault.copiedToClipboard"));
    } catch {
      toast.error(t("vault.copyFailed"));
    }
  }

  function handleGeneratePassword() {
    setValue("password", generatePassword());
    setRevealSecret(true);
  }

  async function onSubmit(data: VaultEntryFormData) {
    setSubmitError(null);
    const isEditing = entry?.id !== undefined;

    try {
      if (entry?.id !== undefined) {
        await updateEntry(entry.id, { ...entry, ...data });
      } else {
        await addEntry({ ...data, createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("vault.updatedSuccess") : t("vault.savedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    }
  }

  const secretFieldName = type === "note" ? null : type === "recoveryKey" ? "code" : "password";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{entry ? t("vault.editFormTitle") : t("vault.addFormTitle")}</h2>

      <FormField label={t("vault.typeLabel")} htmlFor="vault-type" error={errors.type?.message}>
        <select id="vault-type" {...register("type")} className={inputClassName}>
          <option value="password">{t("vault.typePassword")}</option>
          <option value="note">{t("vault.typeNote")}</option>
          <option value="recoveryKey">{t("vault.typeRecoveryKey")}</option>
        </select>
      </FormField>

      <FormField label={t("vault.titleLabel")} htmlFor="vault-title" error={errors.title?.message}>
        <input
          id="vault-title"
          {...register("title")}
          placeholder={t("vault.titlePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      {type === "password" && (
        <>
          <FormField label={t("vault.usernameLabel")} htmlFor="vault-username">
            <input id="vault-username" {...register("username")} className={inputClassName} />
          </FormField>

          <FormField label={t("vault.urlLabel")} htmlFor="vault-url">
            <input id="vault-url" {...register("url")} className={inputClassName} />
          </FormField>
        </>
      )}

      {type === "recoveryKey" && (
        <FormField label={t("vault.serviceNameLabel")} htmlFor="vault-serviceName">
          <input id="vault-serviceName" {...register("serviceName")} className={inputClassName} />
        </FormField>
      )}

      {type === "note" && (
        <FormField label={t("vault.contentLabel")} htmlFor="vault-content">
          <textarea id="vault-content" {...register("content")} rows={5} className={inputClassName} />
        </FormField>
      )}

      {secretFieldName && (
        <FormField
          label={type === "password" ? t("vault.passwordLabel") : t("vault.codeLabel")}
          htmlFor={`vault-${secretFieldName}`}
        >
          <div className="flex items-center gap-2">
            <input
              id={`vault-${secretFieldName}`}
              type={revealSecret ? "text" : "password"}
              {...register(secretFieldName)}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => setRevealSecret((v) => !v)}
              aria-label={revealSecret ? t("vault.hide") : t("vault.reveal")}
              className="shrink-0 rounded-lg p-2.5 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              {revealSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(watch(secretFieldName) ?? "")}
              aria-label={t("vault.copy")}
              className="shrink-0 rounded-lg p-2.5 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Copy size={18} />
            </button>
            {type === "password" && (
              <button
                type="button"
                onClick={handleGeneratePassword}
                aria-label={t("vault.generate")}
                className="shrink-0 rounded-lg p-2.5 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </FormField>
      )}

      <FormField label={t("vault.noteLabel")} htmlFor="vault-note">
        <textarea id="vault-note" {...register("note")} rows={3} className={inputClassName} />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("vault.saving") : t("common.save")}
      </button>
    </form>
  );
}
