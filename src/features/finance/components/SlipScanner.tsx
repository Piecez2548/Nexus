import { useState, type ChangeEvent } from "react";
import { Camera, Image, Trash2 } from "lucide-react";

import { recognizeSlipText, recognizeSlipTextBatch } from "@/features/finance/utils/slipOcr";
import { parseSlipText } from "@/features/finance/utils/slipParser";
import { useUIStore } from "@/features/finance/store/uiStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import Drawer from "@/components/ui/Drawer";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface BatchItem {
  key: string;
  previewUrl: string;
  title: string;
  amount: number | undefined;
  date: string | undefined;
  failed: boolean;
}

const inputClassName =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 text-sm outline-none focus:border-violet-500";

export default function SlipScanner({ open, onClose }: Props) {
  const { openTransactionDrawerWithDraft } = useUIStore();
  const { addTransaction } = useTransactionStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function reset() {
    setPreview(null);
    setScanning(false);
    setScanProgress(null);
    setError(null);
    setBatchItems(null);
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSingleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setScanning(true);

    try {
      const text = await recognizeSlipText(file);
      const parsed = parseSlipText(text);

      if (parsed.amount === undefined && parsed.date === undefined && parsed.recipient === undefined) {
        setError("อ่านสลิปไม่สำเร็จ ลองถ่ายรูปให้ชัดขึ้นหรือกรอกรายการเอง");
        setScanning(false);
        return;
      }

      openTransactionDrawerWithDraft({
        title: parsed.title,
        amount: parsed.amount,
        date: parsed.date,
        type: "expense",
        account: "Cash",
        status: "completed",
      });

      toast.success("อ่านสลิปสำเร็จ กรุณาตรวจสอบข้อมูลก่อนบันทึก");
      reset();
      onClose();
    } catch (err) {
      setError(toErrorMessage(err));
      setScanning(false);
    }
  }

  async function handleBatchFiles(files: File[]) {
    setScanning(true);
    setScanProgress({ done: 0, total: files.length });

    try {
      const texts = await recognizeSlipTextBatch(files, (done, total) => setScanProgress({ done, total }));

      const items: BatchItem[] = files.map((file, i) => {
        const parsed = parseSlipText(texts[i]);
        const failed = parsed.amount === undefined && parsed.date === undefined && parsed.recipient === undefined;

        return {
          key: `${file.name}-${i}-${file.lastModified}`,
          previewUrl: URL.createObjectURL(file),
          title: parsed.title ?? file.name,
          amount: parsed.amount,
          date: parsed.date,
          failed,
        };
      });

      setBatchItems(items);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);

    if (files.length === 1) {
      await handleSingleFile(files[0]);
    } else {
      await handleBatchFiles(files);
    }
  }

  function updateBatchItem(key: string, changes: Partial<BatchItem>) {
    setBatchItems((items) => items?.map((item) => (item.key === key ? { ...item, ...changes } : item)) ?? null);
  }

  function removeBatchItem(key: string) {
    setBatchItems((items) => items?.filter((item) => item.key !== key) ?? null);
  }

  async function handleSaveBatch() {
    if (!batchItems) return;

    const toSave = batchItems.filter((item) => item.amount !== undefined && item.amount > 0);
    if (toSave.length === 0) {
      setError("ไม่มีรายการที่กรอกจำนวนเงินไว้ให้บันทึก");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      for (const item of toSave) {
        await addTransaction({
          title: item.title.trim() || "รายการจากสลิป",
          amount: item.amount as number,
          type: "expense",
          account: "Cash",
          date: item.date ?? new Date().toISOString().slice(0, 10),
          status: "completed",
        });
      }

      toast.success(`บันทึก ${toSave.length} รายการเรียบร้อย กรุณาตรวจสอบหมวดหมู่ในตาราง`);
      reset();
      onClose();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={handleClose}>
      <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-xl font-bold">สแกนสลิป</h2>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ประมวลผลในเครื่องทั้งหมด ไม่มีการส่งรูปภาพออกจากอุปกรณ์ เลือกได้หลายรูปพร้อมกันจากคลังภาพ
        </p>

        {preview && !batchItems && (
          <img
            src={preview}
            alt="ตัวอย่างสลิป"
            className="max-h-64 w-full rounded-xl object-contain"
          />
        )}

        {scanning && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-violet-500" />
            {scanProgress ? `กำลังอ่านสลิป ${scanProgress.done}/${scanProgress.total}...` : "กำลังอ่านสลิป..."}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {batchItems && batchItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              พบ {batchItems.length} รายการ ตรวจสอบก่อนบันทึก
            </p>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {batchItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <img
                    src={item.previewUrl}
                    alt="ตัวอย่างสลิป"
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      value={item.title}
                      onChange={(e) => updateBatchItem(item.key, { title: e.target.value })}
                      placeholder="ชื่อรายการ"
                      className={inputClassName}
                    />

                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={item.amount ?? ""}
                        onChange={(e) =>
                          updateBatchItem(item.key, {
                            amount: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                        placeholder="จำนวนเงิน"
                        className={inputClassName}
                      />

                      <input
                        type="date"
                        value={item.date ?? ""}
                        onChange={(e) => updateBatchItem(item.key, { date: e.target.value || undefined })}
                        className={inputClassName}
                      />
                    </div>

                    {item.failed && (
                      <p className="text-xs text-amber-500">อ่านไม่สำเร็จ กรุณากรอกเอง</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBatchItem(item.key)}
                    aria-label={`Remove ${item.title}`}
                    className="shrink-0 rounded-lg p-2 text-zinc-500 transition hover:bg-red-600/20 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={saving}
              className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : `บันทึกทั้งหมด (${batchItems.length})`}
            </button>
          </div>
        )}

        {!batchItems && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center transition hover:border-violet-500">
                <Camera size={26} className="text-violet-500" />
                <span className="text-sm font-medium">ถ่ายรูป</span>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFiles}
                  disabled={scanning}
                  className="sr-only"
                />
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center transition hover:border-violet-500">
                <Image size={26} className="text-violet-500" />
                <span className="text-sm font-medium">เลือกจากคลังภาพ</span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFiles}
                  disabled={scanning}
                  className="sr-only"
                />
              </label>
            </div>

            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              รองรับ JPG, PNG · เลือกหลายรูปเพื่อสแกนพร้อมกัน
            </p>
          </>
        )}
      </div>
    </Drawer>
  );
}
