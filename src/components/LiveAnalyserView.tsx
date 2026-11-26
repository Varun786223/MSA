import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bluetooth,
  Camera,
  Check,
  Database,
  Eye,
  EyeOff,
  Mic,
  Pause,
  Play,
  ShieldCheck,
  Sliders,
  X,
} from 'lucide-react';
import {
  AppConsentState,
  ChannelEnabledMap,
  ChannelId,
  DatasetReplayId,
  FusionMode,
  InputSourceMode,
  LiveHardwareStatus,
  MultimodalFeatures,
  ObservationWindow,
  PersonalBaseline,
  ScenarioPreset,
  StressAssessment,
  StressBand,
} from '../types/stress';
import { DATASET_REPLAY_PROFILES, STRESS_BANDS } from '../data/researchData';
import { analyzeLocalLexicon } from '../utils/stressEngine';

interface LiveAnalyserViewProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  sourceMode: InputSourceMode;
  onChangeSourceMode: (m: InputSourceMode) => void;
  scenario: ScenarioPreset;
  onChangeScenario: (s: ScenarioPreset) => void;
  replayDatasetId: DatasetReplayId;
  onChangeReplayDatasetId: (id: DatasetReplayId) => void;
  replayProgressPct: number;
  onChangeReplayProgress: (pct: number) => void;
  replayPlaying: boolean;
  onToggleReplayPlaying: () => void;
  replaySpeed: 1 | 4;
  onToggleReplaySpeed: () => void;
  fusionMode: FusionMode;
  onChangeFusionMode: (m: FusionMode) => void;
  observationWindow: ObservationWindow;
  onChangeObservationWindow: (w: ObservationWindow) => void;
  enabledChannels: ChannelEnabledMap;
  onToggleChannel: (ch: ChannelId) => void;
  consent: AppConsentState;
  onUpdateConsent: (patch: Partial<AppConsentState>) => void;
  features: MultimodalFeatures;
  assessment: StressAssessment;
  baseline: PersonalBaseline;
  rppgWaveform: number[];
  audioWaveform: number[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hardwareStatus: LiveHardwareStatus;
  cameraError: string | null;
  micError: string | null;
  bleError: string | null;
  onConnectBle: () => void;
  onDisconnectBle: () => void;
  onLexiconEvaluated: (res: { negativeRatio: number; hopelessCount: number } | null) => void;
  onSaveReading: (tag: string, note: string) => void;
  onGoToBaseline: () => void;
  isControlsSheetOpen: boolean;
  onCloseControlsSheet: () => void;
  onOpenControlsSheet: () => void;
}

const SCENARIO_OPTIONS: { id: ScenarioPreset; label: string; detail: string }[] = [
  { id: 'calm_baseline', label: 'Calm Baseline Rest', detail: 'Settled physiology and neutral speech' },
  { id: 'cognitive_strain', label: 'Cognitive Strain (TSST)', detail: 'Elevated EDA, lowered HRV, brow tension' },
  { id: 'exercise_confounder', label: 'Physical Exertion', detail: 'High HR and sweat with 1.6g movement' },
  { id: 'excitement_confounder', label: 'Curiosity / Excitement', detail: 'Animated face AUs while HRV stays steady' },
  { id: 'noisy_dropout', label: 'Low-Light / Noisy Feed', detail: 'Degraded luminance triggering quality gate' },
];

const BAND_STROKE_COLOR: Record<StressBand, string> = {
  Calm: '#047857',
  Mild: '#65a30d',
  Moderate: '#d97706',
  High: '#ea580c',
  'Very High': '#be123c',
};

export const LiveAnalyserView: React.FC<LiveAnalyserViewProps> = ({
  isRunning,
  onToggleRunning,
  sourceMode,
  onChangeSourceMode,
  scenario,
  onChangeScenario,
  replayDatasetId,
  onChangeReplayDatasetId,
  replayProgressPct,
  onChangeReplayProgress,
  replayPlaying,
  onToggleReplayPlaying,
  replaySpeed,
  onToggleReplaySpeed,
  fusionMode,
  onChangeFusionMode,
  observationWindow,
  onChangeObservationWindow,
  enabledChannels,
  onToggleChannel,
  consent,
  onUpdateConsent,
  features,
  assessment,
  baseline,
  rppgWaveform,
  audioWaveform,
  videoRef,
  canvasRef,
  hardwareStatus,
  cameraError,
  micError,
  bleError,
  onConnectBle,
  onDisconnectBle,
  onLexiconEvaluated,
  onSaveReading,
  onGoToBaseline,
  isControlsSheetOpen,
  onCloseControlsSheet,
  onOpenControlsSheet,
}) => {
  const [mobileSection, setMobileSection] = useState<'channels' | 'fusion'>('channels');
  const [tagInput, setTagInput] = useState('Study check-in');
  const [noteInput, setNoteInput] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [speechDraft, setSpeechDraft] = useState('');
  const [lastLexiconResult, setLastLexiconResult] = useState<{
    negativeRatio: number;
    hopelessCount: number;
    wordCount: number;
  } | null>(null);

  const currentBandMeta =
    STRESS_BANDS.find((b) => b.band === assessment.band) ?? STRESS_BANDS[0];

  const activeReplayProfile =
    DATASET_REPLAY_PROFILES.find((d) => d.id === replayDatasetId) ?? DATASET_REPLAY_PROFILES[0];
  const activeReplayPhase =
    activeReplayProfile.phases.find(
      (ph) => replayProgressPct >= ph.startPct && replayProgressPct <= ph.endPct
    ) ?? activeReplayProfile.phases[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveReading(tagInput.trim() || 'Session reading', noteInput.trim());
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2200);
  };

  const handleProcessLanguageSnippet = () => {
    if (!speechDraft.trim()) return;
    const res = analyzeLocalLexicon(speechDraft);
    setLastLexiconResult(res);
    onLexiconEvaluated({ negativeRatio: res.negativeRatio, hopelessCount: res.hopelessCount });
    setSpeechDraft('');
  };

  const buildWavePoints = (data: number[]) => {
    const min = Math.min(...data, -0.5);
    const max = Math.max(...data, 0.5);
    const span = Math.max(0.4, max - min);
    return data
      .map((val, idx) => {
        const x = (idx / Math.max(1, data.length - 1)) * 280;
        const y = 42 - ((val - min) / span) * 34;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const rppgPoints = buildWavePoints(rppgWaveform);
  const audioPoints = buildWavePoints(audioWaveform);

  // Radial 240-degree clinical arc geometry
  const arcRadius = 56;
  const arcCircumference = 2 * Math.PI * arcRadius;
  const arcSpan = arcCircumference * (240 / 360);
  const arcFilled = arcSpan * (Math.max(0, Math.min(100, assessment.index)) / 100);
  const strokeHex = BAND_STROKE_COLOR[assessment.band];

  const handleQuickCameraToggle = () => {
    onChangeSourceMode('live_sensors');
    onUpdateConsent({ cameraEnabled: !consent.cameraEnabled });
  };

  const handleQuickMicToggle = () => {
    onChangeSourceMode('live_sensors');
    onUpdateConsent({ microphoneEnabled: !consent.microphoneEnabled });
  };

  const handleQuickBleToggle = () => {
    if (hardwareStatus.bleConnected) {
      onDisconnectBle();
    } else {
      onChangeSourceMode('live_sensors');
      onConnectBle();
    }
  };

  const controlsContent = (
    <div className="space-y-6">
      {/* Hardware Inputs */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900">On-Device Sensors & BLE</h2>
        </div>

        <div className="space-y-2.5">
          <div className="flex min-h-[44px] items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Camera className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Webcam (MediaPipe + rPPG)</span>
            </div>
            <button
              type="button"
              onClick={handleQuickCameraToggle}
              className={`min-h-[44px] min-w-[82px] rounded-xl px-3.5 text-xs font-semibold transition-colors active:scale-[0.98] ${
                consent.cameraEnabled && sourceMode === 'live_sensors'
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {consent.cameraEnabled && sourceMode === 'live_sensors' ? 'Disable' : 'Enable'}
            </button>
          </div>

          {consent.cameraEnabled && sourceMode === 'live_sensors' && (
            <div className="flex min-h-[44px] items-center justify-between gap-3 pl-6">
              <span className="text-xs text-slate-500">Mask raw camera preview</span>
              <button
                type="button"
                onClick={() => onUpdateConsent({ privacyMaskVideo: !consent.privacyMaskVideo })}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                {consent.privacyMaskVideo ? (
                  <>
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                    <span>Masked</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>Visible</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex min-h-[44px] items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Mic className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Microphone (Pitch, Jitter, Shimmer)</span>
            </div>
            <button
              type="button"
              onClick={handleQuickMicToggle}
              className={`min-h-[44px] min-w-[82px] rounded-xl px-3.5 text-xs font-semibold transition-colors active:scale-[0.98] ${
                consent.microphoneEnabled && sourceMode === 'live_sensors'
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {consent.microphoneEnabled && sourceMode === 'live_sensors' ? 'Disable' : 'Enable'}
            </button>
          </div>

          <div className="flex min-h-[44px] items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Bluetooth className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="truncate">
                {hardwareStatus.bleConnected
                  ? `BLE: ${hardwareStatus.bleDeviceName}`
                  : 'BLE Heart Rate / HRV Strap'}
              </span>
            </div>
            {hardwareStatus.bleConnected ? (
              <button
                type="button"
                onClick={onDisconnectBle}
                className="min-h-[44px] min-w-[82px] rounded-xl bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onChangeSourceMode('live_sensors');
                  onConnectBle();
                }}
                className="min-h-[44px] min-w-[82px] rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98]"
              >
                Pair BLE
              </button>
            )}
          </div>

          {cameraError && <p className="text-xs text-amber-700">{cameraError}</p>}
          {micError && <p className="text-xs text-amber-700">{micError}</p>}
          {bleError && <p className="text-xs text-amber-700">{bleError}</p>}
        </div>
      </div>

      {/* Scenario Presets */}
      {sourceMode === 'live_sensors' && (
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Baseline & Confounder Scenarios
          </h2>
          <div className="space-y-2">
            {SCENARIO_OPTIONS.map((opt) => {
              const selected = scenario === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeScenario(opt.id)}
                  className={`min-h-[44px] w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors active:scale-[0.99] ${
                    selected
                      ? 'border-sky-600 bg-sky-50/70 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{opt.detail}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fusion & Observation Window */}
      <div className="border-t border-slate-200 pt-5 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            Multimodal Fusion Engine
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onChangeFusionMode('late')}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                fusionMode === 'late'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Late Fusion
            </button>
            <button
              type="button"
              onClick={() => onChangeFusionMode('attention')}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                fusionMode === 'attention'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attention Fusion
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            Observation Window
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onChangeObservationWindow('quick')}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                observationWindow === 'quick'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick (30–60s)
            </button>
            <button
              type="button"
              onClick={() => onChangeObservationWindow('session')}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                observationWindow === 'session'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Session (5–10m)
            </button>
          </div>
        </div>
      </div>

      {/* Active Modalities Dropout */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          Active Modalities (Dropout Test)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Disable any channel to verify graceful late-fusion fallback.
        </p>
        <div className="space-y-1">
          {(
            [
              { id: 'wristband', label: 'Wristband Physiology (HRV, EDA, Temp)' },
              { id: 'face_rppg', label: 'Face Action Units & rPPG Pulse' },
              { id: 'voice', label: 'Voice Acoustics (F0, Jitter, Shimmer, Rate)' },
              { id: 'kinesics', label: 'Body Movement & Kinesics' },
            ] as { id: ChannelId; label: string }[]
          ).map((ch) => (
            <label
              key={ch.id}
              className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 py-1 text-xs text-slate-700"
            >
              <span>{ch.label}</span>
              <input
                type="checkbox"
                checked={enabledChannels[ch.id]}
                onChange={() => onToggleChannel(ch.id)}
                className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
            </label>
          ))}

          <div className="mt-2 border-t border-slate-100 pt-2.5">
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-xs font-medium text-slate-800">
              <span>Opt-In Language Channel (Weak Context)</span>
              <input
                type="checkbox"
                checked={consent.languageChannelOptIn && enabledChannels.language}
                onChange={() => {
                  const next = !(consent.languageChannelOptIn && enabledChannels.language);
                  onUpdateConsent({
                    languageChannelOptIn: next,
                    sttLiveEnabled: next ? consent.sttLiveEnabled : false,
                  });
                  if (next !== enabledChannels.language) onToggleChannel('language');
                }}
                className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
            </label>

            {consent.languageChannelOptIn && enabledChannels.language && (
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 pl-3 text-xs text-slate-600">
                <span>Live Browser SpeechRecognition</span>
                <input
                  type="checkbox"
                  checked={consent.sttLiveEnabled}
                  disabled={!hardwareStatus.sttSupported}
                  onChange={() =>
                    onUpdateConsent({ sttLiveEnabled: !consent.sttLiveEnabled })
                  }
                  className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-600 disabled:opacity-40"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Record Observation Form */}
      <form onSubmit={handleSave} className="border-t border-slate-200 pt-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Record Observation</h2>
        <div>
          <label htmlFor="session-tag" className="mb-1 block text-xs text-slate-600">
            Activity Tag (User-Entered)
          </label>
          <input
            id="session-tag"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="e.g., Reading, Exam prep, Walk"
            className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="session-note" className="mb-1 block text-xs text-slate-600">
            Optional Context Note
          </label>
          <input
            id="session-note"
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Shown beside reading, never inferred"
            className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="min-h-[46px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.98]"
        >
          {savedFeedback ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>Saved to Local History</span>
            </>
          ) : (
            <span>Log Reading to History</span>
          )}
        </button>
      </form>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
      {/* Source Mode & Calibration Context Strip */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onChangeSourceMode('live_sensors')}
            className={`min-h-[40px] rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              sourceMode === 'live_sensors'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Sensors & Sim
          </button>
          <button
            type="button"
            onClick={() => onChangeSourceMode('dataset_replay')}
            className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              sourceMode === 'dataset_replay'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dataset Replay</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
          <span>
            Baseline:{' '}
            <strong className="text-slate-900">
              {baseline.calibrated ? `Personal (${baseline.sessionCount}s)` : 'Population Fallback'}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>On-device only</span>
          {!baseline.calibrated && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onGoToBaseline}
                className="font-semibold text-sky-700 hover:underline whitespace-nowrap"
              >
                Calibrate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dataset Replay Controller (WESAD / StressID / UBFC-Phys) */}
      {sourceMode === 'dataset_replay' && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{activeReplayProfile.name}</span>
                <span aria-hidden="true">·</span>
                <span>{activeReplayProfile.citation}</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-sky-800">
                Phase: {activeReplayPhase.label} —{' '}
                <span className="font-normal text-slate-600">{activeReplayPhase.detail}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {DATASET_REPLAY_PROFILES.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => onChangeReplayDatasetId(prof.id)}
                  className={`min-h-[40px] rounded-xl border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    replayDatasetId === prof.id
                      ? 'border-sky-600 bg-sky-50 text-sky-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {prof.id.toUpperCase().replace('_', '-')}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onToggleReplayPlaying}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {replayPlaying ? (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleReplaySpeed}
              className="min-h-[44px] min-w-[48px] rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              {replaySpeed}x
            </button>

            <div className="flex-1 min-w-[180px]">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(replayProgressPct)}
                onChange={(e) => onChangeReplayProgress(Number(e.target.value))}
                aria-label="Scrub dataset replay timeline"
                className="w-full h-2 accent-sky-600 cursor-pointer"
              />
            </div>

            <span className="font-mono text-xs text-slate-600 tabular-nums">
              {Math.round(replayProgressPct)}%
            </span>
          </div>
        </section>
      )}

      {/* Main Responsive Workbench: 12-Col Desktop / Thumb-Ergonomic Mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Desktop Docked Left Controls Rail */}
        <aside className="hidden lg:block lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5">
          {controlsContent}
        </aside>

        {/* Analytical Viewport Stage */}
        <main className="lg:col-span-8 space-y-5">
          {/* Hero Calibrated Radial Gauge & Quick Hardware Strip */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
              {/* SVG Clinical 240-Degree Radial Arc Gauge */}
              <div className="relative mx-auto flex h-[148px] w-[148px] shrink-0 items-center justify-center sm:mx-0">
                <svg
                  viewBox="0 0 148 148"
                  className="h-full w-full"
                  role="img"
                  aria-label={`Calibrated stress estimate ${assessment.index} out of 100, ${assessment.band} band`}
                >
                  <g transform="rotate(150 74 74)">
                    <circle
                      cx="74"
                      cy="74"
                      r={arcRadius}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray={`${arcSpan} ${arcCircumference}`}
                    />
                    <circle
                      cx="74"
                      cy="74"
                      r={arcRadius}
                      fill="none"
                      stroke={strokeHex}
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray={`${arcFilled} ${arcCircumference}`}
                      className="transition-[stroke-dasharray,stroke] duration-200"
                    />
                  </g>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 text-center">
                  <span className="font-mono text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {assessment.index}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    / 100
                  </span>
                  <span className={`mt-0.5 text-xs font-bold ${currentBandMeta.textClass}`}>
                    {assessment.band}
                  </span>
                </div>
              </div>

              {/* Calibration Context, Narrative & 3-Stat Telemetry */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">
                    Calibrated Model Estimate ·{' '}
                    {baseline.calibrated ? 'Personal Baseline' : 'Population Priors'}
                  </p>
                  <button
                    type="button"
                    onClick={onToggleRunning}
                    className="hidden sm:inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Live</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Paused</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {assessment.nonDiagnosticSummary}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3.5">
                  <div>
                    <div className="text-[11px] text-slate-500">Confidence</div>
                    <div className="font-mono text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
                      {assessment.confidence}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Baseline Shift</div>
                    <div className="font-mono text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
                      +{assessment.baselineDeviationSigma.toFixed(1)}σ
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Fusion / Window</div>
                    <div className="font-mono text-xs sm:text-sm font-semibold text-slate-900 mt-1">
                      {fusionMode === 'attention' ? 'Attn' : 'Late'} ·{' '}
                      {observationWindow === 'session' ? '5–10m' : '30–60s'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Band Spectrum Scale */}
            <div className="mt-5">
              <div className="relative h-3 w-full overflow-hidden rounded-lg flex">
                {STRESS_BANDS.map((b) => (
                  <div
                    key={b.band}
                    className={`h-full flex-1 ${b.colorClass} opacity-90`}
                    title={`${b.band}: ${b.range}`}
                  />
                ))}
              </div>
              <div className="relative h-3.5 w-full">
                <div
                  className="absolute top-0 -translate-x-1/2 transition-transform duration-150"
                  style={{ left: `${assessment.index}%` }}
                >
                  <div className="mx-auto h-0 w-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-5 text-center text-[11px] sm:text-xs font-medium text-slate-500">
                {STRESS_BANDS.map((b) => (
                  <div key={b.band} className="truncate px-0.5">
                    <span className={assessment.band === b.band ? 'font-bold text-slate-900' : ''}>
                      {b.band}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick 1-Tap Hardware Bar (Accessible on both Mobile and Desktop) */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
              <button
                type="button"
                onClick={handleQuickCameraToggle}
                className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors active:scale-[0.98] ${
                  consent.cameraEnabled && sourceMode === 'live_sensors'
                    ? 'border-sky-600 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{hardwareStatus.liveCameraReady ? 'Cam Live' : 'Start Cam'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickMicToggle}
                className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors active:scale-[0.98] ${
                  consent.microphoneEnabled && sourceMode === 'live_sensors'
                    ? 'border-sky-600 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{hardwareStatus.liveMicReady ? 'Mic Live' : 'Start Mic'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickBleToggle}
                className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors active:scale-[0.98] ${
                  hardwareStatus.bleConnected
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bluetooth className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {hardwareStatus.bleConnected
                    ? `BLE ${hardwareStatus.bleHeartRateBpm ?? '--'}`
                    : 'Pair BLE'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenControlsSheet}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white active:scale-[0.98] lg:hidden"
              >
                <Sliders className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Fusion & Log</span>
              </button>

              <button
                type="button"
                onClick={onGoToBaseline}
                className="hidden lg:inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                <span>{baseline.calibrated ? 'Refine Baseline' : 'Calibrate'}</span>
              </button>
            </div>

            {(cameraError || micError || bleError) && (
              <div className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
                {cameraError && <p>{cameraError}</p>}
                {micError && <p>{micError}</p>}
                {bleError && <p>{bleError}</p>}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span>
                <strong className="text-slate-800">Analytical Estimate Only:</strong> Separates measured signals from model estimates. Not a medical diagnosis or crisis service.
              </span>
            </div>
          </section>

          {/* Confounder Alerts */}
          {assessment.confounders.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
              <div className="mb-2.5 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-amber-950">
                  Active Confounders & Uncertainty
                </h3>
              </div>
              <div className="space-y-2.5">
                {assessment.confounders.map((c) => (
                  <div
                    key={c.id}
                    className="border-t border-amber-200/70 pt-2 first:border-t-0 first:pt-0 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-semibold text-amber-950">{c.label}</span>
                      <span className="font-mono text-[11px] text-amber-800">{c.effectOnModel}</span>
                    </div>
                    <p className="mt-0.5 text-amber-900/90">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Mobile Segmented Sub-View Switcher (Prevents Long Scroll Stack Above Bottom Nav) */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/75 p-1 md:hidden">
            <button
              type="button"
              onClick={() => setMobileSection('channels')}
              className={`min-h-[42px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                mobileSection === 'channels'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Channels
            </button>
            <button
              type="button"
              onClick={() => setMobileSection('fusion')}
              className={`min-h-[42px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                mobileSection === 'fusion'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Signals & Fusion
            </button>
          </div>

          {/* Live Multimodal Channel Cards (Always mounted via CSS visibility so camera/rPPG refs stay active) */}
          <div
            className={`${
              mobileSection === 'channels' ? 'grid' : 'hidden md:grid'
            } grid-cols-1 gap-5 md:grid-cols-3`}
          >
            {/* 1. Face AUs (MediaPipe) + Contactless rPPG Pulse */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Face & rPPG Pulse</h3>
                <span className="font-mono text-[11px] text-slate-500">
                  {sourceMode === 'dataset_replay'
                    ? 'Replay'
                    : hardwareStatus.mediapipeStatus === 'active'
                      ? 'MediaPipe Live'
                      : hardwareStatus.liveCameraReady
                        ? 'Canvas rPPG'
                        : 'Sim Feed'}
                </span>
              </div>

              <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${
                    hardwareStatus.liveCameraReady &&
                    !consent.privacyMaskVideo &&
                    sourceMode === 'live_sensors'
                      ? 'opacity-100'
                      : 'opacity-0'
                  }`}
                />
                <canvas ref={canvasRef} className="hidden" />
                {(!hardwareStatus.liveCameraReady ||
                  consent.privacyMaskVideo ||
                  sourceMode === 'dataset_replay') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                    <Activity className="mb-1 h-5 w-5 text-sky-400" aria-hidden="true" />
                    <span className="text-xs font-medium text-slate-200">
                      {sourceMode === 'dataset_replay'
                        ? `Replaying ${activeReplayProfile.id.toUpperCase()} facial & rPPG frames`
                        : hardwareStatus.liveCameraReady
                          ? 'Privacy Mask Active (MediaPipe & rPPG local)'
                          : 'Tap Start Cam to enable Webcam'}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>rPPG Pulse Waveform</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {features.rppgHeartRateBpm.toFixed(0)} bpm
                  </span>
                </div>
                <svg viewBox="0 0 280 46" className="h-10 w-full" role="img" aria-label="rPPG pulse waveform">
                  <polyline fill="none" stroke="#0284c7" strokeWidth="1.75" points={rppgPoints} />
                </svg>
              </div>

              <dl className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Brow AU4 / Lid AU7</dt>
                  <dd className="font-mono text-slate-900 tabular-nums">
                    {features.browLowerAu4.toFixed(2)} · {features.lidTightenAu7.toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Blink / Gaze</dt>
                  <dd className="font-mono text-slate-900 tabular-nums">
                    {features.blinkRatePerMin.toFixed(0)}/m · {features.gazeShiftScore.toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Luminance Gate</dt>
                  <dd className="font-mono text-slate-900 tabular-nums">
                    {Math.round(features.cameraLuminance * 100)}%
                  </dd>
                </div>
              </dl>
            </section>

            {/* 2. Body Kinesics & Wearable Physiology */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Physiology & Kinesics</h3>
                  <span className="font-mono text-[11px] text-slate-500">
                    {hardwareStatus.bleConnected ? 'BLE Live' : 'Wrist + Pose'}
                  </span>
                </div>

                <dl className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">HRV (RMSSD)</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {features.hrvRmssdMs.toFixed(1)} ms
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Wrist Heart Rate</dt>
                    <dd className="font-mono text-slate-900 tabular-nums">
                      {features.wristHeartRateBpm.toFixed(0)} bpm
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Sweat (EDA)</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {features.edaMicroSiemens.toFixed(2)} µS
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Skin Temp</dt>
                    <dd className="font-mono text-slate-900 tabular-nums">
                      {features.skinTempC.toFixed(1)} °C
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Accel / Motion</dt>
                    <dd className="font-mono text-slate-900 tabular-nums">
                      {features.accelMagnitudeG.toFixed(2)}g · {features.motionEnergy.toFixed(0)}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Posture / Self-Touch</dt>
                    <dd className="font-mono text-slate-900 tabular-nums">
                      {Math.round(features.postureClosure * 100)}% · {features.selfTouchEventsPerMin.toFixed(1)}/m
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100">
                {hardwareStatus.bleConnected ? (
                  <button
                    type="button"
                    onClick={onDisconnectBle}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    BLE Active ({hardwareStatus.bleHeartRateBpm ?? '--'} bpm) · Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSourceMode('live_sensors');
                      onConnectBle();
                    }}
                    className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    <Bluetooth className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
                    <span>Pair BLE Heart Rate Strap</span>
                  </button>
                )}
              </div>
            </section>

            {/* 3. Voice Acoustics (VocalAcousticAnalyzer) & Opt-In Language */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Voice & Language</h3>
                  <span className="font-mono text-[11px] text-slate-500">
                    {hardwareStatus.liveMicReady
                      ? hardwareStatus.micVoiced
                        ? 'Mic · Voiced'
                        : 'Mic · Quiet'
                      : 'Sim Acoustics'}
                  </span>
                </div>

                {/* Live Audio Waveform Oscilloscope */}
                <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Acoustic Waveform (No Audio Saved)</span>
                    <span className="font-mono font-semibold text-slate-800 tabular-nums">
                      {features.pitchHz.toFixed(0)} Hz
                    </span>
                  </div>
                  <svg viewBox="0 0 280 46" className="h-10 w-full" role="img" aria-label="Voice acoustic waveform">
                    <polyline fill="none" stroke="#0f172a" strokeWidth="1.5" points={audioPoints} />
                  </svg>
                </div>

                <dl className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Pitch Jitter (Local)</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {features.jitterPct.toFixed(2)}%
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Amplitude Shimmer</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {features.shimmerPct.toFixed(2)}%
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Speaking Rate</dt>
                    <dd className="font-mono text-slate-900 tabular-nums">
                      {features.speechRateWpm.toFixed(0)} wpm
                    </dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Pause Ratio</dt>
                    <dd className="font-mono text-slate-900 tabular-nums">
                      {Math.round(features.pauseRatio * 100)}%
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Opt-In Language Lexicon</span>
                  <span className="text-[11px] text-slate-500">
                    {consent.languageChannelOptIn && enabledChannels.language
                      ? hardwareStatus.sttListening
                        ? 'STT Live'
                        : 'Opted In'
                      : 'Acoustics Only'}
                  </span>
                </div>

                {consent.languageChannelOptIn && enabledChannels.language ? (
                  <div className="space-y-2">
                    {hardwareStatus.sttSupported && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateConsent({ sttLiveEnabled: !consent.sttLiveEnabled })
                        }
                        className={`min-h-[38px] w-full rounded-xl border px-3 text-xs font-medium transition-colors ${
                          consent.sttLiveEnabled
                            ? 'border-sky-600 bg-sky-50 text-sky-900'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {consent.sttLiveEnabled
                          ? 'Stop Live SpeechRecognition'
                          : 'Start Live SpeechRecognition'}
                      </button>
                    )}

                    {hardwareStatus.lastSttWordsDiscarded !== null && (
                      <p className="text-[11px] text-emerald-700">
                        Processed {hardwareStatus.lastSttWordsDiscarded} spoken words locally and discarded raw text.
                      </p>
                    )}
                    <textarea
                      rows={2}
                      value={speechDraft}
                      onChange={(e) => setSpeechDraft(e.target.value)}
                      placeholder="Or type phrase to score locally & discard..."
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleProcessLanguageSnippet}
                        className="min-h-[40px] rounded-xl bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        Extract & Discard
                      </button>
                      {lastLexiconResult && (
                        <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                          Neg: {Math.round(lastLexiconResult.negativeRatio * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateConsent({ languageChannelOptIn: true });
                      if (!enabledChannels.language) onToggleChannel('language');
                    }}
                    className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Opt In to Local Speech Lexicon
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* Top Contributing Signals & Fusion Weights */}
          <div
            className={`${
              mobileSection === 'fusion' ? 'grid' : 'hidden md:grid'
            } grid-cols-1 gap-5 md:grid-cols-2`}
          >
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">
                Top Contributing Signals
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Largest deviations from {baseline.calibrated ? 'personal baseline' : 'population priors'}.
              </p>
              <div className="divide-y divide-slate-100">
                {assessment.topContributors.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div>
                      <div className="font-medium text-slate-900">{sig.label}</div>
                      <div className="text-slate-500">
                        Base: <span className="font-mono tabular-nums">{sig.baselineValue}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {sig.measuredValue}
                      </div>
                      <div
                        className={`font-mono text-[11px] tabular-nums ${
                          sig.zScore > 1.0
                            ? 'text-orange-700'
                            : sig.zScore > 0.5
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {sig.zScore >= 0 ? `+${sig.zScore.toFixed(2)}σ` : `${sig.zScore.toFixed(2)}σ`} · {sig.direction}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">
                Channel Fusion Weights
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Effective modality contributions after quality and confounder gates.
              </p>
              <div className="space-y-3">
                {assessment.channelScores.map((ch) => (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={ch.enabled ? 'font-medium text-slate-800' : 'text-slate-400 line-through'}>
                        {ch.label}
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {ch.enabled
                          ? `Sub ${ch.subIndex} · ${Math.round(ch.weightApplied * 100)}%`
                          : 'Off'}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          ch.enabled ? 'bg-sky-600' : 'bg-slate-200'
                        }`}
                        style={{ width: `${ch.enabled ? Math.round(ch.weightApplied * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Mobile Slide-Up Bottom Sheet for Controls (< 1024px) */}
      {isControlsSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-xs lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Sensors, Fusion, and Logging Controls"
        >
          <div className="max-h-[86vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Sensors, Fusion & Observation Log
              </h2>
              <button
                type="button"
                onClick={onCloseControlsSheet}
                aria-label="Close controls sheet"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {controlsContent}
          </div>
        </div>
      )}
    </div>
  );
};
