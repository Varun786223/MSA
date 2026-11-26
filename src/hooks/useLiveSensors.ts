import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DatasetReplayId,
  InputSourceMode,
  LiveHardwareStatus,
  MultimodalFeatures,
  ScenarioPreset,
} from '../types/stress';
import {
  analyzeLocalLexicon,
  generateScenarioFeatures,
  interpolateDatasetReplayFeatures,
} from '../utils/stressEngine';
import { AudioStreamAnalyzer } from '../utils/audioAnalysis';

interface LiveSensorsOptions {
  isRunning: boolean;
  sourceMode: InputSourceMode;
  scenario: ScenarioPreset;
  replayDatasetId: DatasetReplayId;
  replayProgressPct: number;
  cameraActive: boolean;
  micActive: boolean;
  sttOptIn: boolean;
  customLexiconOverride?: { negativeRatio: number; hopelessCount: number } | null;
  onAutoLexiconUpdate?: (res: { negativeRatio: number; hopelessCount: number }) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useLiveSensors({
  isRunning,
  sourceMode,
  scenario,
  replayDatasetId,
  replayProgressPct,
  cameraActive,
  micActive,
  sttOptIn,
  customLexiconOverride,
  onAutoLexiconUpdate,
}: LiveSensorsOptions) {
  const [tick, setTick] = useState(0);
  const [features, setFeatures] = useState<MultimodalFeatures>(() =>
    generateScenarioFeatures('calm_baseline', 0)
  );
  const [rppgWaveform, setRppgWaveform] = useState<number[]>(() =>
    Array.from({ length: 48 }, (_, i) => Math.sin(i * 0.35) * 0.4)
  );
  const [audioWaveform, setAudioWaveform] = useState<number[]>(() =>
    Array.from({ length: 48 }, () => 0.04)
  );

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [bleError, setBleError] = useState<string | null>(null);

  const [hardwareStatus, setHardwareStatus] = useState<LiveHardwareStatus>(() => {
    const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    const hasStt = Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
    const hasBle = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    return {
      liveCameraReady: false,
      mediapipeStatus: 'idle',
      liveMicReady: false,
      micVoiced: false,
      sttSupported: hasStt,
      sttListening: false,
      lastSttWordsDiscarded: null,
      bleSupported: hasBle,
      bleConnected: false,
      bleDeviceName: null,
      bleHeartRateBpm: null,
      bleHrvRmssdMs: null,
    };
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const greenHistoryRef = useRef<number[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);

  const faceLandmarkerRef = useRef<{
    detectForVideo: (video: HTMLVideoElement, timestampMs: number) => {
      faceBlendshapes?: Array<{ categories: Array<{ categoryName: string; score: number }> }>;
    };
    close: () => void;
  } | null>(null);
  const poseLandmarkerRef = useRef<{
    detectForVideo: (video: HTMLVideoElement, timestampMs: number) => {
      landmarks?: Array<Array<{ x: number; y: number; z: number }>>;
    };
    close: () => void;
  } | null>(null);
  const prevPoseWristRef = useRef<{ x: number; y: number } | null>(null);

  // Dedicated AudioStreamAnalyzer utility instance
  const vocalAnalyzerRef = useRef<AudioStreamAnalyzer | null>(null);

  // SpeechRecognition ref
  const sttRef = useRef<SpeechRecognitionLike | null>(null);

  // BLE GATT refs
  const bleDeviceRef = useRef<{ gatt?: { connected: boolean; disconnect: () => void } } | null>(null);
  const rrHistoryRef = useRef<number[]>([]);

  const liveMetricsRef = useRef<{
    luminance: number | null;
    motionEnergy: number | null;
    rppgBpm: number | null;
    browAu4: number | null;
    lidAu7: number | null;
    blinkRate: number | null;
    gazeShift: number | null;
    postureClosure: number | null;
    selfTouchRate: number | null;
    pitchHz: number | null;
    jitterPct: number | null;
    shimmerPct: number | null;
    speechRateWpm: number | null;
    pauseRatio: number | null;
    bleHrBpm: number | null;
    bleRmssdMs: number | null;
  }>({
    luminance: null,
    motionEnergy: null,
    rppgBpm: null,
    browAu4: null,
    lidAu7: null,
    blinkRate: null,
    gazeShift: null,
    postureClosure: null,
    selfTouchRate: null,
    pitchHz: null,
    jitterPct: null,
    shimmerPct: null,
    speechRateWpm: null,
    pauseRatio: null,
    bleHrBpm: null,
    bleRmssdMs: null,
  });

  // Web Bluetooth BLE Heart Rate Pairing (Service 0x180D, Characteristic 0x2A37)
  const connectBleHeartRate = useCallback(async () => {
    setBleError(null);
    const nav = navigator as unknown as {
      bluetooth?: {
        requestDevice: (opts: { filters: Array<{ services: string[] }> }) => Promise<{
          name?: string;
          gatt?: {
            connected: boolean;
            connect: () => Promise<{
              getPrimaryService: (svc: string) => Promise<{
                getCharacteristic: (chr: string) => Promise<{
                  startNotifications: () => Promise<void>;
                  addEventListener: (
                    evt: string,
                    cb: (e: { target: { value?: DataView } }) => void
                  ) => void;
                }>;
              }>;
            }>;
            disconnect: () => void;
          };
        }>;
      };
    };

    if (!nav.bluetooth) {
      setBleError('Web Bluetooth is unavailable in this browser. Using physiological simulator.');
      return;
    }

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      bleDeviceRef.current = device;
      const server = await device.gatt?.connect();
      if (!server) throw new Error('GATT server unavailable');

      const service = await server.getPrimaryService('heart_rate');
      const char = await service.getCharacteristic('heart_rate_measurement');
      await char.startNotifications();

      char.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target?.value;
        if (!value) return;

        const flags = value.getUint8(0);
        const is16BitHr = (flags & 0x01) !== 0;
        const hasEnergy = (flags & 0x08) !== 0;
        const hasRr = (flags & 0x10) !== 0;

        let offset = 1;
        const hrBpm = is16BitHr ? value.getUint16(offset, true) : value.getUint8(offset);
        offset += is16BitHr ? 2 : 1;

        if (hasEnergy) offset += 2;

        if (hasRr) {
          while (offset + 1 < value.byteLength) {
            const rrRaw = value.getUint16(offset, true);
            const rrMs = (rrRaw / 1024) * 1000;
            rrHistoryRef.current.push(rrMs);
            if (rrHistoryRef.current.length > 30) rrHistoryRef.current.shift();
            offset += 2;
          }
        } else {
          const approxRr = 60000 / Math.max(40, hrBpm);
          rrHistoryRef.current.push(approxRr);
          if (rrHistoryRef.current.length > 30) rrHistoryRef.current.shift();
        }

        const rrs = rrHistoryRef.current;
        let rmssd = 42;
        if (rrs.length >= 3) {
          let sumSqDiff = 0;
          for (let i = 1; i < rrs.length; i++) {
            const diff = rrs[i] - rrs[i - 1];
            sumSqDiff += diff * diff;
          }
          rmssd = Math.min(130, Math.max(8, Math.sqrt(sumSqDiff / (rrs.length - 1))));
        }

        liveMetricsRef.current.bleHrBpm = hrBpm;
        liveMetricsRef.current.bleRmssdMs = Number(rmssd.toFixed(1));
        setHardwareStatus((prev) => ({
          ...prev,
          bleConnected: true,
          bleDeviceName: device.name || 'BLE Heart Rate Strap',
          bleHeartRateBpm: hrBpm,
          bleHrvRmssdMs: Number(rmssd.toFixed(1)),
        }));
      });

      setHardwareStatus((prev) => ({
        ...prev,
        bleConnected: true,
        bleDeviceName: device.name || 'BLE Heart Rate Strap',
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bluetooth pairing cancelled';
      if (!msg.toLowerCase().includes('cancel')) {
        setBleError(`BLE pairing unavailable: ${msg}`);
      }
    }
  }, []);

  const disconnectBle = useCallback(() => {
    if (bleDeviceRef.current?.gatt?.connected) {
      bleDeviceRef.current.gatt.disconnect();
    }
    bleDeviceRef.current = null;
    rrHistoryRef.current = [];
    liveMetricsRef.current.bleHrBpm = null;
    liveMetricsRef.current.bleRmssdMs = null;
    setHardwareStatus((prev) => ({
      ...prev,
      bleConnected: false,
      bleDeviceName: null,
      bleHeartRateBpm: null,
      bleHrvRmssdMs: null,
    }));
  }, []);

  // Camera + MediaPipe FaceLandmarker & PoseLandmarker (with CPU/Canvas fallback)
  useEffect(() => {
    let cancelled = false;
    async function startCam() {
      if (!isRunning || !cameraActive || sourceMode !== 'live_sensors') {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach((t) => t.stop());
          videoStreamRef.current = null;
        }
        setHardwareStatus((prev) => ({
          ...prev,
          liveCameraReady: false,
          mediapipeStatus: 'idle',
        }));
        liveMetricsRef.current.luminance = null;
        liveMetricsRef.current.motionEnergy = null;
        liveMetricsRef.current.rppgBpm = null;
        liveMetricsRef.current.browAu4 = null;
        liveMetricsRef.current.lidAu7 = null;
        liveMetricsRef.current.blinkRate = null;
        liveMetricsRef.current.gazeShift = null;
        liveMetricsRef.current.postureClosure = null;
        liveMetricsRef.current.selfTouchRate = null;
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser camera API is unavailable in this context. Using calibrated stream.');
        return;
      }

      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setHardwareStatus((prev) => ({
          ...prev,
          liveCameraReady: true,
          mediapipeStatus: 'loading',
        }));

        try {
          const mp = await import('@mediapipe/tasks-vision');
          if (cancelled) return;

          const vision = await mp.FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
          );

          const createLandmarkers = async (delegate: 'GPU' | 'CPU') =>
            Promise.all([
              mp.FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath:
                    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
                  delegate,
                },
                outputFaceBlendshapes: true,
                runningMode: 'VIDEO',
                numFaces: 1,
              }),
              mp.PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath:
                    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
                  delegate,
                },
                runningMode: 'VIDEO',
                numPoses: 1,
              }),
            ]);

          let faceLm;
          let poseLm;
          try {
            [faceLm, poseLm] = await createLandmarkers('GPU');
          } catch {
            [faceLm, poseLm] = await createLandmarkers('CPU');
          }

          if (cancelled) {
            faceLm.close();
            poseLm.close();
            return;
          }

          faceLandmarkerRef.current = faceLm as unknown as typeof faceLandmarkerRef.current;
          poseLandmarkerRef.current = poseLm as unknown as typeof poseLandmarkerRef.current;
          setHardwareStatus((prev) => ({ ...prev, mediapipeStatus: 'active' }));
        } catch {
          if (!cancelled) {
            setHardwareStatus((prev) => ({ ...prev, mediapipeStatus: 'fallback' }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err instanceof Error
              ? `Camera unavailable (${err.message}). Using calibrated sensor stream.`
              : 'Camera permission unavailable. Using calibrated sensor stream.'
          );
          setHardwareStatus((prev) => ({
            ...prev,
            liveCameraReady: false,
            mediapipeStatus: 'idle',
          }));
        }
      }
    }

    startCam();
    return () => {
      cancelled = true;
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
        videoStreamRef.current = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, [isRunning, cameraActive, sourceMode]);

  // Microphone lifecycle via dedicated audioAnalysis utility
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function startMic() {
      if (!isRunning || !micActive || sourceMode !== 'live_sensors') {
        if (vocalAnalyzerRef.current) {
          vocalAnalyzerRef.current.stop();
          vocalAnalyzerRef.current = null;
        }
        setHardwareStatus((prev) => ({ ...prev, liveMicReady: false, micVoiced: false }));
        liveMetricsRef.current.pitchHz = null;
        liveMetricsRef.current.jitterPct = null;
        liveMetricsRef.current.shimmerPct = null;
        liveMetricsRef.current.speechRateWpm = null;
        liveMetricsRef.current.pauseRatio = null;
        return;
      }

      try {
        setMicError(null);
        const analyzer = new AudioStreamAnalyzer();
        await analyzer.start();
        if (cancelled) {
          analyzer.stop();
          return;
        }
        vocalAnalyzerRef.current = analyzer;
        setHardwareStatus((prev) => ({ ...prev, liveMicReady: true }));

        unsubscribe = analyzer.subscribe((extracted) => {
          if (cancelled) return;
          liveMetricsRef.current.pitchHz = extracted.pitchHz;
          liveMetricsRef.current.jitterPct = extracted.jitterPct;
          liveMetricsRef.current.shimmerPct = extracted.shimmerPct;
          liveMetricsRef.current.speechRateWpm = extracted.speechRateWpm;
          liveMetricsRef.current.pauseRatio = extracted.pauseRatio;

          setAudioWaveform(extracted.waveform);
          setHardwareStatus((prev) =>
            prev.micVoiced === extracted.isVoiced
              ? prev
              : { ...prev, micVoiced: extracted.isVoiced }
          );
          setFeatures((prev) => ({
            ...prev,
            pitchHz: extracted.pitchHz,
            jitterPct: extracted.jitterPct,
            shimmerPct: extracted.shimmerPct,
            speechRateWpm: extracted.speechRateWpm,
            pauseRatio: extracted.pauseRatio,
          }));
        }, 250);
      } catch (err) {
        if (!cancelled) {
          setMicError(
            err instanceof Error
              ? `Microphone unavailable (${err.message}). Using calibrated acoustic stream.`
              : 'Microphone permission unavailable. Using calibrated acoustic stream.'
          );
          setHardwareStatus((prev) => ({ ...prev, liveMicReady: false, micVoiced: false }));
        }
      }
    }

    startMic();
    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (vocalAnalyzerRef.current) {
        vocalAnalyzerRef.current.stop();
        vocalAnalyzerRef.current = null;
      }
    };
  }, [isRunning, micActive, sourceMode]);

  // Opt-In Live SpeechRecognition (Language Channel) with immediate raw text disposal
  useEffect(() => {
    if (!isRunning || !sttOptIn || sourceMode !== 'live_sensors') {
      if (sttRef.current) {
        try {
          sttRef.current.stop();
        } catch {
          // ignore
        }
        sttRef.current = null;
      }
      setHardwareStatus((prev) => ({ ...prev, sttListening: false }));
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    const rec = new RecognitionCtor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0]?.transcript || '';
          const res = analyzeLocalLexicon(transcript);
          if (onAutoLexiconUpdate && res.wordCount > 0) {
            onAutoLexiconUpdate({
              negativeRatio: res.negativeRatio,
              hopelessCount: res.hopelessCount,
            });
          }
          setHardwareStatus((prev) => ({
            ...prev,
            lastSttWordsDiscarded: res.wordCount,
          }));
        }
      }
    };

    rec.onerror = () => {
      setHardwareStatus((prev) => ({ ...prev, sttListening: false }));
    };

    rec.onend = () => {
      setHardwareStatus((prev) => ({ ...prev, sttListening: false }));
    };

    try {
      rec.start();
      sttRef.current = rec;
      setHardwareStatus((prev) => ({ ...prev, sttListening: true }));
    } catch {
      setHardwareStatus((prev) => ({ ...prev, sttListening: false }));
    }

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, [isRunning, sttOptIn, sourceMode, onAutoLexiconUpdate]);

  // 250ms high-frequency DSP + MediaPipe sampler
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      if (
        sourceMode === 'live_sensors' &&
        hardwareStatus.liveCameraReady &&
        videoRef.current &&
        canvasRef.current &&
        videoRef.current.readyState >= 2
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const w = 80;
          const h = 60;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const frame = ctx.getImageData(0, 0, w, h).data;

          let lumSum = 0;
          let greenSum = 0;
          let roiCount = 0;
          let motionDiff = 0;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = frame[idx];
              const g = frame[idx + 1];
              const b = frame[idx + 2];
              lumSum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;

              if (x >= 24 && x <= 56 && y >= 12 && y <= 44) {
                greenSum += g;
                roiCount++;
              }

              if (prevFrameRef.current) {
                motionDiff +=
                  Math.abs(r - prevFrameRef.current[idx]) +
                  Math.abs(g - prevFrameRef.current[idx + 1]) +
                  Math.abs(b - prevFrameRef.current[idx + 2]);
              }
            }
          }

          prevFrameRef.current = new Uint8ClampedArray(frame);
          const avgLum = lumSum / (w * h);
          const avgGreen = roiCount > 0 ? greenSum / roiCount : 128;
          const normMotion = Math.min(95, Math.max(4, (motionDiff / (w * h * 3)) * 2.4));

          greenHistoryRef.current.push(avgGreen);
          if (greenHistoryRef.current.length > 48) greenHistoryRef.current.shift();

          const hist = greenHistoryRef.current;
          const meanG = hist.reduce((a, b) => a + b, 0) / hist.length;
          const detrended = hist.map((v) => Number((v - meanG).toFixed(3)));
          setRppgWaveform(
            detrended.length >= 12
              ? detrended
              : Array.from({ length: 48 }, (_, i) => Math.sin(i * 0.35) * 0.4)
          );

          let crossings = 0;
          for (let i = 1; i < detrended.length; i++) {
            if (
              (detrended[i - 1] < 0 && detrended[i] >= 0) ||
              (detrended[i - 1] > 0 && detrended[i] <= 0)
            ) {
              crossings++;
            }
          }
          const durationSec = hist.length * 0.25;
          const estBpm =
            durationSec >= 4
              ? Math.min(125, Math.max(56, Math.round((crossings / 2 / durationSec) * 60)))
              : 72;

          liveMetricsRef.current.luminance = Number(avgLum.toFixed(2));
          liveMetricsRef.current.motionEnergy = Number(normMotion.toFixed(1));
          liveMetricsRef.current.rppgBpm = estBpm;
        }

        const nowMs = performance.now();
        if (faceLandmarkerRef.current) {
          try {
            const faceRes = faceLandmarkerRef.current.detectForVideo(video, nowMs);
            const cats = faceRes.faceBlendshapes?.[0]?.categories;
            if (cats) {
              const getScore = (name: string) =>
                cats.find((c) => c.categoryName === name)?.score ?? 0;

              const browDown = (getScore('browDownLeft') + getScore('browDownRight')) * 2.5;
              const squint = (getScore('eyeSquintLeft') + getScore('eyeSquintRight')) * 2.5;
              const blink = (getScore('eyeBlinkLeft') + getScore('eyeBlinkRight')) * 0.5;
              const gaze =
                Math.max(
                  getScore('eyeLookInLeft'),
                  getScore('eyeLookOutLeft'),
                  getScore('eyeLookUpLeft')
                ) || 0.15;

              liveMetricsRef.current.browAu4 = Number(Math.min(5, browDown).toFixed(2));
              liveMetricsRef.current.lidAu7 = Number(Math.min(5, squint).toFixed(2));
              liveMetricsRef.current.blinkRate = Math.round(14 + blink * 28);
              liveMetricsRef.current.gazeShift = Number(Math.min(1, gaze).toFixed(2));
            }
          } catch {
            // ignore transient frame errors
          }
        }

        if (poseLandmarkerRef.current) {
          try {
            const poseRes = poseLandmarkerRef.current.detectForVideo(video, nowMs);
            const lms = poseRes.landmarks?.[0];
            if (lms && lms.length >= 17) {
              const nose = lms[0];
              const leftShoulder = lms[11];
              const rightShoulder = lms[12];
              const leftWrist = lms[15];
              const rightWrist = lms[16];

              const shoulderSpan = Math.abs(leftShoulder.x - rightShoulder.x);
              const closure = Math.min(1, Math.max(0.08, 1 - shoulderSpan * 2.1));

              const distLeft = Math.hypot(leftWrist.x - nose.x, leftWrist.y - nose.y);
              const distRight = Math.hypot(rightWrist.x - nose.x, rightWrist.y - nose.y);
              const nearFace = distLeft < 0.22 || distRight < 0.22;

              if (prevPoseWristRef.current) {
                const vel = Math.hypot(
                  rightWrist.x - prevPoseWristRef.current.x,
                  rightWrist.y - prevPoseWristRef.current.y
                );
                liveMetricsRef.current.motionEnergy = Number(
                  Math.min(95, Math.max(6, vel * 380)).toFixed(1)
                );
              }
              prevPoseWristRef.current = { x: rightWrist.x, y: rightWrist.y };
              liveMetricsRef.current.postureClosure = Number(closure.toFixed(2));
              liveMetricsRef.current.selfTouchRate = nearFace ? 3.2 : 0.6;
            }
          } catch {
            // ignore transient frame errors
          }
        }
      } else {
        setRppgWaveform((prev) => {
          const nextVal =
            Math.sin(Date.now() * 0.0065) * 0.75 + Math.cos(Date.now() * 0.013) * 0.22;
          return [...prev.slice(1), Number(nextVal.toFixed(3))];
        });
      }

      // Fallback animated waveform when live microphone analyzer is inactive
      if (!(sourceMode === 'live_sensors' && hardwareStatus.liveMicReady && vocalAnalyzerRef.current?.isActive())) {
        setAudioWaveform((prev) => {
          const amp = scenario === 'cognitive_strain' ? 0.65 : 0.25;
          const next =
            (Math.sin(Date.now() * 0.019) * 0.6 + Math.cos(Date.now() * 0.043) * 0.4) * amp;
          return [...prev.slice(1), Number(next.toFixed(3))];
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [
    isRunning,
    sourceMode,
    scenario,
    hardwareStatus.liveCameraReady,
    hardwareStatus.liveMicReady,
  ]);

  useEffect(() => {
    const base =
      sourceMode === 'dataset_replay'
        ? interpolateDatasetReplayFeatures(replayDatasetId, replayProgressPct, tick)
        : generateScenarioFeatures(scenario, tick);

    const live = liveMetricsRef.current;

    const merged: MultimodalFeatures =
      sourceMode === 'dataset_replay'
        ? {
            ...base,
            negativeLexiconRatio: customLexiconOverride
              ? customLexiconOverride.negativeRatio
              : base.negativeLexiconRatio,
            hopelessPhraseCount: customLexiconOverride
              ? customLexiconOverride.hopelessCount
              : base.hopelessPhraseCount,
          }
        : {
            ...base,
            cameraLuminance: live.luminance ?? base.cameraLuminance,
            motionEnergy: live.motionEnergy ?? base.motionEnergy,
            rppgHeartRateBpm: live.rppgBpm ?? base.rppgHeartRateBpm,
            browLowerAu4: live.browAu4 ?? base.browLowerAu4,
            lidTightenAu7: live.lidAu7 ?? base.lidTightenAu7,
            blinkRatePerMin: live.blinkRate ?? base.blinkRatePerMin,
            gazeShiftScore: live.gazeShift ?? base.gazeShiftScore,
            postureClosure: live.postureClosure ?? base.postureClosure,
            selfTouchEventsPerMin: live.selfTouchRate ?? base.selfTouchEventsPerMin,
            pitchHz: live.pitchHz ?? base.pitchHz,
            jitterPct: live.jitterPct ?? base.jitterPct,
            shimmerPct: live.shimmerPct ?? base.shimmerPct,
            speechRateWpm: live.speechRateWpm ?? base.speechRateWpm,
            pauseRatio: live.pauseRatio ?? base.pauseRatio,
            wristHeartRateBpm: live.bleHrBpm ?? base.wristHeartRateBpm,
            hrvRmssdMs: live.bleRmssdMs ?? base.hrvRmssdMs,
            negativeLexiconRatio: customLexiconOverride
              ? customLexiconOverride.negativeRatio
              : base.negativeLexiconRatio,
            hopelessPhraseCount: customLexiconOverride
              ? customLexiconOverride.hopelessCount
              : base.hopelessPhraseCount,
          };

    setFeatures(merged);
  }, [tick, sourceMode, scenario, replayDatasetId, replayProgressPct, customLexiconOverride]);

  return {
    features,
    rppgWaveform,
    audioWaveform,
    videoRef,
    canvasRef,
    hardwareStatus,
    cameraError,
    micError,
    bleError,
    connectBleHeartRate,
    disconnectBle,
  };
}
