import React, { useState } from 'react';
import {
  Award,
  Check,
  Copy,
  FileSpreadsheet,
  FileText,
  Layers,
} from 'lucide-react';
import {
  DashboardSummaryKPIs,
  MachineOperatorRanking,
  MachineProductionPlan,
  MachineRecord,
  OperatorRecord,
  PlanningSettings,
} from '../types/planning';
import {
  exportCompleteProductionReportExcel,
  exportMachineProductionPlanExcel,
  exportOperatorRankingExcel,
  exportProductionReportPDF,
} from '../utils/excelModule';
import { formatAllRankingsAsText } from '../utils/rankingEngine';

interface ReportsExportViewProps {
  plans: MachineProductionPlan[];
  rankings: MachineOperatorRanking[];
  machines: MachineRecord[];
  operators: OperatorRecord[];
  settings: PlanningSettings;
  summary: DashboardSummaryKPIs;
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  plans,
  rankings,
  machines,
  operators,
  settings,
  summary,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [lastExportAction, setLastExportAction] = useState<string | null>(null);

  const hasPlans = plans.length > 0;
  const hasRankings = rankings.length > 0;

  const handleCopyRankingText = async () => {
    const text = hasRankings ? formatAllRankingsAsText(rankings) : '-';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedText(true);
    setLastExportAction('Copied Operator Ranking as Text to clipboard.');
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Live Final Report Output Preview Before Export (shows "-" when empty) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Report Data Preview Before Export
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Concise verification view of Operator Rankings and Machine Production Plans (displays{' '}
              <code className="font-mono">-</code> until data is uploaded or typed)
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Working Hours/Day: {settings.availableWorkingHoursPerDay}h
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operator Ranking Block */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-xs font-bold text-blue-950 tracking-wider mb-3">
              OPERATOR RANKING:
            </h3>
            <div className="space-y-2.5 font-mono text-xs text-slate-900">
              {!hasRankings ? (
                <div className="p-2.5 rounded-md bg-white border border-slate-200 text-slate-400">
                  -
                </div>
              ) : (
                rankings.map((r) => (
                  <div
                    key={r.machineName}
                    className="p-2.5 rounded-md bg-white border border-slate-200"
                  >
                    {r.compactLine}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Production Plan Summary Block */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-xs font-bold text-blue-950 tracking-wider mb-3">
              PRODUCTION PLAN:
            </h3>
            <div className="space-y-2.5 font-mono text-xs text-slate-900">
              {!hasPlans ? (
                <div className="p-2.5 rounded-md bg-white border border-slate-200 text-slate-400">
                  -
                </div>
              ) : (
                plans.map((p) => {
                  const totalMins = Math.round(p.requiredProductionTimeHours * 60);
                  const hrs = Math.floor(totalMins / 60);
                  const mins = totalMins % 60;
                  return (
                    <div
                      key={p.machineId}
                      className="p-2.5 rounded-md bg-white border border-slate-200 leading-relaxed"
                    >
                      <strong>{p.machineName}</strong> - {p.jobQuantity.toLocaleString()} units -{' '}
                      {p.numberOfMachines} machine{p.numberOfMachines > 1 ? 's' : ''} -{' '}
                      {p.capacityPerHour.toLocaleString()} units/hour/machine - {hrs}h {mins}m
                      required ({p.requiredWorkingDays} working{' '}
                      {p.requiredWorkingDays === 1 ? 'day' : 'days'}).
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Actions Section (Section 13: All 5 Required Exports) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Production Planning &amp; Operator Ranking Exports
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download calculated production targets, machine unit distributions, and operator
            suitability rankings in Excel (.xlsx), PDF (.pdf), or plain text formats.
          </p>
        </div>

        {lastExportAction && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{lastExportAction}</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Download Machine Production Plan.xlsx */}
          <div className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between bg-slate-50/50">
            <div>
              <div className="w-9 h-9 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                1. Machine Production Plan.xlsx
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Includes machine-wise hourly capacities, daily targets, required time in all formats,
                working days, and individual machine unit allocations.
              </p>
            </div>
            <button
              type="button"
              disabled={!hasPlans}
              onClick={() => {
                exportMachineProductionPlanExcel(plans, settings);
                setLastExportAction('Downloaded "Machine Production Plan.xlsx".');
              }}
              className={`mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                !hasPlans
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'text-white bg-blue-900 hover:bg-blue-800'
              }`}
            >
              Download Machine Production Plan.xlsx
            </button>
          </div>

          {/* 2. Download Operator Ranking.xlsx */}
          <div className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between bg-slate-50/50">
            <div>
              <div className="w-9 h-9 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                2. Operator Ranking.xlsx
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Maintains the simple format (Machine Name | Ranked Operator Names) along with a
                second sheet showing priority &amp; experience details.
              </p>
            </div>
            <button
              type="button"
              disabled={!hasRankings}
              onClick={() => {
                exportOperatorRankingExcel(rankings);
                setLastExportAction('Downloaded "Operator Ranking.xlsx".');
              }}
              className={`mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                !hasRankings
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'text-white bg-blue-900 hover:bg-blue-800'
              }`}
            >
              Download Operator Ranking.xlsx
            </button>
          </div>

          {/* 3. Download Complete Production Report.xlsx */}
          <div className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between bg-slate-50/50">
            <div>
              <div className="w-9 h-9 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                3. Complete Production Report.xlsx
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Comprehensive 6-sheet workbook: Executive Summary, Production Plan, Operator
                Ranking, Unit Distribution, and Raw Input Sheets.
              </p>
            </div>
            <button
              type="button"
              disabled={!hasPlans && !hasRankings}
              onClick={() => {
                exportCompleteProductionReportExcel(
                  plans,
                  rankings,
                  machines,
                  operators,
                  settings,
                  summary
                );
                setLastExportAction('Downloaded "Complete Production Report.xlsx".');
              }}
              className={`mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                !hasPlans && !hasRankings
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'text-white bg-blue-900 hover:bg-blue-800'
              }`}
            >
              Download Complete Production Report.xlsx
            </button>
          </div>

          {/* 4. Download Production Report.pdf */}
          <div className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between bg-slate-50/50">
            <div>
              <div className="w-9 h-9 rounded-lg bg-slate-900/10 text-slate-900 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                4. Production Report.pdf
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Formatted landscape Industrial Engineering PDF report containing KPIs, Machine-Wise
                Production Plan, and Operator Suitability Rankings.
              </p>
            </div>
            <button
              type="button"
              disabled={!hasPlans && !hasRankings}
              onClick={() => {
                exportProductionReportPDF(plans, rankings, settings, summary);
                setLastExportAction('Downloaded "Production Report.pdf".');
              }}
              className={`mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                !hasPlans && !hasRankings
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'text-white bg-slate-900 hover:bg-slate-800'
              }`}
            >
              Download Production Report.pdf
            </button>
          </div>

          {/* 5. Copy Operator Ranking as Text */}
          <div className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between bg-slate-50/50 md:col-span-2">
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-900/10 text-emerald-800 flex items-center justify-center mb-3">
                <Copy className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                5. Copy Operator Ranking as Text
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Copies the clean machine-wise operator ranking text directly to your clipboard for
                instant pasting into emails, shift logs, or messaging apps.
              </p>
            </div>
            <button
              type="button"
              disabled={!hasRankings}
              onClick={handleCopyRankingText}
              className={`mt-4 w-full py-2 px-3 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap ${
                !hasRankings
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'text-emerald-950 bg-emerald-100 border-emerald-300 hover:bg-emerald-200'
              }`}
            >
              {copiedText ? 'Copied Operator Ranking Text!' : 'Copy Operator Ranking as Text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
