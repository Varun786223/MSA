import React, { useEffect, useState } from 'react';
import { Check, RotateCcw, Shield, Trash2 } from 'lucide-react';
import {
  BackgroundContextProfile,
  MultimodalFeatures,
  PersonalBaseline,
  PssResult,
} from '../types/stress';
import { PSS_10_QUESTIONS, PSS_OPTIONS, POPULATION_PRIOR_BASELINE } from '../data/researchData';

interface BaselineContextViewProps {
  baseline: PersonalBaseline;
  currentFeatures: MultimodalFeatures;
  onUpdateBaseline: (next: PersonalBaseline) => void;
  onResetBaseline: () => void;
  pssResult: PssResult | null;
  onSavePss: (res: PssResult) => void;
  contextProfile: BackgroundContextProfile;
  onSaveContextProfile: (profile: BackgroundContextProfile) => void;
  onDeleteAllLocalData: () => void;
}

export const BaselineContextView: React.FC<BaselineContextViewProps> = ({
  baseline,
  currentFeatures,
  onUpdateBaseline,
  onResetBaseline,
  pssResult,
  onSavePss,
  contextProfile,
  onSaveContextProfile,
  onDeleteAllLocalData,
}) => {
  const [phase, setPhase] = useState<'idle' | 'settling' | 'capturing'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [samples, setSamples] = useState<MultimodalFeatures[]>([]);
  const currentFeaturesRef = React.useRef<MultimodalFeatures>(currentFeatures);

  useEffect(() => {
    currentFeaturesRef.current = currentFeatures;
  }, [currentFeatures]);

  const [answers, setAnswers] = useState<number[]>(
    () => pssResult?.answers ?? Array(10).fill(1)
  );
  const [pssSavedBanner, setPssSavedBanner] = useState(false);

  const [profileForm, setProfileForm] = useState<BackgroundContextProfile>(contextProfile);
  const [profileSavedBanner, setProfileSavedBanner] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    setProfileForm(contextProfile);
  }, [contextProfile]);

  useEffect(() => {
    if (phase === 'idle') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === 'settling') {
            setPhase('capturing');
            setSamples([]);
            return 10;
          } else {
            setPhase('idle');
            return 0;
          }
        }
        return prev - 1;
      });

      if (phase === 'capturing') {
        setSamples((prev) => [...prev, currentFeaturesRef.current]);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'idle' && samples.length >= 3) {
      const avg = (fn: (f: MultimodalFeatures) => number) =>
        samples.reduce((acc, s) => acc + fn(s), 0) / samples.length;

      const prevCount = baseline.sessionCount;
      const blend = (oldMean: number, newMean: number) =>
        prevCount === 0 ? newMean : oldMean * 0.6 + newMean * 0.4;

      const prevShimmer =
        baseline.features.shimmerPct ?? POPULATION_PRIOR_BASELINE.features.shimmerPct;
      const prevRate =
        baseline.features.speechRateWpm ?? POPULATION_PRIOR_BASELINE.features.speechRateWpm;

      const nextBaseline: PersonalBaseline = {
        calibrated: true,
        sessionCount: prevCount + 1,
        settlingCompleted: true,
        lastUpdatedIso: new Date().toISOString(),
        features: {
          pitchHz: {
            mean: Number(blend(baseline.features.pitchHz.mean, avg((f) => f.pitchHz)).toFixed(1)),
            std: 14,
          },
          jitterPct: {
            mean: Number(blend(baseline.features.jitterPct.mean, avg((f) => f.jitterPct)).toFixed(2)),
            std: 0.22,
          },
          shimmerPct: {
            mean: Number(blend(prevShimmer.mean, avg((f) => f.shimmerPct)).toFixed(2)),
            std: 0.55,
          },
          pauseRatio: {
            mean: Number(blend(baseline.features.pauseRatio.mean, avg((f) => f.pauseRatio)).toFixed(2)),
            std: 0.05,
          },
          speechRateWpm: {
            mean: Number(blend(prevRate.mean, avg((f) => f.speechRateWpm)).toFixed(0)),
            std: 14,
          },
          browLowerAu4: {
            mean: Number(blend(baseline.features.browLowerAu4.mean, avg((f) => f.browLowerAu4)).toFixed(2)),
            std: 0.3,
          },
          lidTightenAu7: {
            mean: Number(blend(baseline.features.lidTightenAu7.mean, avg((f) => f.lidTightenAu7)).toFixed(2)),
            std: 0.28,
          },
          rppgHeartRateBpm: {
            mean: Number(blend(baseline.features.rppgHeartRateBpm.mean, avg((f) => f.rppgHeartRateBpm)).toFixed(1)),
            std: 6,
          },
          motionEnergy: {
            mean: Number(blend(baseline.features.motionEnergy.mean, avg((f) => f.motionEnergy)).toFixed(1)),
            std: 5,
          },
          selfTouchEventsPerMin: {
            mean: Number(blend(baseline.features.selfTouchEventsPerMin.mean, avg((f) => f.selfTouchEventsPerMin)).toFixed(2)),
            std: 0.5,
          },
          hrvRmssdMs: {
            mean: Number(blend(baseline.features.hrvRmssdMs.mean, avg((f) => f.hrvRmssdMs)).toFixed(1)),
            std: 10,
          },
          edaMicroSiemens: {
            mean: Number(blend(baseline.features.edaMicroSiemens.mean, avg((f) => f.edaMicroSiemens)).toFixed(2)),
            std: 0.35,
          },
          skinTempC: {
            mean: Number(blend(baseline.features.skinTempC.mean, avg((f) => f.skinTempC)).toFixed(2)),
            std: 0.35,
          },
          negativeLexiconRatio: {
            mean: Number(blend(baseline.features.negativeLexiconRatio.mean, avg((f) => f.negativeLexiconRatio)).toFixed(2)),
            std: 0.04,
          },
        },
      };

      onUpdateBaseline(nextBaseline);
      setSamples([]);
    }
  }, [phase, samples, baseline, onUpdateBaseline]);

  const startBaselineProtocol = () => {
    setSamples([]);
    setPhase('settling');
    setSecondsLeft(8);
  };

  const handleComputePss = (e: React.FormEvent) => {
    e.preventDefault();
    const totalScore = answers.reduce((acc, val, idx) => {
      const q = PSS_10_QUESTIONS[idx];
      const scored = q.reversed ? 4 - val : val;
      return acc + scored;
    }, 0);

    const category: PssResult['category'] =
      totalScore <= 13
        ? 'Low perceived stress'
        : totalScore <= 26
          ? 'Moderate perceived stress'
          : 'High perceived stress';

    onSavePss({
      completedAtIso: new Date().toISOString(),
      answers,
      totalScore,
      category,
    });
    setPssSavedBanner(true);
    setTimeout(() => setPssSavedBanner(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveContextProfile(profileForm);
    setProfileSavedBanner(true);
    setTimeout(() => setProfileSavedBanner(false), 2500);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 space-y-6">
      {/* Personal Baseline Protocol */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Individual Baseline & Drift Calibration
            </h1>
            <p className="mt-1 max-w-3xl text-xs sm:text-sm text-slate-600">
              Runs a settling period so monitoring anxiety fades, then captures your personal calm distribution across sessions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {baseline.calibrated && (
              <button
                type="button"
                onClick={onResetBaseline}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              disabled={phase !== 'idle'}
              onClick={startBaselineProtocol}
              className="min-h-[44px] rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300 disabled:text-slate-600 whitespace-nowrap active:scale-[0.98]"
            >
              {phase === 'settling'
                ? `Settling (${secondsLeft}s)`
                : phase === 'capturing'
                  ? `Capturing (${secondsLeft}s)`
                  : baseline.calibrated
                    ? 'Refine Baseline Session'
                    : 'Start Baseline Capture'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={`rounded-xl border p-4 ${phase === 'settling' ? 'border-sky-600 bg-sky-50/50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="text-xs font-semibold text-slate-900">01. Settling Period</div>
            <p className="mt-1 text-xs text-slate-600">
              Initial minutes are excluded from calibration so novelty or monitoring anxiety settles naturally.
            </p>
          </div>
          <div className={`rounded-xl border p-4 ${phase === 'capturing' ? 'border-sky-600 bg-sky-50/50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="text-xs font-semibold text-slate-900">02. Neutral Multi-Channel Capture</div>
            <p className="mt-1 text-xs text-slate-600">
              Rest comfortably and speak neutrally while voice, face, pulse, movement, and wristband features are sampled.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-900">03. Multi-Session Drift Adaptation</div>
            <p className="mt-1 text-xs text-slate-600">
              Sessions completed: <span className="font-mono font-semibold text-slate-900 tabular-nums">{baseline.sessionCount}</span>. Confidence increases after 2+ calm sessions.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Feature</th>
                <th className="py-2.5 px-3 font-semibold text-right">Population Prior</th>
                <th className="py-2.5 px-3 font-semibold text-right">Personal (μ ± σ)</th>
                <th className="py-2.5 pl-3 font-semibold text-right">Live</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                {
                  name: 'HRV (RMSSD)',
                  prior: `${POPULATION_PRIOR_BASELINE.features.hrvRmssdMs.mean} ± ${POPULATION_PRIOR_BASELINE.features.hrvRmssdMs.std} ms`,
                  personal: baseline.calibrated
                    ? `${baseline.features.hrvRmssdMs.mean} ± ${baseline.features.hrvRmssdMs.std} ms`
                    : 'Not calibrated',
                  live: `${currentFeatures.hrvRmssdMs.toFixed(1)} ms`,
                },
                {
                  name: 'Skin Conductance (EDA)',
                  prior: `${POPULATION_PRIOR_BASELINE.features.edaMicroSiemens.mean} ± ${POPULATION_PRIOR_BASELINE.features.edaMicroSiemens.std} µS`,
                  personal: baseline.calibrated
                    ? `${baseline.features.edaMicroSiemens.mean} ± ${baseline.features.edaMicroSiemens.std} µS`
                    : 'Not calibrated',
                  live: `${currentFeatures.edaMicroSiemens.toFixed(2)} µS`,
                },
                {
                  name: 'Voice Pitch (F0)',
                  prior: `${POPULATION_PRIOR_BASELINE.features.pitchHz.mean} ± ${POPULATION_PRIOR_BASELINE.features.pitchHz.std} Hz`,
                  personal: baseline.calibrated
                    ? `${baseline.features.pitchHz.mean} ± ${baseline.features.pitchHz.std} Hz`
                    : 'Not calibrated',
                  live: `${currentFeatures.pitchHz.toFixed(0)} Hz`,
                },
                {
                  name: 'Vocal Jitter (Local)',
                  prior: `${POPULATION_PRIOR_BASELINE.features.jitterPct.mean} ± ${POPULATION_PRIOR_BASELINE.features.jitterPct.std} %`,
                  personal: baseline.calibrated
                    ? `${baseline.features.jitterPct.mean} ± ${baseline.features.jitterPct.std} %`
                    : 'Not calibrated',
                  live: `${currentFeatures.jitterPct.toFixed(2)} %`,
                },
                {
                  name: 'Vocal Shimmer (Local)',
                  prior: `${POPULATION_PRIOR_BASELINE.features.shimmerPct.mean} ± ${POPULATION_PRIOR_BASELINE.features.shimmerPct.std} %`,
                  personal: baseline.calibrated
                    ? `${(baseline.features.shimmerPct ?? POPULATION_PRIOR_BASELINE.features.shimmerPct).mean} ± ${(baseline.features.shimmerPct ?? POPULATION_PRIOR_BASELINE.features.shimmerPct).std} %`
                    : 'Not calibrated',
                  live: `${currentFeatures.shimmerPct.toFixed(2)} %`,
                },
                {
                  name: 'Speaking Rate',
                  prior: `${POPULATION_PRIOR_BASELINE.features.speechRateWpm.mean} ± ${POPULATION_PRIOR_BASELINE.features.speechRateWpm.std} wpm`,
                  personal: baseline.calibrated
                    ? `${(baseline.features.speechRateWpm ?? POPULATION_PRIOR_BASELINE.features.speechRateWpm).mean} ± ${(baseline.features.speechRateWpm ?? POPULATION_PRIOR_BASELINE.features.speechRateWpm).std} wpm`
                    : 'Not calibrated',
                  live: `${currentFeatures.speechRateWpm.toFixed(0)} wpm`,
                },
                {
                  name: 'Contactless rPPG Pulse',
                  prior: `${POPULATION_PRIOR_BASELINE.features.rppgHeartRateBpm.mean} ± ${POPULATION_PRIOR_BASELINE.features.rppgHeartRateBpm.std} bpm`,
                  personal: baseline.calibrated
                    ? `${baseline.features.rppgHeartRateBpm.mean} ± ${baseline.features.rppgHeartRateBpm.std} bpm`
                    : 'Not calibrated',
                  live: `${currentFeatures.rppgHeartRateBpm.toFixed(0)} bpm`,
                },
                {
                  name: 'Brow Lowerer (AU4)',
                  prior: `${POPULATION_PRIOR_BASELINE.features.browLowerAu4.mean} ± ${POPULATION_PRIOR_BASELINE.features.browLowerAu4.std}`,
                  personal: baseline.calibrated
                    ? `${baseline.features.browLowerAu4.mean} ± ${baseline.features.browLowerAu4.std}`
                    : 'Not calibrated',
                  live: `${currentFeatures.browLowerAu4.toFixed(2)}`,
                },
                {
                  name: 'Self-Touch Adaptors',
                  prior: `${POPULATION_PRIOR_BASELINE.features.selfTouchEventsPerMin.mean} ± ${POPULATION_PRIOR_BASELINE.features.selfTouchEventsPerMin.std} /m`,
                  personal: baseline.calibrated
                    ? `${baseline.features.selfTouchEventsPerMin.mean} ± ${baseline.features.selfTouchEventsPerMin.std} /m`
                    : 'Not calibrated',
                  live: `${currentFeatures.selfTouchEventsPerMin.toFixed(1)} /m`,
                },
              ].map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/70">
                  <td className="py-2.5 pr-4 font-medium text-slate-900">{row.name}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">{row.prior}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">{row.personal}</td>
                  <td className="py-2.5 pl-3 text-right font-mono text-sky-700 tabular-nums whitespace-nowrap">{row.live}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Validated PSS-10 + Optional Context Profile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Perceived Stress Scale (PSS-10)
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Cohen et al. (1983) validated self-report scale stored locally as subjective context—never as a diagnosis.
              </p>
            </div>
            {pssResult && (
              <div className="text-right">
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {pssResult.totalScore} / 40
                </div>
                <div className="text-xs font-medium text-slate-600">{pssResult.category}</div>
              </div>
            )}
          </div>

          <form onSubmit={handleComputePss} className="space-y-4">
            {PSS_10_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="border-b border-slate-100 pb-3.5 last:border-b-0">
                <p className="mb-2.5 text-xs font-medium text-slate-800">
                  {q.id}. {q.text}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {PSS_OPTIONS.map((opt) => {
                    const active = answers[idx] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const next = [...answers];
                          next[idx] = opt.value;
                          setAnswers(next);
                        }}
                        className={`min-h-[44px] rounded-xl border px-1.5 text-[11px] font-medium transition-colors ${
                          active
                            ? 'border-sky-600 bg-sky-50 text-sky-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Items 4, 5, 7, and 8 are reverse-scored per standard PSS-10 protocol.
              </span>
              <button
                type="submit"
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap active:scale-[0.98]"
              >
                {pssSavedBanner ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>PSS-10 Saved</span>
                  </>
                ) : (
                  <span>Score & Save PSS-10</span>
                )}
              </button>
            </div>
          </form>
        </section>

        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-slate-900">
              Optional Lifestyle & Background Context
            </h2>
            <p className="mt-1 mb-4 text-xs text-slate-600">
              Voluntary context shown beside readings. Sleep duration and health/medication notes are never used to infer any condition.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sleep-hours" className="mb-1 block font-medium text-slate-700">
                    Sleep Last Night (h)
                  </label>
                  <input
                    id="sleep-hours"
                    type="number"
                    min={0}
                    max={16}
                    step={0.5}
                    value={profileForm.sleepHoursLastNight}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        sleepHoursLastNight: Number(e.target.value),
                      })
                    }
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="activity-level" className="mb-1 block font-medium text-slate-700">
                    Activity Level
                  </label>
                  <select
                    id="activity-level"
                    value={profileForm.physicalActivityLevel}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        physicalActivityLevel: e.target.value as BackgroundContextProfile['physicalActivityLevel'],
                      })
                    }
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:border-sky-600 focus:outline-none"
                  >
                    <option value="Sedentary">Sedentary</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Active">Active</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="family-support" className="mb-1 block font-medium text-slate-700">
                    Family Closeness (1–5)
                  </label>
                  <input
                    id="family-support"
                    type="range"
                    min={1}
                    max={5}
                    value={profileForm.familySupportCloseness}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        familySupportCloseness: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                      })
                    }
                    className="w-full h-2 accent-sky-600"
                  />
                  <div className="font-mono text-[11px] text-slate-500">
                    {profileForm.familySupportCloseness} / 5
                  </div>
                </div>
                <div>
                  <label htmlFor="friend-support" className="mb-1 block font-medium text-slate-700">
                    Friend Closeness (1–5)
                  </label>
                  <input
                    id="friend-support"
                    type="range"
                    min={1}
                    max={5}
                    value={profileForm.friendSupportCloseness}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        friendSupportCloseness: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                      })
                    }
                    className="w-full h-2 accent-sky-600"
                  />
                  <div className="font-mono text-[11px] text-slate-500">
                    {profileForm.friendSupportCloseness} / 5
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="work-context" className="mb-1 block font-medium text-slate-700">
                  Work / Study Context
                </label>
                <input
                  id="work-context"
                  type="text"
                  value={profileForm.workStudyContext}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, workStudyContext: e.target.value })
                  }
                  placeholder="e.g., Final-year project sprint"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="health-note" className="mb-1 block font-medium text-slate-700">
                  Voluntary Medication / Health Note
                </label>
                <input
                  id="health-note"
                  type="text"
                  value={profileForm.healthOrMedicationNote}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, healthOrMedicationNote: e.target.value })
                  }
                  placeholder="e.g., Beta-blocker, allergy meds, or none"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-slate-700">
                <input
                  type="checkbox"
                  checked={profileForm.caffeineRecent}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, caffeineRecent: e.target.checked })
                  }
                  className="h-5 w-5 rounded border-slate-300 text-sky-600"
                />
                <span>Recent caffeine intake (last 3 hours)</span>
              </label>

              <button
                type="submit"
                className="min-h-[44px] w-full rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98]"
              >
                {profileSavedBanner ? 'Context Profile Saved Locally' : 'Save Local Context'}
              </button>
            </form>
          </section>

          {/* Privacy Vault Control */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-900">On-Device Privacy Vault</h2>
            </div>
            <p className="mb-4 text-xs text-slate-600">
              All baseline distributions, PSS-10 scores, context notes, and historical readings stay exclusively in local browser storage. Raw audio, video, and transcripts are never stored.
            </p>
            {!confirmWipe ? (
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 text-xs font-semibold text-rose-800 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Delete All Local Data</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAllLocalData();
                    setConfirmWipe(false);
                  }}
                  className="min-h-[44px] rounded-xl bg-rose-700 px-4 text-xs font-semibold text-white hover:bg-rose-800"
                >
                  Confirm Permanent Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWipe(false)}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
