import ThemeSettings from "@/components/settings/ThemeSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import PreferenceSettings from "@/components/settings/PreferenceSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import SyncSettings from "@/components/settings/SyncSettings";
import EncryptionSettings from "@/components/settings/EncryptionSettings";
import AuditLogSettings from "@/components/settings/AuditLogSettings";
import PermissionManagerSettings from "@/components/settings/PermissionManagerSettings";
import DataSettings from "@/components/settings/DataSettings";
import TransactionDataSettings from "@/components/settings/TransactionDataSettings";
import ImportHistorySettings from "@/components/settings/ImportHistorySettings";
import NotificationCaptureSettings from "@/components/settings/NotificationCaptureSettings";
import DangerZoneSettings from "@/components/settings/DangerZoneSettings";
import SettingsGroup from "@/components/settings/SettingsGroup";
import { useTranslation } from "@/i18n/useTranslation";

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">{t("settings.pageTitle")}</h1>

      <SettingsGroup title={t("settings.groupGeneral")}>
        <LanguageSettings />
        <ThemeSettings />
        <PreferenceSettings />
      </SettingsGroup>

      <SettingsGroup title={t("settings.groupSecuritySync")}>
        <SecuritySettings />
        <EncryptionSettings />
        <SyncSettings />
        <AuditLogSettings />
        <PermissionManagerSettings />
      </SettingsGroup>

      <SettingsGroup title={t("settings.groupDataManagement")}>
        <DataSettings />
        <TransactionDataSettings />
        <ImportHistorySettings />
        <NotificationCaptureSettings />
      </SettingsGroup>

      <SettingsGroup title={t("settings.groupDangerZone")}>
        <DangerZoneSettings />
      </SettingsGroup>
    </div>
  );
}
