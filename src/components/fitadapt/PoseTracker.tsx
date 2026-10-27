import { CameraOff, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { RepCounter, jointAngles, withinBand, type RepEvent } from "@/lib/fitadapt/pose";
import type { PoseKey } from "@/lib/fitadapt/types";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 31], [24, 26], [26, 28], [28, 32],
];

interface Props {
  poseKey: PoseKey;
  /** Changing this resets the rep counter (new set or exercise). */
  resetKey: string;
  paused: boolean;
  onRep: (e: RepEvent) => void;
}

type Status = "idle" | "loading" | "live" | "error";

/**
 * Camera + MediaPipe Pose. Frames are processed on the device only — nothing is uploaded.
 * The exercise is supplied by the workout plan; the camera tracks movement for that assigned exercise only.
 */
export function PoseTracker({ poseKey, resetKey, paused, onRep }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<RepCounter | null>(null);
  const onRepRef = useRef(onRep);
  const pausedRef = useRef(paused);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [inFrame, setInFrame] = useState(false);
  const [error, setError] = useState("");

  onRepRef.current = onRep;
  pausedRef.current = paused;

  useEffect(() => {
    counterRef.current = new RepCounter(poseKey);
  }, [poseKey, resetKey]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: { x: number; y: number; visibility?: number }[][] }; close: () => void } | null = null;
    let frame = 0;

    (async () => {
      try {
        setStatus("loading");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
        if (cancelled) return;
        const video = videoRef.current!;
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
        const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#c6f432";

        const loop = () => {
          if (cancelled || !landmarker) return;
          const canvas = canvasRef.current;
          if (video.readyState >= 2 && canvas) {
            const res = landmarker.detectForVideo(video, performance.now());
            const ctx = canvas.getContext("2d")!;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const lm = res.landmarks?.[0];
            const ja = lm ? jointAngles(lm) : null;
            const visible = !!ja && ja.visibility > 0.5;
            if (frame % 6 === 0) setInFrame(visible);
            if (lm) {
              ctx.strokeStyle = color;
              ctx.fillStyle = color;
              ctx.lineWidth = 4;
              for (const [a, b] of BONES) {
                ctx.beginPath();
                ctx.moveTo(lm[a]!.x * canvas.width, lm[a]!.y * canvas.height);
                ctx.lineTo(lm[b]!.x * canvas.width, lm[b]!.y * canvas.height);
                ctx.stroke();
              }
              for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
                ctx.beginPath();
                ctx.arc(lm[i]!.x * canvas.width, lm[i]!.y * canvas.height, 5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            if (ja && visible && !pausedRef.current && counterRef.current) {
              const event = counterRef.current.push(ja.angles, withinBand(poseKey, ja.angles));
              if (event) onRepRef.current(event);
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
          setError(e instanceof Error && e.name === "NotAllowedError" ? "Camera permission was denied." : "Camera tracking couldn't start on this device.");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, [enabled, poseKey]);

  return (
    <div className="fa-camera">
      <video ref={videoRef} playsInline muted style={{ opacity: status === "live" ? 1 : 0 }} />
      <canvas ref={canvasRef} />
      {status === "live" && (
        <>
          <span className="fa-badge">
            <span className={`fa-dot ${inFrame ? "is-live" : ""}`} />
            {inFrame ? "Tracking" : "Step back into frame"}
          </span>
          <span className="fa-badge fa-badge--right">Assigned exercise tracking</span>
        </>
      )}
      {status !== "live" && (
        <div className="fa-camera-empty">
          {status === "error" ? <CameraOff /> : <Video />}
          {status === "idle" && (
            <>
              <span>Turn on the camera to count reps and measure range of motion automatically.</span>
              <button type="button" className="fa-btn fa-btn--primary fa-btn--sm" onClick={() => setEnabled(true)}>
                Enable camera
              </button>
              <span className="fa-note">Video stays on your device.</span>
            </>
          )}
          {status === "loading" && <span>Starting pose tracking…</span>}
          {status === "error" && (
            <>
              <span>{error} You can still log reps manually.</span>
              <button
                type="button"
                className="fa-btn fa-btn--outline fa-btn--sm"
                onClick={() => {
                  setEnabled(false);
                  setStatus("idle");
                }}
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
