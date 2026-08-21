import { useExecutiveDashboard } from "@/features/executive/hooks/useExecutiveDashboard";
import TodayScheduleSection from "@/features/executive/components/TodayScheduleSection";
import PrioritySection from "@/features/executive/components/PrioritySection";
import OverdueSection from "@/features/executive/components/OverdueSection";
import GoalsSnapshotSection from "@/features/executive/components/GoalsSnapshotSection";
import FinanceSnapshotSection from "@/features/executive/components/FinanceSnapshotSection";
import HealthSnapshotSection from "@/features/executive/components/HealthSnapshotSection";
import TradingSnapshotSection from "@/features/executive/components/TradingSnapshotSection";
import ExecutiveSummaryPanel from "@/features/executive/components/ExecutiveSummaryPanel";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

export default function ExecutiveDashboard() {
  const { context, priorities, summary, loading, error, retry } = useExecutiveDashboard();
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t("executive.pageTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("executive.pageSubtitle")}</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : loading && context.overdueTodos.length === 0 && context.habits.length === 0 && context.goals.length === 0 ? (
        <LoadingState label={t("executive.loading")} />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <PrioritySection priorities={priorities} />
            <TodayScheduleSection schedule={context.schedule} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <OverdueSection overdueTodos={context.overdueTodos} />
            <GoalsSnapshotSection goals={context.goals} />
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <FinanceSnapshotSection finance={context.finance} />
            <HealthSnapshotSection health={context.health} />
            <TradingSnapshotSection trading={context.trading} />
          </div>

          <ExecutiveSummaryPanel summary={summary} />
        </>
      )}
    </div>
  );
}
