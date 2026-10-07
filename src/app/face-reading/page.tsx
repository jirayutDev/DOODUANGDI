"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, ChevronLeft, Eye, ImageUp, RotateCcw, ScanFace, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<PartKey>("face");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      setResult(data.result);
      setActiveTab("face");
      setStage("done");
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

  const activePart = result?.parts.find((p) => p.key === activeTab);
  const overlayText =
    activePart && activeTab === "face" && result?.element
      ? `${result.element} : ${activePart.reading}`
      : activePart?.reading;

  return (
    <div className="mx-auto max-w-md px-0 py-0 sm:px-4 sm:py-8">
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#0d0b2b] text-white sm:min-h-0 sm:rounded-3xl sm:border sm:border-border">
        {/* แถบหัว */}
        <div className="relative flex h-16 shrink-0 items-center justify-center">
          <Link
            href="/duang"
            aria-label="ย้อนกลับ"
            className="absolute left-3 rounded-full p-2 text-white/90 hover:bg-white/10"
          >
            <ChevronLeft className="size-7" />
          </Link>
          <h1 className="font-display text-lg">วิเคราะห์โหงวเฮ้ง</h1>
        </div>

        {/* พื้นที่รูป/กล้อง */}
        <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-[#1a1745]">
          {stage === "camera" && (
            <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          )}
          {image && stage !== "camera" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="รูปใบหน้าที่สแกน" className="h-full w-full object-cover" />
          )}
          {stage === "idle" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white/60">
              <ScanFace className="size-16" />
              <p className="text-sm">ถ่ายหน้าตรงหรือเลือกรูป ให้น้องมูอ่านโหงวเฮ้งตามตำรา ใบหน้า ตา ปาก คิ้ว</p>
            </div>
          )}

          {/* กรอบวงรีช่วยจัดหน้า + เส้นสแกน */}
          {(stage === "camera" || stage === "scanning") && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[68%] w-[62%] rounded-[50%] border-2 border-dashed border-[#d4af6a]/80" />
            </div>
          )}
          {stage === "scanning" && (
            <div className="pointer-events-none absolute inset-x-[10%] h-0.5 animate-face-scan bg-[#d4af6a] shadow-[0_0_18px_4px_rgba(212,175,106,0.6)]" />
          )}
          {stage === "camera" && (
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white drop-shadow">
              จัดหน้าให้อยู่ในกรอบ มองตรง ไม่สวมแว่นดำ/หน้ากาก
            </p>
          )}
          {stage === "scanning" && (
            <p className="absolute inset-x-0 bottom-4 text-center text-sm text-white drop-shadow">
              น้องมูกำลังพิจารณาใบหน้า...
            </p>
          )}

          {/* กล่องคำทำนายลอยทับด้านบนของรูป */}
          {stage === "done" && overlayText && (
            <div
              key={activeTab}
              className="absolute inset-x-3 top-3 max-h-[55%] animate-deal-in overflow-y-auto rounded-2xl bg-[#1e1b4b]/90 p-4 text-[15px] leading-relaxed text-white shadow-lg backdrop-blur-sm"
            >
              {overlayText}
            </div>
          )}
        </div>

        {/* แถบล่าง */}
        <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-5">
          {stage === "done" && result ? (
            <>
              <div className="grid grid-cols-4 gap-3">
                {TABS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    aria-pressed={activeTab === key}
                    className={cn(
                      "flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-2xl text-white transition-colors",
                      activeTab === key ? "bg-[#ad9640]" : "bg-[#7b2cbf] hover:bg-[#8a3bd0]"
                    )}
                  >
                    <Icon className="size-9 sm:size-10" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
              {result.advice && (
                <p className="rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/80">
                  <span className="text-[#d4af6a]">คำแนะนำเสริมดวง: </span>
                  {result.advice}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={reset}>
                  <RotateCcw /> สแกนใหม่
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white">
                  <Link href="/mor-du">ปรึกษาหมอดูตัวจริง</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              {stage === "idle" && (
                <>
                  <label className="flex items-start gap-2 text-left text-xs text-white/70">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>ยินยอมให้ส่งรูปใบหน้าไปให้ AI วิเคราะห์ — ใช้เพื่อทำนายครั้งนี้เท่านั้น ไม่มีการบันทึกเก็บไว้</span>
                  </label>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="lg" onClick={openCamera} disabled={!consent}>
                      <Camera /> เปิดกล้อง
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={!consent}>
                      <ImageUp /> เลือกรูป
                    </Button>
                  </div>
                </>
              )}
              {stage === "camera" && (
                <div className="flex gap-2">
                  <Button size="lg" onClick={capture}>
                    <Camera /> ถ่ายรูป
                  </Button>
                  <Button size="lg" variant="ghost" className="text-white/80" onClick={reset}>
                    ยกเลิก
                  </Button>
                </div>
              )}
              {stage === "preview" && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="lg" onClick={scan}>
                    <ScanFace /> สแกนดูโหงวเฮ้ง
                  </Button>
                  <Button size="lg" variant="ghost" className="text-white/80" onClick={reset}>
                    <RotateCcw /> ถ่ายใหม่
                  </Button>
                </div>
              )}
              {error && <p className="text-center text-sm text-red-300">{error}</p>}
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <p className="px-4 py-4 text-center text-xs text-muted-foreground/70">
        คำทำนายจาก AI อิงหลักโหงวเฮ้งแบบทั่วไป เพื่อความบันเทิงและเป็นกำลังใจ ไม่ใช่การประเมินบุคลิกหรือสุขภาพ
      </p>
    </div>
  );
}
