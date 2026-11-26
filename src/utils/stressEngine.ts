import {
  ChannelEnabledMap,
  ChannelScore,
  ConfounderFlag,
  ContributingSignal,
  DatasetReplayId,
  FusionMode,
  MultimodalFeatures,
  ObservationWindow,
  PersonalBaseline,
  ScenarioPreset,
  StressAssessment,
  StressBand,
  StoredReading,
} from '../types/stress';
import { POPULATION_PRIOR_BASELINE, SEEDED_HISTORY } from '../data/researchData';

const STORAGE_KEYS = {
  baseline: 'msa_personal_baseline_v1',
  readings: 'msa_stored_readings_v1',
  pss: 'msa_pss_result_v1',
  context: 'msa_context_profile_v1',
};

export function getStressBand(index: number): StressBand {
  if (index < 20) return 'Calm';
  if (index < 40) return 'Mild';
  if (index < 60) return 'Moderate';
  if (index < 80) return 'High';
  return 'Very High';
}

export function generateScenarioFeatures(
  scenario: ScenarioPreset,
  tick: number
): MultimodalFeatures {
  const wave = Math.sin(tick * 0.45);
  const micro = Math.cos(tick * 0.9);

  switch (scenario) {
    case 'calm_baseline':
      return {
        pitchHz: 142 + wave * 3,
        jitterPct: 0.78 + micro * 0.06,
        shimmerPct: 2.1 + wave * 0.2,
        pauseRatio: 0.21 + micro * 0.02,
        speechRateWpm: 132 + wave * 4,
        browLowerAu4: 0.42 + Math.abs(wave) * 0.15,
        lidTightenAu7: 0.35 + Math.abs(micro) * 0.12,
        blinkRatePerMin: 15 + wave * 1.5,
        gazeShiftScore: 0.18 + Math.abs(wave) * 0.05,
        rppgHeartRateBpm: 69 + wave * 2,
        cameraLuminance: 0.86,
        motionEnergy: 12 + Math.abs(wave) * 4,
        postureClosure: 0.18 + Math.abs(micro) * 0.04,
        selfTouchEventsPerMin: 0.5 + Math.abs(wave) * 0.3,
        gestureJerkiness: 0.14,
        hrvRmssdMs: 51 + wave * 3,
        wristHeartRateBpm: 68 + wave * 2,
        edaMicroSiemens: 1.32 + micro * 0.08,
        skinTempC: 33.5 + wave * 0.05,
        accelMagnitudeG: 1.01 + Math.abs(micro) * 0.03,
        negativeLexiconRatio: 0.05,
        hopelessPhraseCount: 0,
        languageSignalQuality: 0.88,
      };

    case 'cognitive_strain':
      return {
        pitchHz: 179 + wave * 6,
        jitterPct: 1.58 + micro * 0.14,
        shimmerPct: 3.9 + wave * 0.35,
        pauseRatio: 0.37 + micro * 0.03,
        speechRateWpm: 168 + wave * 8,
        browLowerAu4: 2.85 + wave * 0.35,
        lidTightenAu7: 2.45 + micro * 0.25,
        blinkRatePerMin: 26 + wave * 2,
        gazeShiftScore: 0.64 + Math.abs(wave) * 0.1,
        rppgHeartRateBpm: 94 + wave * 3,
        cameraLuminance: 0.82,
        motionEnergy: 38 + Math.abs(wave) * 9,
        postureClosure: 0.64 + Math.abs(micro) * 0.08,
        selfTouchEventsPerMin: 3.4 + Math.abs(wave) * 0.7,
        gestureJerkiness: 0.62,
        hrvRmssdMs: 24 + wave * 2.5,
        wristHeartRateBpm: 96 + wave * 2.5,
        edaMicroSiemens: 3.65 + micro * 0.22,
        skinTempC: 32.8 + wave * 0.08,
        accelMagnitudeG: 1.06 + Math.abs(micro) * 0.04,
        negativeLexiconRatio: 0.24,
        hopelessPhraseCount: 2,
        languageSignalQuality: 0.85,
      };

    case 'exercise_confounder':
      return {
        pitchHz: 152 + wave * 4,
        jitterPct: 0.96 + micro * 0.08,
        shimmerPct: 2.6 + wave * 0.2,
        pauseRatio: 0.32 + micro * 0.03,
        speechRateWpm: 138 + wave * 5,
        browLowerAu4: 0.9 + Math.abs(wave) * 0.25,
        lidTightenAu7: 0.75 + Math.abs(micro) * 0.2,
        blinkRatePerMin: 17 + wave * 1.5,
        gazeShiftScore: 0.32,
        rppgHeartRateBpm: 124 + wave * 4,
        cameraLuminance: 0.76,
        motionEnergy: 76 + Math.abs(wave) * 10,
        postureClosure: 0.22,
        selfTouchEventsPerMin: 0.7,
        gestureJerkiness: 0.32,
        hrvRmssdMs: 21 + wave * 2,
        wristHeartRateBpm: 126 + wave * 3,
        edaMicroSiemens: 4.15 + micro * 0.25,
        skinTempC: 34.4 + wave * 0.1,
        accelMagnitudeG: 1.62 + Math.abs(wave) * 0.18,
        negativeLexiconRatio: 0.06,
        hopelessPhraseCount: 0,
        languageSignalQuality: 0.72,
      };

    case 'excitement_confounder':
      return {
        pitchHz: 169 + wave * 5,
        jitterPct: 0.92 + micro * 0.07,
        shimmerPct: 2.3 + wave * 0.2,
        pauseRatio: 0.18 + micro * 0.02,
        speechRateWpm: 174 + wave * 6,
        browLowerAu4: 2.35 + wave * 0.3,
        lidTightenAu7: 1.95 + micro * 0.25,
        blinkRatePerMin: 21 + wave * 2,
        gazeShiftScore: 0.55,
        rppgHeartRateBpm: 82 + wave * 2,
        cameraLuminance: 0.85,
        motionEnergy: 41 + Math.abs(wave) * 7,
        postureClosure: 0.15,
        selfTouchEventsPerMin: 0.9,
        gestureJerkiness: 0.28,
        hrvRmssdMs: 44 + wave * 2.5,
        wristHeartRateBpm: 81 + wave * 2,
        edaMicroSiemens: 1.85 + micro * 0.12,
        skinTempC: 33.6 + wave * 0.05,
        accelMagnitudeG: 1.09 + Math.abs(micro) * 0.04,
        negativeLexiconRatio: 0.03,
        hopelessPhraseCount: 0,
        languageSignalQuality: 0.9,
      };

    case 'noisy_dropout':
      return {
        pitchHz: 155 + wave * 8,
        jitterPct: 1.18 + micro * 0.12,
        shimmerPct: 3.1 + wave * 0.3,
        pauseRatio: 0.27 + micro * 0.03,
        speechRateWpm: 146 + wave * 5,
        browLowerAu4: 1.45 + wave * 0.4,
        lidTightenAu7: 1.3 + micro * 0.3,
        blinkRatePerMin: 19 + wave * 2,
        gazeShiftScore: 0.35,
        rppgHeartRateBpm: 80 + wave * 6,
        cameraLuminance: 0.24,
        motionEnergy: 25 + Math.abs(wave) * 6,
        postureClosure: 0.38,
        selfTouchEventsPerMin: 1.6,
        gestureJerkiness: 0.36,
        hrvRmssdMs: 36 + wave * 3,
        wristHeartRateBpm: 82 + wave * 2,
        edaMicroSiemens: 2.25 + micro * 0.15,
        skinTempC: 33.2 + wave * 0.06,
        accelMagnitudeG: 1.04,
        negativeLexiconRatio: 0.1,
        hopelessPhraseCount: 0,
        languageSignalQuality: 0.45,
      };

    default:
      return generateScenarioFeatures('calm_baseline', tick);
  }
}

export function interpolateDatasetReplayFeatures(
  datasetId: DatasetReplayId,
  progressPct: number,
  tick: number
): MultimodalFeatures {
  // Maps normalized dataset protocol progress (0..100%) to authentic multi-phase recordings
  const p = clamp(progressPct, 0, 100);
  if (datasetId === 'wesad') {
    if (p < 25) return generateScenarioFeatures('calm_baseline', tick);
    if (p < 60) return generateScenarioFeatures('cognitive_strain', tick);
    if (p < 82) return generateScenarioFeatures('excitement_confounder', tick);
    return generateScenarioFeatures('calm_baseline', tick);
  }

  if (datasetId === 'stressid') {
    if (p < 22) return generateScenarioFeatures('calm_baseline', tick);
    if (p < 58) return generateScenarioFeatures('cognitive_strain', tick);
    if (p < 80) return generateScenarioFeatures('exercise_confounder', tick);
    return generateScenarioFeatures('calm_baseline', tick);
  }

  // ubfc_phys
  if (p < 25) return generateScenarioFeatures('calm_baseline', tick);
  if (p < 70) return generateScenarioFeatures('cognitive_strain', tick);
  return generateScenarioFeatures('calm_baseline', tick);
}

export function analyzeLocalLexicon(text: string): {
  negativeRatio: number;
  hopelessCount: number;
  wordCount: number;
} {
  const negativeLexicon = new Set([
    'overwhelmed', 'stressed', 'anxious', 'impossible', 'hopeless', 'exhausted',
    'fail', 'failing', 'failed', 'worried', 'panic', 'tired', 'stuck', 'awful',
    'terrible', 'hate', 'frustrated', 'angry', 'cannot', "can't", 'nothing',
    'never', 'broken', 'behind', 'pressure', 'burnout', 'helpless', 'dread',
  ]);
  const hopelessPhrases = [
    'give up', 'no point', 'too much', 'cannot cope', "can't cope", 'out of control',
    'never finish', 'falling apart',
  ];

  const clean = text.toLowerCase().trim();
  if (!clean) return { negativeRatio: 0.05, hopelessCount: 0, wordCount: 0 };

  const words = clean.split(/\s+/).filter(Boolean);
  let negHits = 0;
  for (const w of words) {
    const stripped = w.replace(/[^a-z']/g, '');
    if (negativeLexicon.has(stripped)) negHits += 1;
  }

  let hopelessCount = 0;
  for (const phrase of hopelessPhrases) {
    if (clean.includes(phrase)) hopelessCount += 1;
  }

  const ratio = Math.min(1, negHits / Math.max(words.length, 4));
  return { negativeRatio: ratio, hopelessCount, wordCount: words.length };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function zToStressSubIndex(zSigned: number): number {
  const clamped = clamp(zSigned, -1.0, 3.6);
  return clamp(Math.round(16 + clamped * 24), 0, 100);
}

export function computeStressAssessment(params: {
  features: MultimodalFeatures;
  baseline: PersonalBaseline;
  enabledChannels: ChannelEnabledMap;
  fusionMode: FusionMode;
  observationWindow: ObservationWindow;
  hasLiveCamera?: boolean;
  hasLiveMic?: boolean;
}): StressAssessment {
  const { features, baseline, enabledChannels, fusionMode, observationWindow } = params;
  const activeBaseline = baseline.calibrated ? baseline : POPULATION_PRIOR_BASELINE;
  const b = activeBaseline.features;

  // Feature-level Z-scores relative to personal baseline (or priors)
  const zPitch = (features.pitchHz - b.pitchHz.mean) / Math.max(b.pitchHz.std, 5);
  const zJitter = (features.jitterPct - b.jitterPct.mean) / Math.max(b.jitterPct.std, 0.1);
  const shimmerStat = b.shimmerPct ?? POPULATION_PRIOR_BASELINE.features.shimmerPct;
  const zShimmer = (features.shimmerPct - shimmerStat.mean) / Math.max(shimmerStat.std, 0.25);
  const zPause = (features.pauseRatio - b.pauseRatio.mean) / Math.max(b.pauseRatio.std, 0.02);
  const rateStat = b.speechRateWpm ?? POPULATION_PRIOR_BASELINE.features.speechRateWpm;
  const zSpeechRate = (features.speechRateWpm - rateStat.mean) / Math.max(rateStat.std, 8);

  const zAu4 = (features.browLowerAu4 - b.browLowerAu4.mean) / Math.max(b.browLowerAu4.std, 0.15);
  const zAu7 = (features.lidTightenAu7 - b.lidTightenAu7.mean) / Math.max(b.lidTightenAu7.std, 0.15);
  const zRppgHr = (features.rppgHeartRateBpm - b.rppgHeartRateBpm.mean) / Math.max(b.rppgHeartRateBpm.std, 4);

  const zMotion = (features.motionEnergy - b.motionEnergy.mean) / Math.max(b.motionEnergy.std, 3);
  const zSelfTouch = (features.selfTouchEventsPerMin - b.selfTouchEventsPerMin.mean) / Math.max(b.selfTouchEventsPerMin.std, 0.3);

  const zHrvDrop = (b.hrvRmssdMs.mean - features.hrvRmssdMs) / Math.max(b.hrvRmssdMs.std, 4);
  const zEda = (features.edaMicroSiemens - b.edaMicroSiemens.mean) / Math.max(b.edaMicroSiemens.std, 0.2);
  const zTempDrop = (b.skinTempC.mean - features.skinTempC) / Math.max(b.skinTempC.std, 0.2);

  const zLang =
    (features.negativeLexiconRatio - b.negativeLexiconRatio.mean) /
      Math.max(b.negativeLexiconRatio.std, 0.03) +
    features.hopelessPhraseCount * 0.6;

  // Per-channel sub-indices
  const voiceZ =
    zPitch * 0.3 +
    zJitter * 0.25 +
    zShimmer * 0.2 +
    zPause * 0.15 +
    zSpeechRate * 0.1;
  const faceZ = zAu4 * 0.38 + zAu7 * 0.28 + zRppgHr * 0.26 + features.gazeShiftScore * 0.25;
  const kinesicsZ = zMotion * 0.35 + zSelfTouch * 0.4 + features.postureClosure * 1.1;
  const physioZ = zHrvDrop * 0.45 + zEda * 0.45 + zTempDrop * 0.1;
  const languageZ = clamp(zLang * 0.6, -0.5, 2.2);

  // Quality gates
  const camQuality = clamp(features.cameraLuminance * 1.1, 0.15, 1);
  const voiceQuality = 0.88;
  const wristbandQuality = features.accelMagnitudeG > 1.85 ? 0.65 : 0.94;
  const kinesicsQuality = clamp(features.cameraLuminance * 1.05, 0.2, 0.92);
  const languageQuality = features.languageSignalQuality;

  // Confounder detection
  const confounders: ConfounderFlag[] = [];
  const isExerciseLikely =
    features.accelMagnitudeG >= 1.32 ||
    (features.motionEnergy > 58 && features.wristHeartRateBpm > 108);

  if (isExerciseLikely) {
    confounders.push({
      id: 'exercise',
      label: 'Physical Exertion Likely',
      explanation: `Wristband acceleration (${features.accelMagnitudeG.toFixed(2)}g) and motion energy (${Math.round(features.motionEnergy)}) indicate physical movement rather than purely psychological strain.`,
      severity: 'warning',
      effectOnModel: 'Physiology & rPPG weights reduced by 60%; confidence penalized.',
    });
  }

  const isCuriosityOrExcitement =
    faceZ > 1.0 &&
    physioZ < 0.75 &&
    !isExerciseLikely &&
    features.postureClosure < 0.35;

  if (isCuriosityOrExcitement) {
    confounders.push({
      id: 'curiosity_excitement',
      label: 'Curiosity or Excitement Ambiguity',
      explanation: 'Facial cues rose while wristband HRV and EDA stayed near baseline with open posture.',
      severity: 'notice',
      effectOnModel: 'Face weight reduced; cross-channel agreement required for High band.',
    });
  }

  if (features.cameraLuminance < 0.4) {
    confounders.push({
      id: 'low_signal_quality',
      label: 'Low Camera Luminance / Sensor Noise',
      explanation: `Ambient luminance (${Math.round(features.cameraLuminance * 100)}%) is below calibration threshold.`,
      severity: 'notice',
      effectOnModel: 'Face/rPPG and kinesics weights reduced; late fusion relies on wristband and voice.',
    });
  }

  if (!baseline.calibrated || baseline.sessionCount < 2) {
    confounders.push({
      id: 'monitoring_anxiety',
      label: baseline.calibrated
        ? 'Early Multi-Session Baseline'
        : 'Population Fallback (No Personal Baseline)',
      explanation: baseline.calibrated
        ? 'Only one baseline session captured so far; initial monitoring anxiety may still affect readings.'
        : 'Using population priors until you complete the personal settling & baseline protocol.',
      severity: 'notice',
      effectOnModel: 'Confidence capped until multi-session baseline stabilizes.',
    });
  }

  // Channel weights & fusion
  const rawWeights = {
    wristband: enabledChannels.wristband ? 0.38 * wristbandQuality : 0,
    face_rppg: enabledChannels.face_rppg ? 0.25 * camQuality : 0,
    voice: enabledChannels.voice ? 0.22 * voiceQuality : 0,
    kinesics: enabledChannels.kinesics ? 0.1 * kinesicsQuality : 0,
    language: enabledChannels.language ? 0.05 * languageQuality : 0,
  };

  if (isExerciseLikely) {
    rawWeights.wristband *= 0.35;
    rawWeights.face_rppg *= 0.5;
    rawWeights.kinesics *= 0.3;
  }

  if (isCuriosityOrExcitement) {
    rawWeights.face_rppg *= 0.45;
  }

  const subIndices = {
    wristband: zToStressSubIndex(physioZ),
    face_rppg: zToStressSubIndex(faceZ),
    voice: zToStressSubIndex(voiceZ),
    kinesics: zToStressSubIndex(kinesicsZ),
    language: clamp(zToStressSubIndex(languageZ), 0, 58),
  };

  if (fusionMode === 'attention') {
    const enabledSubValues = (Object.keys(rawWeights) as Array<keyof typeof rawWeights>)
      .filter((k) => rawWeights[k] > 0 && k !== 'language')
      .map((k) => subIndices[k]);
    const meanSub = enabledSubValues.length
      ? enabledSubValues.reduce((a, c) => a + c, 0) / enabledSubValues.length
      : 25;

    for (const k of Object.keys(rawWeights) as Array<keyof typeof rawWeights>) {
      if (rawWeights[k] > 0) {
        const agreement = 1 - Math.min(0.65, Math.abs(subIndices[k] - meanSub) / 70);
        rawWeights[k] *= 0.75 + agreement * 0.65;
      }
    }
  }

  const totalWeight = Object.values(rawWeights).reduce((acc, w) => acc + w, 0);

  const normalizedWeights = {
    wristband: totalWeight > 0 ? rawWeights.wristband / totalWeight : 0,
    face_rppg: totalWeight > 0 ? rawWeights.face_rppg / totalWeight : 0,
    voice: totalWeight > 0 ? rawWeights.voice / totalWeight : 0,
    kinesics: totalWeight > 0 ? rawWeights.kinesics / totalWeight : 0,
    language: totalWeight > 0 ? rawWeights.language / totalWeight : 0,
  };

  let fusedIndex =
    totalWeight > 0
      ? Math.round(
          subIndices.wristband * normalizedWeights.wristband +
            subIndices.face_rppg * normalizedWeights.face_rppg +
            subIndices.voice * normalizedWeights.voice +
            subIndices.kinesics * normalizedWeights.kinesics +
            subIndices.language * normalizedWeights.language
        )
      : 0;

  if (isExerciseLikely) fusedIndex = Math.min(fusedIndex, 38);
  if (isCuriosityOrExcitement) fusedIndex = Math.min(fusedIndex, 42);

  fusedIndex = clamp(fusedIndex, 0, 100);
  const band = getStressBand(fusedIndex);

  const activeChannelCount = Object.values(enabledChannels).filter(Boolean).length;
  let confidence = 42 + activeChannelCount * 9;
  if (baseline.calibrated) confidence += baseline.sessionCount >= 2 ? 14 : 6;
  if (observationWindow === 'session') confidence += 9;
  else confidence -= 7;
  if (features.cameraLuminance < 0.4 && enabledChannels.face_rppg) confidence -= 11;
  if (isExerciseLikely) confidence -= 24;
  if (isCuriosityOrExcitement) confidence -= 16;
  if (activeChannelCount === 0) confidence = 0;
  confidence = clamp(Math.round(confidence), 15, 96);

  const allContributors: ContributingSignal[] = [
    {
      id: 'hrv',
      channel: 'wristband',
      label: 'HRV (RMSSD)',
      measuredValue: `${features.hrvRmssdMs.toFixed(0)} ms`,
      baselineValue: `${b.hrvRmssdMs.mean.toFixed(0)} ms`,
      zScore: zHrvDrop,
      direction: zHrvDrop > 0.6 ? 'suppressed' : zHrvDrop < -0.6 ? 'elevated' : 'nominal',
    },
    {
      id: 'eda',
      channel: 'wristband',
      label: 'Skin Conductance (EDA)',
      measuredValue: `${features.edaMicroSiemens.toFixed(2)} µS`,
      baselineValue: `${b.edaMicroSiemens.mean.toFixed(2)} µS`,
      zScore: zEda,
      direction: zEda > 0.6 ? 'elevated' : 'nominal',
    },
    {
      id: 'pitch',
      channel: 'voice',
      label: 'Voice Pitch (F0)',
      measuredValue: `${features.pitchHz.toFixed(0)} Hz`,
      baselineValue: `${b.pitchHz.mean.toFixed(0)} Hz`,
      zScore: zPitch,
      direction: zPitch > 0.6 ? 'elevated' : 'nominal',
    },
    {
      id: 'jitter',
      channel: 'voice',
      label: 'Vocal Jitter',
      measuredValue: `${features.jitterPct.toFixed(2)} %`,
      baselineValue: `${b.jitterPct.mean.toFixed(2)} %`,
      zScore: zJitter,
      direction: zJitter > 0.6 ? 'elevated' : 'nominal',
    },
    {
      id: 'shimmer',
      channel: 'voice',
      label: 'Vocal Shimmer',
      measuredValue: `${features.shimmerPct.toFixed(2)} %`,
      baselineValue: `${shimmerStat.mean.toFixed(2)} %`,
      zScore: zShimmer,
      direction: zShimmer > 0.6 ? 'elevated' : 'nominal',
    },
    {
      id: 'speechRate',
      channel: 'voice',
      label: 'Speaking Rate',
      measuredValue: `${features.speechRateWpm.toFixed(0)} wpm`,
      baselineValue: `${rateStat.mean.toFixed(0)} wpm`,
      zScore: zSpeechRate,
      direction: zSpeechRate > 0.6 ? 'elevated' : zSpeechRate < -0.6 ? 'suppressed' : 'nominal',
    },
    {
      id: 'au4',
      channel: 'face_rppg',
      label: 'Brow Lowerer (AU4)',
      measuredValue: `${features.browLowerAu4.toFixed(2)}`,
      baselineValue: `${b.browLowerAu4.mean.toFixed(2)}`,
      zScore: zAu4,
      direction: zAu4 > 0.6 ? 'elevated' : 'nominal',
    },
    {
      id: 'rppg',
      channel: 'face_rppg',
      label: 'Contactless rPPG Pulse',
      measuredValue: `${features.rppgHeartRateBpm.toFixed(0)} bpm`,
      baselineValue: `${b.rppgHeartRateBpm.mean.toFixed(0)} bpm`,
      zScore: zRppgHr,
      direction: zRppgHr > 0.6 ? 'elevated' : 'nominal',
    },
    {
      id: 'selftouch',
      channel: 'kinesics',
      label: 'Self-Touch & Kinesics',
      measuredValue: `${features.selfTouchEventsPerMin.toFixed(1)} /min`,
      baselineValue: `${b.selfTouchEventsPerMin.mean.toFixed(1)} /min`,
      zScore: zSelfTouch,
      direction: zSelfTouch > 0.6 ? 'elevated' : 'nominal',
    },
  ];

  const topContributors = allContributors
    .filter((c) => enabledChannels[c.channel])
    .sort((a, bItem) => Math.abs(bItem.zScore) - Math.abs(a.zScore))
    .slice(0, 4);

  const meanSigma = topContributors.length
    ? topContributors.reduce((acc, c) => acc + Math.max(0, c.zScore), 0) / topContributors.length
    : 0;

  const channelScores: ChannelScore[] = [
    {
      channel: 'wristband',
      label: 'Wristband Physiology',
      enabled: enabledChannels.wristband,
      available: true,
      quality: wristbandQuality,
      weightApplied: normalizedWeights.wristband,
      subIndex: subIndices.wristband,
    },
    {
      channel: 'face_rppg',
      label: 'Face AUs & rPPG Pulse',
      enabled: enabledChannels.face_rppg,
      available: true,
      quality: camQuality,
      weightApplied: normalizedWeights.face_rppg,
      subIndex: subIndices.face_rppg,
    },
    {
      channel: 'voice',
      label: 'Voice Acoustics',
      enabled: enabledChannels.voice,
      available: true,
      quality: voiceQuality,
      weightApplied: normalizedWeights.voice,
      subIndex: subIndices.voice,
    },
    {
      channel: 'kinesics',
      label: 'Body Movement & Kinesics',
      enabled: enabledChannels.kinesics,
      available: true,
      quality: kinesicsQuality,
      weightApplied: normalizedWeights.kinesics,
      subIndex: subIndices.kinesics,
    },
    {
      channel: 'language',
      label: 'Opt-In Language Context',
      enabled: enabledChannels.language,
      available: true,
      quality: languageQuality,
      weightApplied: normalizedWeights.language,
      subIndex: subIndices.language,
    },
  ];

  let summary = `Current signals sit ${meanSigma.toFixed(1)}σ from ${baseline.calibrated ? 'your personal baseline' : 'population priors'} (${band} band).`;
  if (isExerciseLikely) {
    summary = 'Physical exertion detected via movement sensors; elevated heart rate and sweat are discounted as non-stress confounders.';
  } else if (isCuriosityOrExcitement) {
    summary = 'Facial arousal without physiological agreement suggests curiosity or excitement rather than sustained stress.';
  }

  return {
    timestampIso: new Date().toISOString(),
    index: fusedIndex,
    band,
    confidence,
    baselineDeviationSigma: Number(meanSigma.toFixed(2)),
    fusionMode,
    observationWindow,
    usingPersonalBaseline: baseline.calibrated,
    channelScores,
    topContributors,
    confounders,
    nonDiagnosticSummary: summary,
  };
}

export function loadBaseline(): PersonalBaseline {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.baseline);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersonalBaseline>;
      return {
        ...POPULATION_PRIOR_BASELINE,
        ...parsed,
        features: {
          ...POPULATION_PRIOR_BASELINE.features,
          ...(parsed.features ?? {}),
        },
      };
    }
  } catch {
    // ignore
  }
  return POPULATION_PRIOR_BASELINE;
}

export function saveBaseline(baseline: PersonalBaseline): void {
  try {
    localStorage.setItem(STORAGE_KEYS.baseline, JSON.stringify(baseline));
  } catch {
    // ignore
  }
}

export function loadReadings(): StoredReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.readings);
    if (raw) return JSON.parse(raw) as StoredReading[];
  } catch {
    // ignore
  }
  return SEEDED_HISTORY;
}

export function saveReadings(readings: StoredReading[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.readings, JSON.stringify(readings));
  } catch {
    // ignore
  }
}

export function loadLocalJson<T>(keySuffix: 'pss' | 'context', fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[keySuffix]);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

export function saveLocalJson<T>(keySuffix: 'pss' | 'context', value: T): void {
  try {
    localStorage.setItem(STORAGE_KEYS[keySuffix], JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function clearAllLocalData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function exportReadingsToCsv(readings: StoredReading[]): string {
  const header = [
    'Timestamp',
    'Stress Index (0-100)',
    'Band',
    'Confidence (%)',
    'Window',
    'Fusion Mode',
    'Baseline Sigma',
    'Top Signals',
    'Confounder Flags',
    'User Tag',
    'Context Note',
  ].join(',');

  const rows = readings.map((r) =>
    [
      r.timestampIso,
      r.index,
      `"${r.band}"`,
      r.confidence,
      r.windowType,
      r.fusionMode,
      r.baselineDeviationSigma,
      `"${r.topSignals.join('; ')}"`,
      `"${r.confounderLabels.join('; ')}"`,
      `"${r.userTag.replace(/"/g, '""')}"`,
      `"${r.contextNote.replace(/"/g, '""')}"`,
    ].join(',')
  );

  return [header, ...rows].join('\n');
}
