import ThemeSettings from "@/components/settings/ThemeSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import PreferenceSettings from "@/components/settings/PreferenceSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import SyncSettings from "@/components/settings/SyncSettings";
import DataSettings from "@/components/settings/DataSettings";
import TransactionDataSettings from "@/components/settings/TransactionDataSettings";
import { useTranslation } from "@/i18n/useTranslation";

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{t("settings.pageTitle")}</h1>

      <LanguageSettings />
      <ThemeSettings />
      <PreferenceSettings />
      <SecuritySettings />
      <SyncSettings />
      <DataSettings />
      <TransactionDataSettings />
    </div>
  );
}
