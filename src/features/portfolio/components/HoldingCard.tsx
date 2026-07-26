import { useState } from "react";
import { Pencil, Trash2, RefreshCw } from "lucide-react";

import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { valuateHolding } from "@/features/portfolio/utils/valuation";
import { MARKET_LABELS } from "@/features/trading/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { Holding } from "@/features/portfolio/types";

function formatMoney(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

interface Props {
  holding: Holding;
  onEdit: () => void;
}

export default function HoldingCard({ holding, onEdit }: Props) {
  const { deleteHolding, updateCurrentPrice } = useHoldingStore();
  const { t, language } = useTranslation();
  const toast = useToast();

  const [priceInput, setPriceInput] = useState("");

  const valuation = valuateHolding(holding);

  async function handleDelete() {
    if (holding.id === undefined) return;

    try {
      await deleteHolding(holding.id);
      toast.success(t("portfolio.deletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  async function handleUpdatePrice() {
    const price = Number(priceInput);
    if (holding.id === undefined || !priceInput || price <= 0) return;

    await updateCurrentPrice(holding.id, price);
    setPriceInput("");
    toast.success(t("portfolio.priceUpdatedSuccess"));
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{holding.symbol}</h3>
          <span className="mt-1 inline-block rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-500">
            {MARKET_LABELS[holding.market]}
          </span>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {holding.quantity.toLocaleString()} @ {holding.avgCostPrice.toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label={t("portfolio.editHolding", { symbol: holding.symbol })}
            className="rounded-lg p-2 transition hover:bg-violet-600/20 hover:text-violet-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={handleDelete}
            aria-label={t("portfolio.deleteHolding", { symbol: holding.symbol })}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">{t("portfolio.costBasisLabel")}</span>
          <span>{valuation.costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">{t("portfolio.currentValueLabel")}</span>
          <span>{valuation.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">{t("portfolio.unrealizedPnlLabel")}</span>
          {valuation.unrealizedPnl === null ? (
            <span className="text-zinc-400 dark:text-zinc-500">{t("portfolio.noPriceYetShort")}</span>
          ) : (
            <span className={valuation.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500"}>
              {formatMoney(valuation.unrealizedPnl)} ({formatMoney(valuation.unrealizedPnlPercent ?? 0)}%)
            </span>
          )}
        </div>
      </div>

      {valuation.unrealizedPnl === null ? (
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">{t("portfolio.noPriceYet")}</p>
      ) : (
        holding.currentPriceUpdatedAt && (
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            {t("portfolio.priceAsOf", {
              date: new Date(holding.currentPriceUpdatedAt).toLocaleString(language === "th" ? "th-TH" : "en-US"),
            })}
          </p>
        )
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="number"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder={t("portfolio.currentPricePlaceholder")}
          aria-label={t("portfolio.currentPriceInputLabel", { symbol: holding.symbol })}
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-2 text-sm outline-none focus:border-violet-500"
        />
        <button
          onClick={handleUpdatePrice}
          aria-label={t("portfolio.updatePriceButton", { symbol: holding.symbol })}
          className="flex items-center gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <RefreshCw size={14} />
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
