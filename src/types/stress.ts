export type StressBand = 'Calm' | 'Mild' | 'Moderate' | 'High' | 'Very High';

export type FusionMode = 'late' | 'attention';

export type ObservationWindow = 'quick' | 'session';

export type InputSourceMode = 'live_sensors' | 'dataset_replay';

export type DatasetReplayId = 'wesad' | 'stressid' | 'ubfc_phys';

export type ScenarioPreset =
  | 'calm_baseline'
  | 'cognitive_strain'
  | 'exercise_confounder'
  | 'excitement_confounder'
  | 'noisy_dropout';

export type ChannelId = 'voice' | 'face_rppg' | 'kinesics' | 'wristband' | 'language';

export interface ChannelEnabledMap {
  voice: boolean;
  face_rppg: boolean;
  kinesics: boolean;
  wristband: boolean;
  language: boolean;
}

export interface MultimodalFeatures {
  // Voice & Acoustics
  pitchHz: number;
  jitterPct: number;
  shimmerPct: number;
  pauseRatio: number; // 0 to 1
  speechRateWpm: number;

  // Face Action Units & rPPG
  browLowerAu4: number; // 0 to 5 scale
  lidTightenAu7: number; // 0 to 5 scale
  blinkRatePerMin: number;
  gazeShiftScore: number; // 0 to 1
  rppgHeartRateBpm: number;
  cameraLuminance: number; // 0 to 1 quality proxy

  // Body Movement / Kinesics
  motionEnergy: number; // 0 to 100
  postureClosure: number; // 0 to 1 (open to closed/slump)
  selfTouchEventsPerMin: number;
  gestureJerkiness: number; // 0 to 1

  // Wristband Physiology (BLE Heart Rate + EDA / Skin Temp / Accel)
  hrvRmssdMs: number;
  wristHeartRateBpm: number;
  edaMicroSiemens: number;
  skinTempC: number;
  accelMagnitudeG: number; // ~1.0 at rest, >1.35 during exertion

  // Optional Opt-In Language Channel (computed locally, raw text discarded)
  negativeLexiconRatio: number; // 0 to 1
  hopelessPhraseCount: number;
  languageSignalQuality: number; // 0 to 1
}

export interface FeatureStat {
  mean: number;
  std: number;
}

export interface PersonalBaseline {
  calibrated: boolean;
  sessionCount: number;
  settlingCompleted: boolean;
  lastUpdatedIso: string | null;
  features: {
    pitchHz: FeatureStat;
    jitterPct: FeatureStat;
    shimmerPct: FeatureStat;
    pauseRatio: FeatureStat;
    speechRateWpm: FeatureStat;
    browLowerAu4: FeatureStat;
    lidTightenAu7: FeatureStat;
    rppgHeartRateBpm: FeatureStat;
    motionEnergy: FeatureStat;
    selfTouchEventsPerMin: FeatureStat;
    hrvRmssdMs: FeatureStat;
    edaMicroSiemens: FeatureStat;
    skinTempC: FeatureStat;
    negativeLexiconRatio: FeatureStat;
  };
}

export interface ConfounderFlag {
  id:
    | 'exercise'
    | 'curiosity_excitement'
    | 'monitoring_anxiety'
    | 'low_signal_quality'
    | 'low_outward_expression';
  label: string;
  explanation: string;
  severity: 'notice' | 'warning';
  effectOnModel: string;
}

export interface ContributingSignal {
  id: string;
  channel: ChannelId;
  label: string;
  measuredValue: string;
  baselineValue: string;
  zScore: number;
  direction: 'elevated' | 'suppressed' | 'nominal';
}

export interface ChannelScore {
  channel: ChannelId;
  label: string;
  enabled: boolean;
  available: boolean;
  quality: number; // 0 to 1
  weightApplied: number; // 0 to 1 after fusion & confounder adjustment
  subIndex: number; // 0 to 100
}

export interface StressAssessment {
  timestampIso: string;
  index: number; // 0 to 100 calibrated model estimate
  band: StressBand;
  confidence: number; // 0 to 100%
  baselineDeviationSigma: number;
  fusionMode: FusionMode;
  observationWindow: ObservationWindow;
  usingPersonalBaseline: boolean;
  channelScores: ChannelScore[];
  topContributors: ContributingSignal[];
  confounders: ConfounderFlag[];
  nonDiagnosticSummary: string;
}

export interface StoredReading {
  id: string;
  timestampIso: string;
  index: number;
  band: StressBand;
  confidence: number;
  windowType: ObservationWindow;
  fusionMode: FusionMode;
  baselineDeviationSigma: number;
  topSignals: string[];
  confounderLabels: string[];
  userTag: string;
  contextNote: string;
  pssScoreSnapshot?: number;
  sleepHoursSnapshot?: number;
}

export interface PssResult {
  completedAtIso: string;
  answers: number[]; // 10 items, 0-4
  totalScore: number; // 0-40
  category: 'Low perceived stress' | 'Moderate perceived stress' | 'High perceived stress';
}

export interface BackgroundContextProfile {
  ageRange: string;
  sleepHoursLastNight: number;
  physicalActivityLevel: 'Sedentary' | 'Moderate' | 'Active';
  familySupportCloseness: 1 | 2 | 3 | 4 | 5;
  friendSupportCloseness: 1 | 2 | 3 | 4 | 5;
  workStudyContext: string;
  healthOrMedicationNote: string;
  caffeineRecent: boolean;
}

export interface AppConsentState {
  sensingNoticeAccepted: boolean;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  languageChannelOptIn: boolean;
  sttLiveEnabled: boolean;
  privacyMaskVideo: boolean;
}

export interface DatasetReplayProfile {
  id: DatasetReplayId;
  name: string;
  citation: string;
  durationSec: number;
  phases: {
    startPct: number;
    endPct: number;
    label: string;
    detail: string;
  }[];
}

export interface BenchmarkRow {
  id: number;
  feature: string;
  modality: 'Face & Pulse' | 'Voice & Language' | 'Kinesics & Wearable' | 'Calibration & Ethics';
  projectFeature: string;
  androidApp: string;
  androidUrl: string;
  webPlatform: string;
  webUrl: string;
  testActionLabel: string;
  testTarget: 'camera' | 'rppg' | 'mic' | 'language' | 'pose' | 'ble' | 'baseline' | 'confounder' | 'pss' | 'trends' | 'privacy';
}

export interface DatasetInfo {
  name: string;
  signals: string;
  subjects: number | string;
  labels: string;
  reference: string;
  doi?: string;
}

export interface LiveHardwareStatus {
  liveCameraReady: boolean;
  mediapipeStatus: 'idle' | 'loading' | 'active' | 'fallback';
  liveMicReady: boolean;
  micVoiced: boolean;
  sttSupported: boolean;
  sttListening: boolean;
  lastSttWordsDiscarded: number | null;
  bleSupported: boolean;
  bleConnected: boolean;
  bleDeviceName: string | null;
  bleHeartRateBpm: number | null;
  bleHrvRmssdMs: number | null;
}
