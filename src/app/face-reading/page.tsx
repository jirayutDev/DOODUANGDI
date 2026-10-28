"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Eye, ImageUp, RotateCcw, ScanFace, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleCoinError } from "@/lib/coin-client";
import { Cost } from "@/lib/pricing-client";

type PartKey = "face" | "eyes" | "mouth" | "eyebrows";

interface FaceReadingResult {
  element: string;
  parts: { key: PartKey; label: string; reading: string }[];
  advice: string;
}

type Stage = "idle" | "camera" | "preview" | "scanning" | "done";

const MAX_SIDE = 768;

// ไอคอนปากและคิ้ว (lucide ไม่มีให้) — วาดเส้นบางสไตล์เดียวกับ lucide
function LipsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12c2.5-3.5 5-5 7-5 1.2 0 2.2.7 3 1.5.8-.8 1.8-1.5 3-1.5 2 0 4.5 1.5 7 5-2.5 3.5-6 5.5-10 5.5S4.5 15.5 2 12Z" />
      <path d="M2 12c3.5.8 6.8 1.2 10 1.2s6.5-.4 10-1.2" />
    </svg>
  );
}

function BrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 15.5 15.5 9.5l6.5 2.5" />
      <path d="M2 15.5l1.5-2.5L15 8l7 4" />
    </svg>
  );
}

const TABS: { key: PartKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "face", label: "ใบหน้า", Icon: UserRound },
  { key: "eyes", label: "ตา", Icon: Eye },
  { key: "mouth", label: "ปาก", Icon: LipsIcon },
  { key: "eyebrows", label: "คิ้ว", Icon: BrowIcon },
];

// ย่อรูปฝั่ง client ก่อนส่ง — เร็วขึ้น ประหยัดค่า AI และไม่ส่งรูปความละเอียดเต็มออกจากเครื่อง
function drawToDataUrl(source: CanvasImageSource, width: number, height: number, mirror = false): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function FaceReadingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<FaceReadingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("camera");
      // รอให้ <video> render ก่อนค่อยผูก stream
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError('เปิดกล้องไม่ได้ ลองอนุญาตการใช้กล้องในเบราว์เซอร์ หรือกด "เลือกรูป" แทนนะ');
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setImage(drawToDataUrl(video, video.videoWidth, video.videoHeight, true));
    stopCamera();
    setStage("preview");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("ต้องเป็นไฟล์รูปภาพเท่านั้นนะ");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(drawToDataUrl(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
      stopCamera();
      setStage("preview");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("เปิดรูปนี้ไม่ได้ ลองเลือกรูปอื่นดูนะ");
    };
    img.src = url;
  }

  async function scan() {
    if (!image) return;
    setStage("scanning");
    setError(null);
    try {
      const res = await fetch("/api/face-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleCoinError(data)) {
          setStage("preview");
          return;
        }
        throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      }
      setResult(data.result);
      setStage("done");
      window.dispatchEvent(new Event("coins:changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ");
      setStage("preview");
    }
  }

  function reset() {
    stopCamera();
    setImage(null);
    setResult(null);
    setError(null);
    setStage("idle");
  }

  const btnPrimary =
    "inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
  const btnSecondary =
    "inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-secondary px-[22px] font-semibold text-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="px-[18px] pb-10 pt-2 md:mx-auto md:max-w-[1120px] md:px-10 md:pb-20 md:pt-8">
      <p className="text-sm text-muted-foreground">บุคลิกและนิสัย</p>
      <h1 className="mt-0.5 text-[28px] font-bold leading-[1.9] md:text-[40px]">
        สแกนหน้า ดูโหงวเฮ้ง
      </h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        ถ่ายหน้าตรง ให้น้องมูอ่านใบหน้า ตา ปาก คิ้ว ตามตำรา
      </p>

      <div className="mt-[30px] flex flex-wrap items-start gap-x-20 gap-y-12">
        {/* ซ้าย: รูป/กล้อง + ปุ่ม */}
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px]">
          <div className="w-[280px] max-w-full self-center rounded-xl border border-line-soft p-2">
            <div className="relative aspect-[7/9] w-full overflow-hidden rounded-xl bg-[#0F0B24]">
              {stage === "camera" && (
                <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              )}
              {image && stage !== "camera" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="รูปใบหน้าที่สแกน" className="h-full w-full object-cover" />
              )}
              {stage === "idle" && (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <span
                    aria-hidden
                    className="h-[200px] w-[150px] rounded-full border-[1.5px] border-dashed border-primary"
                  />
                  <span className="text-base text-muted-foreground">วางหน้าให้อยู่ในวงรีนะ</span>
                </div>
              )}

              {/* กรอบวงรีช่วยจัดหน้า + เส้นสแกน */}
              {(stage === "camera" || stage === "scanning") && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-[68%] w-[62%] rounded-[50%] border-2 border-dashed border-primary/80" />
                </div>
              )}
              {stage === "scanning" && (
                <div className="pointer-events-none absolute inset-x-[10%] h-0.5 animate-face-scan bg-primary shadow-[0_0_18px_4px_rgba(232,184,74,0.6)]" />
              )}
              {stage === "camera" && (
                <p className="absolute inset-x-0 bottom-3 px-2 text-center text-xs text-white drop-shadow">
                  จัดหน้าให้อยู่ในกรอบ มองตรง ไม่สวมแว่นดำ/หน้ากาก
                </p>
              )}
              {stage === "scanning" && (
                <p className="absolute inset-x-0 bottom-4 text-center text-sm text-white drop-shadow">
                  น้องมูกำลังพิจารณาใบหน้า...
                </p>
              )}
            </div>
          </div>

          {stage === "idle" && (
            <>
              <label className="flex items-start gap-2.5 text-sm text-soft-text">
                <input
                  type="checkbox"
                  className="mt-[5px] accent-primary"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  ยินยอมให้ส่งรูปใบหน้าไปให้ AI วิเคราะห์ ใช้ทำนายครั้งนี้เท่านั้น ไม่เก็บรูปไว้
                </span>
              </label>
              <div className="flex gap-3">
                <button type="button" className={btnPrimary} onClick={openCamera} disabled={!consent}>
                  <Camera className="size-5" aria-hidden /> ถ่ายรูป
                </button>
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!consent}
                >
                  <ImageUp className="size-5" aria-hidden /> เลือกรูป
                </button>
              </div>
            </>
          )}
          {stage === "camera" && (
            <div className="flex gap-3">
              <button type="button" className={btnPrimary} onClick={capture}>
                <Camera className="size-5" aria-hidden /> ถ่ายรูป
              </button>
              <button type="button" className={btnSecondary} onClick={reset}>
                ยกเลิก
              </button>
            </div>
          )}
          {stage === "preview" && (
            <div className="flex gap-3">
              <button type="button" className={btnPrimary} onClick={scan}>
                <ScanFace className="size-5" aria-hidden /> สแกนดูโหงวเฮ้ง
              </button>
              <button type="button" className={btnSecondary} onClick={reset}>
                <RotateCcw className="size-5" aria-hidden /> ถ่ายใหม่
              </button>
            </div>
          )}
          {stage === "preview" && (
            <p className="text-center text-xs text-muted-foreground">
              ใช้ <Cost feature="face-reading" unit /> · ต้องเข้าสู่ระบบ
            </p>
          )}
          {stage === "done" && (
            <button type="button" className={cn(btnSecondary, "flex-none")} onClick={reset}>
              <RotateCcw className="size-5" aria-hidden /> สแกนใหม่
            </button>
          )}
          {error && <p className="text-center text-sm text-red-300">{error}</p>}
        </div>

        {/* ขวา: ผลการอ่าน */}
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          {stage === "done" && result ? (
            <>
              <h2 className="text-[26px] font-bold leading-normal">น้องมูอ่านหน้าเธอแล้ว</h2>
              {result.element && (
                <p className="text-sm text-muted-foreground">ธาตุใบหน้า: {result.element}</p>
              )}
              <ul>
                {TABS.map(({ key, label, Icon }) => {
                  const part = result.parts.find((p) => p.key === key);
                  return (
                    <li
                      key={key}
                      className="flex min-h-[60px] items-start gap-3.5 border-b border-line-soft/60 py-2.5"
                    >
                      <Icon className="mt-1 size-6 shrink-0 text-primary" />
                      <span className="flex flex-1 flex-col leading-normal">
                        <span className="text-base font-semibold">{label}</span>
                        <span className="text-[16px] text-muted-foreground">
                          {part?.reading ?? "-"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {result.advice && (
                <div className="mt-2.5 rounded-[18px] bg-card p-5">
                  <p className="text-[17px] text-muted-foreground">คำแนะนำเสริมดวง</p>
                  <p className="mt-1">{result.advice}</p>
                </div>
              )}
              <Link
                href="/mor-du"
                className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-primary"
              >
                ปรึกษาหมอดูตัวจริง <span aria-hidden>›</span>
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3 text-soft-text">
              <ScanFace className="size-12 text-muted-foreground" aria-hidden />
              <p>ถ่ายหน้าตรงหรือเลือกรูป ให้น้องมูอ่านโหงวเฮ้งตามตำรา ใบหน้า ตา ปาก คิ้ว</p>
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <p className="mt-10 text-center text-xs text-muted-foreground/70">
        คำทำนายจาก AI อิงหลักโหงวเฮ้งแบบทั่วไป เพื่อความบันเทิงและเป็นกำลังใจ ไม่ใช่การประเมินบุคลิกหรือสุขภาพ
      </p>
    </div>
  );
}
