import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-zinc-600 dark:text-zinc-500">
        {t("notFound.message")}
      </p>
      <Link to="/" className="text-violet-500 hover:underline">
        {t("notFound.backToDashboard")}
      </Link>
    </div>
  );
}
