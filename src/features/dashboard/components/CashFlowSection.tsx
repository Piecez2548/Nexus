import ChartCard from "@/components/ui/ChartCard";
import ChartLegend from "@/components/ui/ChartLegend";
import ExpensePieChart from "@/features/dashboard/components/charts/ExpensePieChart";
import CashFlowLineChart from "@/features/dashboard/components/charts/CashFlowLineChart";

const CASH_FLOW_LEGEND = [
  { label: "รายรับ", color: "#22c55e" },
  { label: "รายจ่าย", color: "#ef4444" },
];

export default function CashFlowSection() {
  return (
    <div className="grid gap-6 xl:grid-cols-3">

      <div className="xl:col-span-2">

        <ChartCard
          title="รายรับ vs รายจ่าย"
          headerExtra={<ChartLegend items={CASH_FLOW_LEGEND} />}
        >
          <CashFlowLineChart />
        </ChartCard>

      </div>

      <ChartCard title="รายจ่ายตามหมวดหมู่">
        <ExpensePieChart />
      </ChartCard>

    </div>
  );
}
