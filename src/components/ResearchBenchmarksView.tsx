import React, { useMemo, useState } from 'react';
import { ExternalLink, Play, Search } from 'lucide-react';
import {
  BENCHMARK_MATRIX,
  CONFOUNDER_FALSE_ALARM_DATA,
  EVALUATION_SAFEGUARDS,
  LOSO_BENCHMARK_METRICS,
  PUBLIC_DATASETS,
} from '../data/researchData';
import {
  AppConsentState,
  BenchmarkRow,
  InputSourceMode,
  LiveHardwareStatus,
  PersonalBaseline,
} from '../types/stress';

type ModalityFilter = 'ALL' | BenchmarkRow['modality'];

interface ResearchBenchmarksViewProps {
  sourceMode: InputSourceMode;
  consent: AppConsentState;
  hardwareStatus: LiveHardwareStatus;
  baseline: PersonalBaseline;
  readingsCount: number;
  onTriggerBenchmarkTest: (target: BenchmarkRow['testTarget']) => void;
}

export const ResearchBenchmarksView: React.FC<ResearchBenchmarksViewProps> = ({
  sourceMode,
  consent,
  hardwareStatus,
  baseline,
  readingsCount,
  onTriggerBenchmarkTest,
}) => {
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBenchmarks = useMemo(() => {
    return BENCHMARK_MATRIX.filter((row) => {
      const matchesModality = modalityFilter === 'ALL' || row.modality === modalityFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.feature.toLowerCase().includes(q) ||
        row.projectFeature.toLowerCase().includes(q) ||
        row.androidApp.toLowerCase().includes(q) ||
        row.webPlatform.toLowerCase().includes(q);
      return matchesModality && matchesQuery;
    });
  }, [modalityFilter, searchTerm]);

  const getRuntimeStatus = (target: BenchmarkRow['testTarget']): string => {
    switch (target) {
      case 'camera':
        return hardwareStatus.mediapipeStatus === 'active'
          ? 'Live MediaPipe Active'
          : sourceMode === 'dataset_replay'
            ? 'Active via Dataset Replay'
            : 'Ready (Calibrated / Opt-In Webcam)';
      case 'rppg':
        return hardwareStatus.liveCameraReady
          ? 'Live Webcam rPPG Active'
          : sourceMode === 'dataset_replay'
            ? 'Active via UBFC-Phys / Replay'
            : 'Active (Waveform + Webcam ROI)';
      case 'mic':
        return hardwareStatus.liveMicReady
          ? 'Live Web Audio DSP Active'
          : sourceMode === 'dataset_replay'
            ? 'Active via StressID Replay'
            : 'Ready (Acoustics + Opt-In Mic)';
      case 'language':
        return consent.languageChannelOptIn
          ? hardwareStatus.sttListening
            ? 'Listening Locally'
            : 'Opted In (Text Discarded)'
          : 'Opt-In Ready (Off by Default)';
      case 'pose':
        return hardwareStatus.mediapipeStatus === 'active'
          ? 'MediaPipe Pose Active'
          : 'Active (Kinesics & Pose Engine)';
      case 'ble':
        return hardwareStatus.bleConnected
          ? `BLE Paired (${hardwareStatus.bleHeartRateBpm ?? '--'} bpm)`
          : sourceMode === 'dataset_replay'
            ? 'Active via WESAD Replay'
            : 'Active (BLE Ready + Physio Sim)';
      case 'baseline':
        return baseline.calibrated
          ? `Calibrated (${baseline.sessionCount} session${baseline.sessionCount > 1 ? 's' : ''})`
          : 'Population Fallback (Ready to Calibrate)';
      case 'confounder':
        return 'Active (Exertion & Excitement Gates)';
      case 'pss':
        return 'Active (PSS-10 + Context Form)';
      case 'trends':
        return `Active (${readingsCount} stored reading${readingsCount === 1 ? '' : 's'})`;
      case 'privacy':
        return 'Active (100% On-Device Storage)';
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 space-y-6">
      {/* 11-Feature Active Benchmark Matrix */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            11 Active Benchmarks & Research Matrix
          </h1>
          <p className="mt-1 max-w-3xl text-xs sm:text-sm text-slate-600">
            Every capability from your project plan is actively implemented in this browser. Tap any row action below to launch or test that module directly.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                'ALL',
                'Face & Pulse',
                'Voice & Language',
                'Kinesics & Wearable',
                'Calibration & Ethics',
              ] as const
            ).map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setModalityFilter(mod)}
                className={`min-h-[40px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  modalityFilter === mod
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mod === 'ALL' ? 'All 11' : mod}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search feature, app, or platform..."
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Desktop & Tablet Table View */}
        <div className="mt-5 hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Capability & Live Status</th>
                <th className="py-2.5 px-3 font-semibold">Active Implementation</th>
                <th className="py-2.5 px-3 font-semibold">Benchmarks (Android · Web)</th>
                <th className="py-2.5 pl-3 font-semibold text-right">Interactive Test</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBenchmarks.map((row) => (
                <tr key={row.id} className="align-top hover:bg-slate-50/70">
                  <td className="py-3 pr-3 font-mono font-semibold text-slate-500 tabular-nums">
                    {String(row.id).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{row.feature}</div>
                    <div className="mt-1 font-mono text-[11px] text-emerald-700">
                      {getRuntimeStatus(row.testTarget)}
                    </div>
                  </td>
                  <td className="py-3 px-3 max-w-sm text-slate-600 leading-relaxed">
                    {row.projectFeature}
                  </td>
                  <td className="py-3 px-3 space-y-1">
                    <div>
                      <a
                        href={row.androidUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
                      >
                        <span>{row.androidApp}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                    <div>
                      <a
                        href={row.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-sky-700 hover:underline"
                      >
                        <span>{row.webPlatform}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => onTriggerBenchmarkTest(row.testTarget)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap active:scale-[0.98]"
                    >
                      <Play className="h-3 w-3" aria-hidden="true" />
                      <span>{row.testActionLabel}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch-Friendly Card List (< md) */}
        <div className="mt-4 divide-y divide-slate-200 md:hidden">
          {filteredBenchmarks.map((row) => (
            <div key={row.id} className="py-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-slate-400 tabular-nums">
                    {String(row.id).padStart(2, '0')} · {row.modality}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{row.feature}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onTriggerBenchmarkTest(row.testTarget)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shrink-0 active:scale-[0.98]"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{row.testActionLabel}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-emerald-700">
                {getRuntimeStatus(row.testTarget)}
              </div>
              <p className="text-xs text-slate-600">{row.projectFeature}</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <a
                  href={row.androidUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-sky-700"
                >
                  <span>{row.androidApp}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <a
                  href={row.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-600"
                >
                  <span>{row.webPlatform}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LOSO Validation & Confounder False Alarm Reduction */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-slate-900">
            Subject-Independent (LOSO) Ablation Targets
          </h2>
          <p className="mt-1 mb-5 text-xs text-slate-600">
            Measured on unseen subjects: fusion and personal baseline calibration must outperform any single channel.
          </p>
          <div className="space-y-3.5">
            {LOSO_BENCHMARK_METRICS.map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="font-medium text-slate-800">{m.label}</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    F1 {m.f1.toFixed(1)}% · MAE {m.mae.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      m.label.includes('Fusion') ? 'bg-sky-600' : 'bg-slate-500'
                    }`}
                    style={{ width: `${m.f1}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-slate-900">
            Confounder False-Alarm Rate Reduction
          </h2>
          <p className="mt-1 mb-5 text-xs text-slate-600">
            Deliberate false-alarm evaluation during physical exertion, excitement, curiosity, and initial monitoring anxiety.
          </p>
          <div className="space-y-4">
            {CONFOUNDER_FALSE_ALARM_DATA.map((item) => (
              <div key={item.condition} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{item.condition}</span>
                  <span className="font-mono text-slate-600 tabular-nums shrink-0">
                    {item.withoutCheck}% → <strong className="text-emerald-700">{item.withCheck}%</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-slate-500">Unchecked</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${item.withoutCheck}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-slate-500">Checked</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.withCheck}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Aligned Datasets & Evaluation Safeguards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-slate-900">
            Aligned Multimodal Benchmark Datasets
          </h2>
          <p className="mt-1 mb-4 text-xs text-slate-600">
            Used channel-by-channel and tested cross-dataset to avoid single-lab overfitting.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Dataset</th>
                  <th className="py-2 px-3 font-semibold">Modalities</th>
                  <th className="py-2 px-3 font-semibold text-right">Subjects</th>
                  <th className="py-2 pl-3 font-semibold">Labels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PUBLIC_DATASETS.map((d) => (
                  <tr key={d.name} className="align-top">
                    <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">{d.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{d.signals}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">{d.subjects}</td>
                    <td className="py-2.5 pl-3 text-slate-600">{d.labels}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-slate-900">
            Methodological Safeguards (Section 15.1)
          </h2>
          <p className="mt-1 mb-4 text-xs text-slate-600">
            Explicit protections against data leakage, subject memorization, and confounder inflation.
          </p>
          <div className="divide-y divide-slate-100 text-xs">
            {EVALUATION_SAFEGUARDS.map((item) => (
              <div key={item.mistake} className="py-2.5">
                <div className="font-semibold text-slate-900">{item.mistake}</div>
                <div className="mt-0.5 text-slate-500">
                  <span className="font-medium text-rose-700">Risk:</span> {item.inflationReason}
                </div>
                <div className="mt-0.5 text-slate-700">
                  <span className="font-medium text-emerald-700">Safeguard:</span> {item.safeguard}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
