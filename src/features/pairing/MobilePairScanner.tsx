import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, X } from "lucide-react";
import { decodeImageDataQr } from "@/features/finance/slipScanner/engine/qr/imageDataDecoder";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { approvePairing } from "./pairingService";

export default function MobilePairScanner({ onClose }: { onClose: () => void }) {
  const dek = useEncryptionSessionStore((state) => state.dek);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const active = useRef(true);
  const [status, setStatus] = useState<"camera" | "approving" | "done" | "error">("camera");
  const [message, setMessage] = useState("เล็งกล้องไปที่ QR บนหน้าจอคอม");

  useEffect(() => {
    active.current = true;
    let frame = 0;
    async function start() {
      if (!dek) { setStatus("error"); setMessage("กรุณาปลดล็อก Nexus Main บนมือถือก่อนสแกน"); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        let lastScan = 0;
        const scan = async (time: number) => {
          if (!active.current || !context) return;
          if (time - lastScan > 180 && video.readyState >= 2) {
            lastScan = time;
            const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const value = decodeImageDataQr(context.getImageData(0, 0, canvas.width, canvas.height));
            if (value?.startsWith("nexus-pair:v1:")) {
              active.current = false;
              setStatus("approving");
              setMessage("กำลังยืนยันอุปกรณ์…");
              try { await approvePairing(value, dek); setStatus("done"); setMessage("ปลดล็อกคอมเรียบร้อยแล้ว"); }
              catch { setStatus("error"); setMessage("QR ไม่ถูกต้องหรือหมดอายุ กรุณาสร้าง QR ใหม่"); }
              stream.getTracks().forEach((track) => track.stop());
              return;
            }
          }
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch { setStatus("error"); setMessage("เปิดกล้องไม่ได้ กรุณาอนุญาตสิทธิ์กล้องให้ Nexus"); }
    }
    void start();
    return () => { active.current = false; cancelAnimationFrame(frame); streamRef.current?.getTracks().forEach((track) => track.stop()); };
  }, [dek]);

  return <div role="dialog" aria-modal="true" aria-label="สแกน QR เพื่อปลดล็อกคอม" className="fixed inset-0 z-[100] flex flex-col bg-[#09070d] text-white">
    <header className="flex items-center justify-between px-5 py-4"><div><h2 className="text-lg font-semibold">เชื่อมอุปกรณ์</h2><p className="text-xs text-zinc-400">QR ใช้ได้ครั้งเดียวและหมดอายุใน 2 นาที</p></div><button type="button" aria-label="ปิดเครื่องสแกน" onClick={onClose} className="rounded-xl bg-white/10 p-3"><X size={20} /></button></header>
    <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      {status === "camera" && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="h-64 w-64 rounded-[28px] border-2 border-brand-300 shadow-[0_0_0_999px_rgba(5,3,9,.58),0_0_32px_rgba(168,132,255,.45)]"><span className="sr-only">กรอบสแกน QR</span></div></div>}
      {status !== "camera" && <div className="absolute inset-0 grid place-items-center bg-[#09070d]/90"><div className="text-center">{status === "done" ? <CheckCircle2 className="mx-auto text-emerald-400" size={52} /> : <Camera className="mx-auto text-brand-300" size={48} />}<p className="mt-4 font-medium">{message}</p>{status === "done" && <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-brand-300 px-6 py-3 font-semibold text-[#160d24]">เสร็จสิ้น</button>}</div></div>}
    </div>
    <p className="px-6 py-5 text-center text-sm text-zinc-300">{message}</p>
  </div>;
}
