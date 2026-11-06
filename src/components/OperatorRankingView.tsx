import React, { useState } from 'react';
import { Check, Copy, Download, Eye, Plus, Users } from 'lucide-react';
import { MachineOperatorRanking, NavigationTab } from '../types/planning';
import { formatAllRankingsAsText } from '../utils/rankingEngine';
import { exportOperatorRankingExcel } from '../utils/excelModule';

interface OperatorRankingViewProps {
  rankings: MachineOperatorRanking[];
  onNavigate?: (tab: NavigationTab) => void;
}

export const OperatorRankingView: React.FC<OperatorRankingViewProps> = ({
  rankings,
  onNavigate,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedMachine, setCopiedMachine] = useState<string | null>(null);
  const [showCriteriaDetails, setShowCriteriaDetails] = useState(false);

  const hasData = rankings.length > 0;
  const fullCompactText = hasData ? formatAllRankingsAsText(rankings) : '-';

  const copyTextToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleCopyAll = async () => {
    await copyTextToClipboard(fullCompactText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopySingle = async (machineName: string, line: string) => {
    await copyTextToClipboard(line);
    setCopiedMachine(machineName);
    setTimeout(() => setCopiedMachine(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Machine-Wise Operator Suitability Ranking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Primary Criterion: Machine Preference (Priority 1 → Priority 2 → Priority 3) · Secondary
            Criterion: Experience (Descending)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('upload-operators')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Input Operator Data
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCriteriaDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            {showCriteriaDetails ? 'Simple Name List' : 'Show Priority & Experience'}
          </button>

          <button
            type="button"
            disabled={!hasData}
            onClick={() => exportOperatorRankingExcel(rankings)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              !hasData
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'text-slate-800 bg-white border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Download Operator Ranking.xlsx
          </button>

          <button
            type="button"
            disabled={!hasData}
            onClick={handleCopyAll}
            data-testid="copy-all-rankings-btn"
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              !hasData
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'text-white bg-blue-900 hover:bg-blue-800'
            }`}
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied All Rankings</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Rankings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compact Machine-Wise Ranking Cards (Section 11) */}
      <section aria-label="Compact Machine Ranking Cards">
        {!hasData ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
            <div className="text-2xl font-mono font-bold text-slate-300">-</div>
            <p className="text-xs text-slate-500">
              No machine or operator records entered yet. Upload Excel sheets or click{' '}
              <strong>+ Input Operator Data</strong> to rank operators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rankings.map((r) => (
              <div
                key={r.machineName}
                data-testid={`ranking-card-${r.machineName}`}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-blue-950 tracking-tight">
                      {r.machineName.toUpperCase()}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopySingle(r.machineName, r.compactLine)}
                      aria-label={`Copy ${r.machineName} ranking`}
                      className="p-1 text-slate-400 hover:text-blue-900 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      {copiedMachine === r.machineName ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {r.hasSuitableOperators ? (
                    <ol className="mt-3.5 space-y-2">
                      {r.rankedOperators.map((op, index) => (
                        <li
                          key={`${r.machineName}-${op.operatorId}`}
                          className="flex items-center justify-between text-sm text-slate-800"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-xs font-mono tabular-nums font-semibold text-slate-400">
                              {index + 1}.
                            </span>
                            <span className="font-medium text-slate-900">{op.operatorName}</span>
                          </div>
                          {showCriteriaDetails && (
                            <span className="text-xs font-mono tabular-nums text-slate-500">
                              P{op.priorityLevel} · {op.experience}y
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="py-6 text-center">
                      <Users className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-500">No suitable operator found.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono tabular-nums">
                  {r.hasSuitableOperators
                    ? `${r.rankedOperators.length} ranked candidate${
                        r.rankedOperators.length === 1 ? '' : 's'
                      }`
                    : '0 candidates selected machine'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Required Simple Compact Text Output Format (Section 4 & Section 11) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Compact Text Format Output
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct machine-to-ranked-operators summary for instant copy and shop-floor sharing
            </p>
          </div>
          <button
            type="button"
            disabled={!hasData}
            onClick={handleCopyAll}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              !hasData
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'text-blue-900 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </>
            )}
          </button>
        </div>

        <div className="p-6 bg-slate-50">
          <div
            data-testid="compact-ranking-output"
            className="bg-white rounded-lg border border-slate-200 p-5 font-mono text-sm text-slate-900 space-y-3"
          >
            {!hasData ? (
              <div className="text-slate-400">-</div>
            ) : (
              rankings.map((r) => (
                <div key={r.machineName} className="leading-relaxed">
                  {r.compactLine}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
