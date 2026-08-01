import {
  useAppSettingsStore,
  type Currency,
  type DateFormat,
  type NumberFormat,
} from "@/store/appSettingsStore";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

const CURRENCIES: Currency[] = ["THB", "USD", "EUR", "GBP", "JPY"];
const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const NUMBER_FORMATS: NumberFormat[] = ["1,234.56", "1.234,56", "1 234.56"];

const selectClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

export default function PreferenceSettings() {
  const { currency, dateFormat, numberFormat, setCurrency, setDateFormat, setNumberFormat } =
    useAppSettingsStore();
  const { t } = useTranslation();

  return (
    <SettingsCard title={t("settings.preferences")} description={t("settings.preferencesDescription")}>
      <FormField label={t("settings.currencyLabel")} htmlFor="settings-currency">
        <select
          id="settings-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className={selectClassName}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("settings.dateFormatLabel")} htmlFor="settings-date-format">
        <select
          id="settings-date-format"
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value as DateFormat)}
          className={selectClassName}
        >
          {DATE_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("settings.numberFormatLabel")} htmlFor="settings-number-format">
        <select
          id="settings-number-format"
          value={numberFormat}
          onChange={(e) => setNumberFormat(e.target.value as NumberFormat)}
          className={selectClassName}
        >
          {NUMBER_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </FormField>
    </SettingsCard>
  );
}
