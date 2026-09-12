import { useEffect, useRef, useState } from "react";
import { Laptop, RefreshCw, Smartphone, X } from "lucide-react";
import QRCode from "qrcode";
import { cancelPairing, createPairingTicket, waitForPairing, type PairingTicket } from "./pairingService";
import { useAppLockStore } from "@/store/appLockStore";

type Status = "idle" | "creating" | "waiting" | "expired" | "error";

export default function DesktopPairUnlock() {
  const unlock = useAppLockStore((state) => state.unlockWithPairedDevice);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [qr, setQr] = useState("");
  const [ticket, setTicket] = useState<PairingTicket | null>(null);
  const controller = useRef<AbortController | null>(null);

  async function begin() {
    controller.current?.abort();
    if (ticket) void cancelPairing(ticket.id);
    setStatus("creating");
    try {
      const next = await createPairingTicket();
      const dataUrl = await QRCode.toDataURL(next.payload, { width: 280, margin: 2, color: { dark: "#17121f", light: "#ffffff" } });
      setTicket(next);
      setQr(dataUrl);
      setStatus("waiting");
      const abort = new AbortController();
      controller.current = abort;
      const dek = await waitForPairing(next, abort.signal);
      unlock(dek);
      setOpen(false);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setStatus((error as Error).message === "PAIRING_EXPIRED" ? "expired" : "error");
    }
  }

  useEffect(() => () => controller.current?.abort(), []);

  function close() {
    controller.current?.abort();
    if (ticket) void cancelPairing(ticket.id);
    setOpen(false);
  }

  if (!open) {
    return <button type="button" onClick={() => { setOpen(true); void begin(); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-400/40 bg-brand-500/10 py-3 font-medium text-brand-200 transition hover:bg-brand-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">
      <Smartphone size={18} />ปลดล็อกด้วยมือถือ
    </button>;
  }

  return <section aria-live="polite" className="relative rounded-2xl border border-brand-400/30 bg-[#100c18] p-5 text-center shadow-[0_18px_48px_rgba(68,34,120,.28)]">
    <button type="button" aria-label="ปิด" onClick={close} className="absolute right-3 top-3 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15 text-brand-300"><Laptop size={20} /></div>
    <h2 className="text-lg font-semibold text-white">สแกนเพื่อปลดล็อกคอม</h2>
    <p className="mt-1 text-sm text-zinc-300">เปิด Nexus บนมือถือ แล้วเลือก “สแกน QR” จากเมนูบัญชี</p>
    {qr && status === "waiting" ? <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3"><img src={qr} alt="QR สำหรับเชื่อมอุปกรณ์ มีอายุ 2 นาที" className="h-52 w-52" /></div> : <div className="mx-auto mt-4 grid h-[14.5rem] w-[14.5rem] place-items-center rounded-2xl border border-white/10 bg-white/5 text-sm text-zinc-300">{status === "creating" ? "กำลังสร้าง QR…" : "QR หมดอายุ"}</div>}
    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400"><span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />รอการยืนยันจากมือถือ · หมดอายุใน 2 นาที</div>
    {(status === "expired" || status === "error") && <button type="button" onClick={() => void begin()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-300 px-4 py-2 font-semibold text-[#160d24]"><RefreshCw size={16} />สร้าง QR ใหม่</button>}
  </section>;
}
