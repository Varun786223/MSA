import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar, AppTab } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LiveAnalyserView } from './components/LiveAnalyserView';
import { BaselineContextView } from './components/BaselineContextView';
import { TrendsHistoryView } from './components/TrendsHistoryView';
import { ResearchBenchmarksView } from './components/ResearchBenchmarksView';
import { useLiveSensors } from './hooks/useLiveSensors';
import {
  AppConsentState,
  BackgroundContextProfile,
  BenchmarkRow,
  ChannelEnabledMap,
  ChannelId,
  DatasetReplayId,
  FusionMode,
  InputSourceMode,
  ObservationWindow,
  PersonalBaseline,
  PssResult,
  ScenarioPreset,
  StoredReading,
} from './types/stress';
import { POPULATION_PRIOR_BASELINE, SEEDED_HISTORY } from './data/researchData';
import {
  clearAllLocalData,
  computeStressAssessment,
  loadBaseline,
  loadLocalJson,
  loadReadings,
  saveBaseline,
  saveLocalJson,
  saveReadings,
} from './utils/stressEngine';

const DEFAULT_CONTEXT_PROFILE: BackgroundContextProfile = {
  ageRange: '18–25',
  sleepHoursLastNight: 7.5,
  physicalActivityLevel: 'Moderate',
  familySupportCloseness: 4,
  friendSupportCloseness: 4,
  workStudyContext: 'Coursework & research prototype testing',
  healthOrMedicationNote: '',
  caffeineRecent: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('analyser');
  const [isSessionRunning, setIsSessionRunning] = useState(true);
  const [isControlsSheetOpen, setIsControlsSheetOpen] = useState(false);

  const [sourceMode, setSourceMode] = useState<InputSourceMode>('live_sensors');
  const [scenario, setScenario] = useState<ScenarioPreset>('calm_baseline');
  const [replayDatasetId, setReplayDatasetId] = useState<DatasetReplayId>('wesad');
  const [replayProgressPct, setReplayProgressPct] = useState(12);
  const [replayPlaying, setReplayPlaying] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState<1 | 4>(1);

  const [fusionMode, setFusionMode] = useState<FusionMode>('late');
  const [observationWindow, setObservationWindow] = useState<ObservationWindow>('session');

  const [enabledChannels, setEnabledChannels] = useState<ChannelEnabledMap>({
    wristband: true,
    face_rppg: true,
    voice: true,
    kinesics: true,
    language: false,
  });

  const [consent, setConsent] = useState<AppConsentState>({
    sensingNoticeAccepted: true,
    cameraEnabled: false,
    microphoneEnabled: false,
    languageChannelOptIn: false,
    sttLiveEnabled: false,
    privacyMaskVideo: true,
  });

  const [baseline, setBaseline] = useState<PersonalBaseline>(() => loadBaseline());
  const [readings, setReadings] = useState<StoredReading[]>(() => loadReadings());
  const [pssResult, setPssResult] = useState<PssResult | null>(() =>
    loadLocalJson<PssResult | null>('pss', null)
  );
  const [contextProfile, setContextProfile] = useState<BackgroundContextProfile>(() =>
    loadLocalJson<BackgroundContextProfile>('context', DEFAULT_CONTEXT_PROFILE)
  );
  const [customLexiconOverride, setCustomLexiconOverride] = useState<{
    negativeRatio: number;
    hopelessCount: number;
  } | null>(null);

  // Dataset Replay progression timer
  useEffect(() => {
    if (!isSessionRunning || sourceMode !== 'dataset_replay' || !replayPlaying) return;
    const timer = setInterval(() => {
      setReplayProgressPct((prev) => {
        const next = prev + 0.8 * replaySpeed;
        return next > 100 ? 0 : next;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [isSessionRunning, sourceMode, replayPlaying, replaySpeed]);

  const handleAutoLexiconUpdate = useCallback(
    (res: { negativeRatio: number; hopelessCount: number }) => {
      setCustomLexiconOverride(res);
    },
    []
  );

  const {
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
  } = useLiveSensors({
    isRunning: isSessionRunning,
    sourceMode,
    scenario,
    replayDatasetId,
    replayProgressPct,
    cameraActive: consent.cameraEnabled,
    micActive: consent.microphoneEnabled,
    sttOptIn: consent.languageChannelOptIn && consent.sttLiveEnabled,
    customLexiconOverride,
    onAutoLexiconUpdate: handleAutoLexiconUpdate,
  });

  const assessment = useMemo(
    () =>
      computeStressAssessment({
        features,
        baseline,
        enabledChannels,
        fusionMode,
        observationWindow,
        hasLiveCamera: hardwareStatus.liveCameraReady,
        hasLiveMic: hardwareStatus.liveMicReady,
      }),
    [
      features,
      baseline,
      enabledChannels,
      fusionMode,
      observationWindow,
      hardwareStatus.liveCameraReady,
      hardwareStatus.liveMicReady,
    ]
  );

  const handleToggleChannel = (ch: ChannelId) => {
    setEnabledChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  const handleUpdateConsent = (patch: Partial<AppConsentState>) => {
    setConsent((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateBaseline = (next: PersonalBaseline) => {
    setBaseline(next);
    saveBaseline(next);
  };

  const handleResetBaseline = () => {
    setBaseline(POPULATION_PRIOR_BASELINE);
    saveBaseline(POPULATION_PRIOR_BASELINE);
  };

  const handleSavePss = (res: PssResult) => {
    setPssResult(res);
    saveLocalJson('pss', res);
  };

  const handleSaveContextProfile = (profile: BackgroundContextProfile) => {
    setContextProfile(profile);
    saveLocalJson('context', profile);
  };

  const handleSaveReading = (userTag: string, contextNote: string) => {
    const newEntry: StoredReading = {
      id: `obs-${Date.now()}`,
      timestampIso: assessment.timestampIso,
      index: assessment.index,
      band: assessment.band,
      confidence: assessment.confidence,
      windowType: observationWindow,
      fusionMode,
      baselineDeviationSigma: assessment.baselineDeviationSigma,
      topSignals: assessment.topContributors.map(
        (c) => `${c.label} (${c.zScore >= 0 ? '+' : ''}${c.zScore.toFixed(1)}σ)`
      ),
      confounderLabels: assessment.confounders
        .filter((c) => c.id !== 'monitoring_anxiety')
        .map((c) => c.label),
      userTag,
      contextNote,
      pssScoreSnapshot: pssResult?.totalScore,
      sleepHoursSnapshot: contextProfile.sleepHoursLastNight,
    };

    const updated = [...readings, newEntry];
    setReadings(updated);
    saveReadings(updated);
  };

  const handleDeleteAllLocalData = () => {
    clearAllLocalData();
    setBaseline(POPULATION_PRIOR_BASELINE);
    setReadings([]);
    setPssResult(null);
    setContextProfile(DEFAULT_CONTEXT_PROFILE);
  };

  const handleRestoreSampleHistory = () => {
    setReadings(SEEDED_HISTORY);
    saveReadings(SEEDED_HISTORY);
  };

  const handleTriggerBenchmarkTest = (target: BenchmarkRow['testTarget']) => {
    switch (target) {
      case 'camera':
      case 'pose':
        setSourceMode('live_sensors');
        setConsent((prev) => ({ ...prev, cameraEnabled: true }));
        setEnabledChannels((prev) => ({ ...prev, face_rppg: true, kinesics: true }));
        setActiveTab('analyser');
        break;
      case 'rppg':
        setSourceMode('dataset_replay');
        setReplayDatasetId('ubfc_phys');
        setReplayProgressPct(35);
        setReplayPlaying(true);
        setActiveTab('analyser');
        break;
      case 'mic':
        setSourceMode('live_sensors');
        setConsent((prev) => ({ ...prev, microphoneEnabled: true }));
        setEnabledChannels((prev) => ({ ...prev, voice: true }));
        setActiveTab('analyser');
        break;
      case 'language':
        setSourceMode('live_sensors');
        setConsent((prev) => ({
          ...prev,
          languageChannelOptIn: true,
          sttLiveEnabled: hardwareStatus.sttSupported,
        }));
        setEnabledChannels((prev) => ({ ...prev, language: true }));
        setActiveTab('analyser');
        break;
      case 'ble':
        setSourceMode('dataset_replay');
        setReplayDatasetId('wesad');
        setReplayProgressPct(30);
        setReplayPlaying(true);
        setActiveTab('analyser');
        break;
      case 'baseline':
      case 'pss':
      case 'privacy':
        setActiveTab('baseline');
        break;
      case 'confounder':
        setSourceMode('live_sensors');
        setScenario('exercise_confounder');
        setActiveTab('analyser');
        break;
      case 'trends':
        setActiveTab('trends');
        break;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-[72px] lg:pb-0">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isSessionRunning={isSessionRunning}
        onToggleSession={() => setIsSessionRunning((r) => !r)}
        onOpenControlsSheet={() => setIsControlsSheetOpen(true)}
      />

      <div className="flex-1">
        {activeTab === 'analyser' && (
          <LiveAnalyserView
            isRunning={isSessionRunning}
            onToggleRunning={() => setIsSessionRunning((r) => !r)}
            sourceMode={sourceMode}
            onChangeSourceMode={setSourceMode}
            scenario={scenario}
            onChangeScenario={setScenario}
            replayDatasetId={replayDatasetId}
            onChangeReplayDatasetId={(id) => {
              setReplayDatasetId(id);
              setReplayProgressPct(10);
            }}
            replayProgressPct={replayProgressPct}
            onChangeReplayProgress={setReplayProgressPct}
            replayPlaying={replayPlaying}
            onToggleReplayPlaying={() => setReplayPlaying((p) => !p)}
            replaySpeed={replaySpeed}
            onToggleReplaySpeed={() => setReplaySpeed((s) => (s === 1 ? 4 : 1))}
            fusionMode={fusionMode}
            onChangeFusionMode={setFusionMode}
            observationWindow={observationWindow}
            onChangeObservationWindow={setObservationWindow}
            enabledChannels={enabledChannels}
            onToggleChannel={handleToggleChannel}
            consent={consent}
            onUpdateConsent={handleUpdateConsent}
            features={features}
            assessment={assessment}
            baseline={baseline}
            rppgWaveform={rppgWaveform}
            audioWaveform={audioWaveform}
            videoRef={videoRef}
            canvasRef={canvasRef}
            hardwareStatus={hardwareStatus}
            cameraError={cameraError}
            micError={micError}
            bleError={bleError}
            onConnectBle={connectBleHeartRate}
            onDisconnectBle={disconnectBle}
            onLexiconEvaluated={setCustomLexiconOverride}
            onSaveReading={handleSaveReading}
            onGoToBaseline={() => setActiveTab('baseline')}
            isControlsSheetOpen={isControlsSheetOpen}
            onCloseControlsSheet={() => setIsControlsSheetOpen(false)}
            onOpenControlsSheet={() => setIsControlsSheetOpen(true)}
          />
        )}

        {activeTab === 'baseline' && (
          <BaselineContextView
            baseline={baseline}
            currentFeatures={features}
            onUpdateBaseline={handleUpdateBaseline}
            onResetBaseline={handleResetBaseline}
            pssResult={pssResult}
            onSavePss={handleSavePss}
            contextProfile={contextProfile}
            onSaveContextProfile={handleSaveContextProfile}
            onDeleteAllLocalData={handleDeleteAllLocalData}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsHistoryView
            readings={readings}
            onGoToAnalyser={() => setActiveTab('analyser')}
          />
        )}

        {activeTab === 'research' && (
          <ResearchBenchmarksView
            sourceMode={sourceMode}
            consent={consent}
            hardwareStatus={hardwareStatus}
            baseline={baseline}
            readingsCount={readings.length}
            onTriggerBenchmarkTest={handleTriggerBenchmarkTest}
          />
        )}
      </div>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 text-xs text-slate-500">
          <div>
            Multimodal Stress Analyser · Non-diagnostic analytical awareness prototype · On-device processing
          </div>
          <div className="flex items-center gap-4">
            {readings.length === 0 && (
              <button
                type="button"
                onClick={handleRestoreSampleHistory}
                className="text-sky-700 hover:underline"
              >
                Restore Sample History
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('research')}
              className="hover:text-slate-900"
            >
              11 Active Benchmarks
            </button>
          </div>
        </div>
      </footer>

      <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}
