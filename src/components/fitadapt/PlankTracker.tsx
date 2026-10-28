import { CameraOff, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type Landmark = { x: number; y: number; visibility?: number };
type Status = "idle" | "loading" | "live" | "error";
type FormStatus = "Good alignment" | "Hips too high" | "Hips sagging" | "Move into side view" | "Body not visible";

interface Props {
  paused: boolean;
}

/**
 * Rule-based Plank feedback prototype.
 * Uses MediaPipe landmarks from a side-view camera. This does not run the
 * external ANN dataset; it provides geometric feedback from live landmarks.
 */
export function PlankTracker({ paused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState<FormStatus>("Body not visible");
  const [error, setError] = useState("");

  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: Landmark[][] }; close: () => void } | null = null;
    let frame = 0;

    (async () => {
      try {
        setStatus("loading");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM);
        landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) return;
        setStatus("live");

        const loop = () => {
          if (cancelled || !landmarker) return;
          const canvas = canvasRef.current;
          if (video.readyState >= 2 && canvas) {
            const result = landmarker.detectForVideo(video, performance.now());
            const lm = result.landmarks?.[0];
            const ctx = canvas.getContext("2d");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              if (lm) {
                const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#c6f432";
                ctx.strokeStyle = color;
                ctx.fillStyle = color;
                ctx.lineWidth = 4;
                const bones: [number, number][] = [[11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
                for (const [a, b] of bones) {
                  ctx.beginPath();
                  ctx.moveTo(lm[a]!.x * canvas.width, lm[a]!.y * canvas.height);
                  ctx.lineTo(lm[b]!.x * canvas.width, lm[b]!.y * canvas.height);
                  ctx.stroke();
                }
              }
            }

            if (!pausedRef.current && frame % 8 === 0) {
              if (!lm || lm.length < 29) {
                setForm("Body not visible");
              } else {
                const leftScore = Math.min(lm[11]!.visibility ?? 1, lm[23]!.visibility ?? 1, lm[27]!.visibility ?? 1);
                const rightScore = Math.min(lm[12]!.visibility ?? 1, lm[24]!.visibility ?? 1, lm[28]!.visibility ?? 1);
                const side = leftScore >= rightScore
                  ? { shoulder: lm[11]!, hip: lm[23]!, ankle: lm[27]!, score: leftScore }
                  : { shoulder: lm[12]!, hip: lm[24]!, ankle: lm[28]!, score: rightScore };

                if (side.score < 0.5) {
                  setForm("Body not visible");
                } else {
                  const dx = side.ankle.x - side.shoulder.x;
                  if (Math.abs(dx) < 0.12) {
                    setForm("Move into side view");
                  } else {
                    const t = (side.hip.x - side.shoulder.x) / dx;
                    const expectedY = side.shoulder.y + t * (side.ankle.y - side.shoulder.y);
                    const deviation = side.hip.y - expectedY;
                    const tolerance = Math.max(0.025, Math.abs(dx) * 0.08);
                    if (deviation < -tolerance) setForm("Hips too high");
                    else if (deviation > tolerance) setForm("Hips sagging");
                    else setForm("Good alignment");
                  }
                }
              }
            }
            frame++;
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error && e.name === "NotAllowedError"
            ? "Camera permission was denied."
            : "Camera tracking couldn't start on this device.");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      landmarker?.close();
    };
  }, [enabled]);

  return (
    <div className="fa-camera">
      <video ref={videoRef} playsInline muted style={{ opacity: status === "live" ? 1 : 0 }} />
      <canvas ref={canvasRef} />
      {status === "live" && (
        <span className="fa-badge fa-badge--right">
          {paused ? "Paused" : form}
        </span>
      )}
      {status !== "live" && (
        <div className="fa-camera-empty">
          {status === "error" ? <CameraOff /> : <Video />}
          {status === "idle" && (
            <>
              <span>Use a side view so the camera can check Plank body alignment.</span>
              <button type="button" className="fa-btn fa-btn--primary fa-btn--sm" onClick={() => setEnabled(true)}>
                Enable camera
              </button>
              <span className="fa-note">Video stays on your device.</span>
            </>
          )}
          {status === "loading" && <span>Starting Plank posture tracking…</span>}
          {status === "error" && (
            <>
              <span>{error}</span>
              <button type="button" className="fa-btn fa-btn--outline fa-btn--sm" onClick={() => { setEnabled(false); setStatus("idle"); }}>
                Try again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
