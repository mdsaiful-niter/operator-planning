import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  MachineRecord,
  OperatorRecord,
  PlanningSettings,
} from './types/planning';
import {
  DEFAULT_PLANNING_SETTINGS,
  INITIAL_MACHINE_DATA,
  INITIAL_OPERATOR_DATA,
} from './utils/sampleData';
import { rankOperatorsForMachines, formatAllRankingsAsText } from './utils/rankingEngine';
import {
  calculateDashboardSummary,
  calculateMultiDayTimeline,
  calculateProductionPlans,
} from './utils/productionEngine';
import {
  downloadSampleMachineTemplate,
  downloadSampleOperatorTemplate,
  exportCompleteProductionReportExcel,
  exportMachineProductionPlanExcel,
  exportOperatorRankingExcel,
  exportProductionReportPDF,
  parseMachineExcelFile,
  parseOperatorExcelFile,
} from './utils/excelModule';

/**
 * Checks whether all required fields in a Machine row are filled and valid
 */
function getMachineRowStatus(row: MachineRecord): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  if (!(row.machineName ?? '').trim()) {
    missingFields.push('Machine Name');
  }
  const num = Number(row.numberOfMachines);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    missingFields.push('No. of Machines');
  }
  const job = Number(row.jobQuantity);
  if (!Number.isFinite(job) || job < 0) {
    missingFields.push('Job Quantity');
  }
  const cap = Number(row.capacityPerHour);
  if (!Number.isFinite(cap) || cap <= 0) {
    missingFields.push('Capacity (Units/Hr)');
  }
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Checks whether all required fields in an Operator row are filled and valid
 */
function getOperatorRowStatus(row: OperatorRecord): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  if (!(row.operatorName ?? '').trim()) {
    missingFields.push('Operator Name');
  }
  const exp = Number(row.experience);
  if (!Number.isFinite(exp) || exp < 0) {
    missingFields.push('Exp (Yrs)');
  }
  if (!(row.priority1 ?? '').trim()) {
    missingFields.push('Priority 1');
  }
  if (!(row.priority2 ?? '').trim()) {
    missingFields.push('Priority 2');
  }
  if (!(row.priority3 ?? '').trim()) {
    missingFields.push('Priority 3');
  }
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

export default function App() {
  // Cleared by default: no pre-generated data until imported or manually typed via "+"
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [settings, setSettings] = useState<PlanningSettings>(DEFAULT_PLANNING_SETTINGS);
  const [workingHoursInput, setWorkingHoursInput] = useState<string>(
    String(DEFAULT_PLANNING_SETTINGS.availableWorkingHoursPerDay)
  );

  const [machineFileName, setMachineFileName] = useState<string | null>(null);
  const [operatorFileName, setOperatorFileName] = useState<string | null>(null);
  const [machineImportError, setMachineImportError] = useState<string | null>(null);
  const [operatorImportError, setOperatorImportError] = useState<string | null>(null);
  const [copiedRanking, setCopiedRanking] = useState(false);

  const machineFileInputRef = useRef<HTMLInputElement | null>(null);
  const operatorFileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter valid machine records for calculation
  const validMachines = useMemo(() => {
    return machines.filter((m) => getMachineRowStatus(m).isComplete);
  }, [machines]);

  // Filter valid operator records for ranking (allow operators with at least 1 priority or full row)
  const validOperators = useMemo(() => {
    return operators.filter((o) => {
      const name = (o.operatorName ?? '').trim();
      const exp = Number(o.experience);
      const p1 = (o.priority1 ?? '').trim();
      const p2 = (o.priority2 ?? '').trim();
      const p3 = (o.priority3 ?? '').trim();
      return (
        name.length > 0 &&
        Number.isFinite(exp) &&
        exp >= 0 &&
        (p1.length > 0 || p2.length > 0 || p3.length > 0)
      );
    });
  }, [operators]);

  // Calculations
  const rankings = useMemo(
    () => rankOperatorsForMachines(validMachines, validOperators),
    [validMachines, validOperators]
  );

  const productionPlans = useMemo(
    () => calculateProductionPlans(validMachines, settings, rankings),
    [validMachines, settings, rankings]
  );

  const summary = useMemo(
    () => calculateDashboardSummary(validMachines, validOperators, productionPlans),
    [validMachines, validOperators, productionPlans]
  );

  const timelineAnalysis = useMemo(
    () =>
      calculateMultiDayTimeline(
        productionPlans,
        settings.availableWorkingHoursPerDay
      ),
    [productionPlans, settings.availableWorkingHoursPerDay]
  );

  // Machine Import & Manual "+" Handlers
  const handleMachineExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMachineImportError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setMachineImportError('Please select a valid .xlsx or .xls Excel file.');
      return;
    }

    try {
      const res = await parseMachineExcelFile(file);
      if (res.missingColumns.length > 0) {
        setMachineImportError(
          `Missing column(s): ${res.missingColumns.join(', ')}. Required: Machine Name, Number of Machines, Job Quantity, Capacity (Units/Hour).`
        );
        return;
      }
      setMachines(res.records);
      setMachineFileName(file.name);
    } catch (err) {
      setMachineImportError(
        err instanceof Error ? err.message : 'Failed to read Machine Excel file.'
      );
    }
  };

  const handleAddMachineRow = () => {
    setMachineImportError(null);
    setMachines((prev) => [
      ...prev,
      {
        id: `mach-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        machineName: '',
        numberOfMachines: Number.NaN,
        jobQuantity: Number.NaN,
        capacityPerHour: Number.NaN,
      },
    ]);
  };

  const handleMachineFieldChange = (
    id: string,
    field: keyof Omit<MachineRecord, 'id'>,
    value: string
  ) => {
    setMachines((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'machineName') {
          return { ...row, machineName: value };
        }
        return {
          ...row,
          [field]: value.trim() === '' ? Number.NaN : Number(value),
        };
      })
    );
  };

  const handleDeleteMachineRow = (id: string) => {
    setMachines((prev) => prev.filter((r) => r.id !== id));
  };

  // Operator Import & Manual "+" Handlers
  const handleOperatorExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setOperatorImportError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setOperatorImportError('Please select a valid .xlsx or .xls Excel file.');
      return;
    }

    try {
      const res = await parseOperatorExcelFile(file);
      if (res.missingColumns.length > 0) {
        setOperatorImportError(
          `Missing column(s): ${res.missingColumns.join(', ')}. Required: Operator Name, Experience, Machine Priority 1, Machine Priority 2, Machine Priority 3.`
        );
        return;
      }
      setOperators(res.records);
      setOperatorFileName(file.name);
    } catch (err) {
      setOperatorImportError(
        err instanceof Error ? err.message : 'Failed to read Operator Excel file.'
      );
    }
  };

  const handleAddOperatorRow = () => {
    setOperatorImportError(null);
    setOperators((prev) => [
      ...prev,
      {
        id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        operatorName: '',
        experience: Number.NaN,
        priority1: '',
        priority2: '',
        priority3: '',
      },
    ]);
  };

  const handleOperatorFieldChange = (
    id: string,
    field: keyof Omit<OperatorRecord, 'id'>,
    value: string
  ) => {
    setOperators((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'experience') {
          return {
            ...row,
            experience: value.trim() === '' ? Number.NaN : Number(value),
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleDeleteOperatorRow = (id: string) => {
    setOperators((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCopyRankings = async () => {
    if (rankings.length === 0) return;
    const text = formatAllRankingsAsText(rankings);
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
    setCopiedRanking(true);
    setTimeout(() => setCopiedRanking(false), 2000);
  };

  const handleLoadSampleData = () => {
    setMachines(INITIAL_MACHINE_DATA);
    setOperators(INITIAL_OPERATOR_DATA);
    setMachineFileName('Sample_Machine_Data.xlsx');
    setOperatorFileName('Sample_Operator_Data.xlsx');
    setMachineImportError(null);
    setOperatorImportError(null);
  };

  const handleClearAll = () => {
    setMachines([]);
    setOperators([]);
    setMachineFileName(null);
    setOperatorFileName(null);
    setMachineImportError(null);
    setOperatorImportError(null);
  };

  const hasCalculatedPlans = productionPlans.length > 0;
  const hasCalculatedRankings = rankings.length > 0;

  const availableMachineNames = validMachines.map((m) => m.machineName.trim());

  const completedMachinesCount = machines.filter((m) => getMachineRowStatus(m).isComplete).length;
  const completedOperatorsCount = operators.filter((o) => getOperatorRowStatus(o).isComplete).length;

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Subtle Ambient Luxury Neon Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute top-1/3 right-1/4 w-[480px] h-[480px] rounded-full bg-indigo-500/10 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[140px]" />
      </div>

      {/* Luxurious Neon Top Bar */}
      <header className="sticky top-0 z-20 bg-[#080D1F]/85 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.25)] flex items-center justify-center text-cyan-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
                Machine &amp; Operator Planner
              </h1>
              <p className="text-[11px] text-slate-400">
                Industrial Engineering Capacity &amp; Suitability System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3.5 py-2 text-xs font-medium text-cyan-200 bg-slate-900/90 border border-cyan-500/30 rounded-lg hover:border-cyan-400 hover:bg-cyan-950/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all whitespace-nowrap shrink-0"
            >
              Load Sample
            </button>
            {(machines.length > 0 || operators.length > 0) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3.5 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg hover:border-rose-400 hover:bg-rose-950/70 hover:shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all whitespace-nowrap shrink-0"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              disabled={!hasCalculatedPlans && !hasCalculatedRankings}
              onClick={() =>
                exportCompleteProductionReportExcel(
                  productionPlans,
                  rankings,
                  validMachines,
                  validOperators,
                  settings,
                  summary
                )
              }
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                !hasCalculatedPlans && !hasCalculatedRankings
                  ? 'bg-slate-800/70 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_28px_rgba(6,182,212,0.65)] hover:brightness-110'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Export Report (.xlsx)
            </button>
          </div>
        </div>
      </header>

      {/* Main 3-Section Workspace */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Top Row: 1. Machine Data Import & 2. Operator Data Import */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 1. MACHINE DATA IMPORT + MANUAL "+" */}
          <section
            aria-label="Machine Data Import"
            className="bg-[#0B1124]/90 backdrop-blur-xl rounded-2xl border border-cyan-500/25 shadow-[0_0_35px_-12px_rgba(6,182,212,0.2)] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-800/90 bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-transparent flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    1. Machine Data Import
                  </h2>
                  {machines.length > 0 && (
                    <span className="text-[11px] font-mono tabular-nums text-cyan-300">
                      ({completedMachinesCount}/{machines.length} Ready)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  File: <span className="font-mono text-cyan-300/90">{machineFileName || '-'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={machineFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleMachineExcelImport}
                  className="hidden"
                  aria-label="Import Machine Excel File"
                />
                <button
                  type="button"
                  onClick={downloadSampleMachineTemplate}
                  title="Download Machine Excel Template"
                  className="px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700 rounded-lg hover:border-cyan-500/40 transition-all whitespace-nowrap shrink-0"
                >
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => machineFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-cyan-950 bg-cyan-400 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.35)] hover:bg-cyan-300 hover:shadow-[0_0_22px_rgba(34,211,238,0.55)] transition-all whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Excel
                </button>
                {/* "+" Icon Button right beside Import option for manual input */}
                <button
                  type="button"
                  onClick={handleAddMachineRow}
                  data-testid="add-machine-row-btn"
                  aria-label="Add Machine Row Manually"
                  title="Add row to type machine data manually"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-indigo-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.25)] hover:bg-cyan-400 hover:text-slate-950 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {machineImportError && (
              <div
                role="alert"
                className="px-5 py-2.5 bg-rose-950/60 border-b border-rose-500/40 text-xs text-rose-200 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{machineImportError}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-semibold text-slate-400">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-2.5">Machine Name</th>
                    <th className="py-2.5 px-2 text-right">No. of Machines</th>
                    <th className="py-2.5 px-2 text-right">Job Quantity</th>
                    <th className="py-2.5 px-2 text-right">Capacity (Units/Hr)</th>
                    <th className="py-2.5 px-2 text-right w-9"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {machines.length === 0 ? (
                    <tr className="text-slate-500 font-mono">
                      <td className="py-3.5 px-3">-</td>
                      <td className="py-3.5 px-2.5">-</td>
                      <td className="py-3.5 px-2 text-right">-</td>
                      <td className="py-3.5 px-2 text-right">-</td>
                      <td className="py-3.5 px-2 text-right">-</td>
                      <td className="py-3.5 px-2 text-right">-</td>
                    </tr>
                  ) : (
                    machines.map((row, idx) => {
                      const status = getMachineRowStatus(row);
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Dynamic Status Badge: Red when incomplete, Green when all required fields filled */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            {status.isComplete ? (
                              <span
                                data-testid={`machine-status-badge-${idx + 1}`}
                                data-status="complete"
                                title="All required fields complete"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-all"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Ready</span>
                              </span>
                            ) : (
                              <span
                                data-testid={`machine-status-badge-${idx + 1}`}
                                data-status="incomplete"
                                title={`Missing or invalid: ${status.missingFields.join(', ')}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)] transition-all"
                              >
                                <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>Incomplete</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5">
                            <input
                              type="text"
                              aria-label={`Machine Name Row ${idx + 1}`}
                              value={row.machineName}
                              onChange={(e) =>
                                handleMachineFieldChange(
                                  row.id,
                                  'machineName',
                                  e.target.value
                                )
                              }
                              placeholder="e.g. Zebra"
                              className="w-full min-w-[95px] px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              aria-label={`Number of Machines Row ${idx + 1}`}
                              value={
                                Number.isNaN(row.numberOfMachines)
                                  ? ''
                                  : row.numberOfMachines
                              }
                              onChange={(e) =>
                                handleMachineFieldChange(
                                  row.id,
                                  'numberOfMachines',
                                  e.target.value
                                )
                              }
                              placeholder="3"
                              className="w-16 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-right text-xs font-mono tabular-nums text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              aria-label={`Job Quantity Row ${idx + 1}`}
                              value={
                                Number.isNaN(row.jobQuantity) ? '' : row.jobQuantity
                              }
                              onChange={(e) =>
                                handleMachineFieldChange(
                                  row.id,
                                  'jobQuantity',
                                  e.target.value
                                )
                              }
                              placeholder="30000"
                              className="w-24 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-right text-xs font-mono tabular-nums text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min={1}
                              step="any"
                              aria-label={`Capacity per Hour Row ${idx + 1}`}
                              value={
                                Number.isNaN(row.capacityPerHour)
                                  ? ''
                                  : row.capacityPerHour
                              }
                              onChange={(e) =>
                                handleMachineFieldChange(
                                  row.id,
                                  'capacityPerHour',
                                  e.target.value
                                )
                              }
                              placeholder="1200"
                              className="w-20 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-right text-xs font-mono tabular-nums text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteMachineRow(row.id)}
                              aria-label={`Delete machine row ${idx + 1}`}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. OPERATOR DATA IMPORT + MANUAL "+" */}
          <section
            aria-label="Operator Data Import"
            className="bg-[#0B1124]/90 backdrop-blur-xl rounded-2xl border border-indigo-500/25 shadow-[0_0_35px_-12px_rgba(99,102,241,0.2)] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-800/90 bg-gradient-to-r from-indigo-950/35 via-slate-900/40 to-transparent flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    2. Operator Data Import
                  </h2>
                  {operators.length > 0 && (
                    <span className="text-[11px] font-mono tabular-nums text-indigo-300">
                      ({completedOperatorsCount}/{operators.length} Ready)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  File:{' '}
                  <span className="font-mono text-indigo-300/90">
                    {operatorFileName || '-'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={operatorFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleOperatorExcelImport}
                  className="hidden"
                  aria-label="Import Operator Excel File"
                />
                <button
                  type="button"
                  onClick={downloadSampleOperatorTemplate}
                  title="Download Operator Excel Template"
                  className="px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700 rounded-lg hover:border-indigo-500/40 transition-all whitespace-nowrap shrink-0"
                >
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => operatorFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-indigo-400 rounded-lg shadow-[0_0_15px_rgba(129,140,248,0.35)] hover:bg-indigo-300 hover:shadow-[0_0_22px_rgba(129,140,248,0.55)] transition-all whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Excel
                </button>
                {/* "+" Icon Button right beside Import option for manual input */}
                <button
                  type="button"
                  onClick={handleAddOperatorRow}
                  data-testid="add-operator-row-btn"
                  aria-label="Add Operator Row Manually"
                  title="Add row to type operator data manually"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/50 shadow-[0_0_12px_rgba(129,140,248,0.25)] hover:bg-indigo-400 hover:text-slate-950 hover:shadow-[0_0_20px_rgba(129,140,248,0.6)] transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {operatorImportError && (
              <div
                role="alert"
                className="px-5 py-2.5 bg-rose-950/60 border-b border-rose-500/40 text-xs text-rose-200 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{operatorImportError}</span>
              </div>
            )}

            <datalist id="machine-options-list">
              {availableMachineNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-semibold text-slate-400">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-2">Operator Name</th>
                    <th className="py-2.5 px-2 text-right">Exp (Yrs)</th>
                    <th className="py-2.5 px-2">Priority 1</th>
                    <th className="py-2.5 px-2">Priority 2</th>
                    <th className="py-2.5 px-2">Priority 3</th>
                    <th className="py-2.5 px-2 text-right w-9"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {operators.length === 0 ? (
                    <tr className="text-slate-500 font-mono">
                      <td className="py-3.5 px-3">-</td>
                      <td className="py-3.5 px-2">-</td>
                      <td className="py-3.5 px-2 text-right">-</td>
                      <td className="py-3.5 px-2">-</td>
                      <td className="py-3.5 px-2">-</td>
                      <td className="py-3.5 px-2">-</td>
                      <td className="py-3.5 px-2 text-right">-</td>
                    </tr>
                  ) : (
                    operators.map((row, idx) => {
                      const status = getOperatorRowStatus(row);
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Dynamic Status Badge: Red when incomplete, Green when all required fields filled */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            {status.isComplete ? (
                              <span
                                data-testid={`operator-status-badge-${idx + 1}`}
                                data-status="complete"
                                title="All required fields complete"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-all"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Ready</span>
                              </span>
                            ) : (
                              <span
                                data-testid={`operator-status-badge-${idx + 1}`}
                                data-status="incomplete"
                                title={`Missing or invalid: ${status.missingFields.join(', ')}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)] transition-all"
                              >
                                <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>Incomplete</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-1.5">
                            <input
                              type="text"
                              aria-label={`Operator Name Row ${idx + 1}`}
                              value={row.operatorName}
                              onChange={(e) =>
                                handleOperatorFieldChange(
                                  row.id,
                                  'operatorName',
                                  e.target.value
                                )
                              }
                              placeholder="Rohim"
                              className="w-full min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_10px_rgba(129,140,248,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-1.5 text-right">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              aria-label={`Operator Experience Row ${idx + 1}`}
                              value={
                                Number.isNaN(row.experience) ? '' : row.experience
                              }
                              onChange={(e) =>
                                handleOperatorFieldChange(
                                  row.id,
                                  'experience',
                                  e.target.value
                                )
                              }
                              placeholder="20"
                              className="w-12 px-1.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-right text-xs font-mono tabular-nums text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_10px_rgba(129,140,248,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-1.5">
                            <input
                              type="text"
                              list="machine-options-list"
                              aria-label={`Priority 1 Row ${idx + 1}`}
                              value={row.priority1}
                              onChange={(e) =>
                                handleOperatorFieldChange(
                                  row.id,
                                  'priority1',
                                  e.target.value
                                )
                              }
                              placeholder="1st"
                              className="w-full min-w-[88px] px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_10px_rgba(129,140,248,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-1.5">
                            <input
                              type="text"
                              list="machine-options-list"
                              aria-label={`Priority 2 Row ${idx + 1}`}
                              value={row.priority2}
                              onChange={(e) =>
                                handleOperatorFieldChange(
                                  row.id,
                                  'priority2',
                                  e.target.value
                                )
                              }
                              placeholder="2nd"
                              className="w-full min-w-[88px] px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_10px_rgba(129,140,248,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-1.5">
                            <input
                              type="text"
                              list="machine-options-list"
                              aria-label={`Priority 3 Row ${idx + 1}`}
                              value={row.priority3}
                              onChange={(e) =>
                                handleOperatorFieldChange(
                                  row.id,
                                  'priority3',
                                  e.target.value
                                )
                              }
                              placeholder="3rd"
                              className="w-full min-w-[88px] px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_10px_rgba(129,140,248,0.25)] transition-all"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteOperatorRow(row.id)}
                              aria-label={`Delete operator row ${idx + 1}`}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* 3. CALCULATION & EXPORT SECTION */}
        <section
          aria-label="Calculation and Results"
          className="bg-[#0B1124]/90 backdrop-blur-xl rounded-2xl border border-emerald-500/25 shadow-[0_0_40px_-12px_rgba(16,185,129,0.18)] overflow-hidden"
        >
          {/* Calculation Header & Working Hours Control */}
          <div className="px-5 py-4 border-b border-slate-800/90 bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-transparent flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                3. Production Calculation &amp; Operator Ranking
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-slate-950/80 border border-cyan-500/30 rounded-lg px-3 py-1.5">
                <label
                  htmlFor="working-hours-input"
                  className="text-xs font-medium text-slate-300 whitespace-nowrap"
                >
                  Working Hours / Day:
                </label>
                <input
                  id="working-hours-input"
                  type="text"
                  inputMode="decimal"
                  value={workingHoursInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    setWorkingHoursInput(raw);
                    const val = Number(raw);
                    if (raw !== '' && !Number.isNaN(val) && val > 0 && val <= 24) {
                      setSettings({ ...settings, availableWorkingHoursPerDay: val });
                    }
                  }}
                  onBlur={() => {
                    const val = Number(workingHoursInput);
                    if (workingHoursInput.trim() === '' || Number.isNaN(val) || val <= 0) {
                      setWorkingHoursInput(String(settings.availableWorkingHoursPerDay));
                    } else if (val > 24) {
                      setWorkingHoursInput('24');
                      setSettings({ ...settings, availableWorkingHoursPerDay: 24 });
                    }
                  }}
                  className="w-12 px-2 py-0.5 text-center text-xs font-mono font-bold text-cyan-300 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:border-cyan-400 [appearance:textfield]"
                />
                <span className="text-xs text-slate-400">h</span>
              </div>

              <button
                type="button"
                disabled={!hasCalculatedPlans}
                onClick={() => exportMachineProductionPlanExcel(productionPlans, settings)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
                  !hasCalculatedPlans
                    ? 'bg-slate-900/60 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-900 text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Plan (.xlsx)
              </button>

              <button
                type="button"
                disabled={!hasCalculatedRankings}
                onClick={() => exportOperatorRankingExcel(rankings)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
                  !hasCalculatedRankings
                    ? 'bg-slate-900/60 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-900 text-indigo-300 border-indigo-500/40 hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(129,140,248,0.25)]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Ranking (.xlsx)
              </button>

              <button
                type="button"
                disabled={!hasCalculatedPlans && !hasCalculatedRankings}
                onClick={() =>
                  exportProductionReportPDF(
                    productionPlans,
                    rankings,
                    settings,
                    summary
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap shrink-0 ${
                  !hasCalculatedPlans && !hasCalculatedRankings
                    ? 'bg-slate-900/60 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-400 hover:text-slate-950 hover:shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                PDF Report
              </button>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* A. Operator Ranking Output */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-bold text-cyan-300 tracking-wide">
                  OPERATOR RANKING
                </h3>
                <button
                  type="button"
                  disabled={!hasCalculatedRankings}
                  onClick={handleCopyRankings}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-all ${
                    !hasCalculatedRankings
                      ? 'text-slate-600 bg-slate-900/60 border-slate-800 cursor-not-allowed'
                      : 'text-cyan-300 bg-cyan-950/50 border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                  }`}
                >
                  {copiedRanking ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Ranking</span>
                    </>
                  )}
                </button>
              </div>

              <div
                data-testid="operator-ranking-box"
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-100 space-y-2.5"
              >
                {!hasCalculatedRankings ? (
                  <div className="text-slate-500">-</div>
                ) : (
                  rankings.map((r) => (
                    <div
                      key={r.machineName}
                      className="flex flex-wrap items-center justify-between gap-2 leading-relaxed border-b border-slate-900/80 last:border-b-0 pb-1.5 last:pb-0"
                    >
                      <div>
                        <span className="text-cyan-300 font-semibold">{r.machineName}</span>
                        <span className="text-slate-500"> - </span>
                        <span className="text-slate-100">{r.rankedNamesCsv}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        Suggested: <strong className="text-cyan-300">{r.rankedOperators.length}</strong> / {r.numberOfMachines}{' '}
                        {r.numberOfMachines === 1 ? 'Machine' : 'Machines'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* B. Machine-Wise Production Plan Table */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-bold text-emerald-300 tracking-wide">
                  MACHINE-WISE PRODUCTION PLAN
                </h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400">
                      <th className="py-2.5 px-3">Machine</th>
                      <th className="py-2.5 px-3 text-right">No. of Machines</th>
                      <th className="py-2.5 px-3">Suggested Operators (≤ Mach)</th>
                      <th className="py-2.5 px-3 text-right">Job Quantity</th>
                      <th className="py-2.5 px-3 text-right">Cap/Hr (1 Mach)</th>
                      <th className="py-2.5 px-3 text-right">Total Hourly Cap.</th>
                      <th className="py-2.5 px-3 text-right">Daily Capacity ({settings.availableWorkingHoursPerDay}h)</th>
                      <th className="py-2.5 px-3 text-right">Day 1 Target</th>
                      <th className="py-2.5 px-3 text-right">Remaining (After Day 1)</th>
                      <th className="py-2.5 px-3">Required Time</th>
                      <th className="py-2.5 px-3 text-right">Working Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs bg-slate-950/60">
                    {!hasCalculatedPlans ? (
                      <tr className="text-slate-500 font-mono">
                        <td className="py-3.5 px-3">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                        <td className="py-3.5 px-3">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                        <td className="py-3.5 px-3">-</td>
                        <td className="py-3.5 px-3 text-right">-</td>
                      </tr>
                    ) : (
                      productionPlans.map((p) => {
                        const machineRanking = rankings.find(
                          (r) =>
                            r.machineName.trim().toLowerCase() ===
                            p.machineName.trim().toLowerCase()
                        );
                        const perMachineDailyCap =
                          p.numberOfMachines > 0
                            ? Math.round(p.dailyProductionCapacity / p.numberOfMachines)
                            : 0;
                        const perMachineDailyTarget =
                          p.numberOfMachines > 0
                            ? Math.round(p.dailyTarget / p.numberOfMachines)
                            : 0;

                        return (
                          <tr
                            key={p.machineId}
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                              {p.machineName}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200 font-semibold">
                              {p.numberOfMachines}
                            </td>
                            <td className="py-3 px-3 font-mono text-cyan-200">
                              {machineRanking && machineRanking.hasSuitableOperators ? (
                                <span>{machineRanking.rankedNamesCsv}</span>
                              ) : (
                                <span className="text-slate-500">No suitable operator</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-white">
                              {p.jobQuantity.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                              {p.capacityPerHour.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-cyan-300">
                              {p.totalHourlyCapacity.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                              <div>{p.dailyProductionCapacity.toLocaleString()}</div>
                              <div className="text-[10px] text-slate-500">
                                ({perMachineDailyCap.toLocaleString()}/mach)
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                              <div>{p.dailyTarget.toLocaleString()}</div>
                              <div className="text-[10px] text-emerald-500/80 font-normal">
                                ({perMachineDailyTarget.toLocaleString()}/mach)
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-300">
                              <div>{p.remainingQuantity.toLocaleString()}</div>
                              <div className="text-[10px] text-slate-500">
                                {p.remainingQuantity > 0
                                  ? `Day 2+: ${p.remainingQuantity.toLocaleString()}`
                                  : 'Done Day 1'}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                              <div className="font-semibold text-white">
                                {p.requiredTimeDecimalFormatted}
                              </div>
                              <div className="text-[11px] text-cyan-300/90">
                                {p.requiredTimeHoursMinutesFormatted} ({p.requiredTimeHHMMFormatted})
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-bold text-cyan-200">
                                {p.requiredWorkingDays}{' '}
                                {p.requiredWorkingDays === 1 ? 'Day' : 'Days'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {p.fullWorkingDays > 0 && p.finalDayRemainingHours > 0
                                  ? `${p.fullWorkingDays}d×${settings.availableWorkingHoursPerDay}h + ${p.finalDayRemainingFormatted}`
                                  : p.fullWorkingDays > 0
                                  ? `${p.fullWorkingDays}d×${settings.availableWorkingHoursPerDay}h`
                                  : `${p.finalDayRemainingFormatted}`}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {hasCalculatedPlans && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-700 bg-slate-900/90 text-xs font-mono font-bold text-white">
                        <td className="py-3 px-3 text-cyan-300">TOTAL / SUMMARY</td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {summary.totalAvailableMachines}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-normal">
                          Max {summary.totalAvailableMachines} slots
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {summary.totalJobQuantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">-</td>
                        <td className="py-3 px-3 text-right tabular-nums text-cyan-300">
                          {summary.totalHourlyCapacity.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-200">
                          {summary.totalDailyProductionCapacity.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-emerald-400">
                          {summary.totalDailyTarget.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-amber-300">
                          {summary.totalRemainingQuantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-white">
                            Max: {summary.maxRequiredProductionTimeHours.toFixed(2)} Hours ({summary.maxRequiredTimeHHMM})
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Sum: {summary.totalWorkloadHoursSum.toFixed(2)} Line-Hrs
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-cyan-200 whitespace-nowrap">
                          Max {summary.maxWorkingDaysRequired}{' '}
                          {summary.maxWorkingDaysRequired === 1 ? 'Day' : 'Days'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* C. Multi-Day Production Timeline & Bottleneck Visualization */}
            <div data-testid="production-timeline-section">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-indigo-300 tracking-wide">
                    MULTI-DAY PRODUCTION TIMELINE &amp; BOTTLENECK ANALYSIS
                  </h3>
                </div>

                {hasCalculatedPlans && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                      Bottleneck Run
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
                      Full Shift (100%)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                      Partial Run
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/25 border border-amber-500/50" />
                      Idle Capacity Window
                    </span>
                  </div>
                )}
              </div>

              {!hasCalculatedPlans ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-500">
                  -
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
                  {/* Bottleneck & Fleet Idle Insights Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-rose-950/25 border border-rose-500/35 px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
                          Critical Bottleneck Machine
                        </div>
                        <div
                          data-testid="bottleneck-machine-label"
                          className="text-xs font-bold font-mono text-white mt-0.5"
                        >
                          {timelineAnalysis.bottleneckMachineNames.join(', ') || '-'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {timelineAnalysis.maxRequiredTimeHHMM} ({timelineAnalysis.totalHorizonDays}d)
                      </span>
                    </div>

                    <div className="rounded-lg bg-cyan-950/25 border border-cyan-500/30 px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/90">
                          Schedule Horizon Window
                        </div>
                        <div className="text-xs font-bold font-mono text-white mt-0.5">
                          {timelineAnalysis.totalHorizonDays}{' '}
                          {timelineAnalysis.totalHorizonDays === 1 ? 'Working Day' : 'Working Days'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35">
                        {timelineAnalysis.totalHorizonHours}h Total Window
                      </span>
                    </div>

                    <div className="rounded-lg bg-amber-950/25 border border-amber-500/30 px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
                          Total Cumulative Idle Window
                        </div>
                        <div className="text-xs font-bold font-mono text-white mt-0.5">
                          {timelineAnalysis.totalFleetIdleHours.toFixed(2)} Line-Hours Idle
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                        {timelineAnalysis.totalFleetIdleTimeHHMM} Idle
                      </span>
                    </div>
                  </div>

                  {/* Multi-Day Timeline Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[780px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                          <th className="py-2 px-3 w-44">Machine &amp; Role</th>
                          <th className="py-2 px-3 w-40 text-right">Active vs. Idle (Horizon)</th>
                          {Array.from(
                            { length: timelineAnalysis.totalHorizonDays },
                            (_, idx) => (
                              <th
                                key={idx + 1}
                                className="py-2 px-3 text-center font-mono text-cyan-300"
                              >
                                Day {idx + 1} ({settings.availableWorkingHoursPerDay}h Shift)
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 text-xs">
                        {timelineAnalysis.rows.map((row) => (
                          <tr
                            key={row.machineId}
                            data-testid={`timeline-row-${row.machineName}`}
                            className="hover:bg-slate-900/50 transition-colors"
                          >
                            {/* Machine & Bottleneck / Early Finish Status */}
                            <td className="py-3 px-3 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">
                                  {row.machineName}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                  {row.numberOfMachines}m
                                </span>
                              </div>
                              <div className="mt-1">
                                {row.isBottleneck ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]">
                                    Critical Bottleneck
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Idle {row.totalIdleTimeHHMM} across {timelineAnalysis.totalHorizonDays}d
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Horizon Active vs Idle Summary */}
                            <td className="py-3 px-3 text-right font-mono tabular-nums align-middle">
                              <div className="text-emerald-300 font-semibold">
                                Run: {row.totalActiveTimeHHMM} ({row.horizonUtilizationPercent.toFixed(0)}%)
                              </div>
                              <div className="text-[11px] text-amber-300/90 mt-0.5">
                                Idle: {row.totalIdleTimeHHMM}
                              </div>
                            </td>

                            {/* Day-by-Day Visual Timeline Bars */}
                            {row.days.map((day) => {
                              const activeWidthPct = Math.min(
                                100,
                                Math.max(0, day.utilizationPercent)
                              );
                              const idleWidthPct = Math.max(0, 100 - activeWidthPct);

                              const activeBarColor = row.isBottleneck
                                ? 'bg-gradient-to-r from-rose-500 to-orange-400 shadow-[0_0_12px_rgba(244,63,94,0.45)]'
                                : day.status === 'full'
                                ? 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]';

                              return (
                                <td
                                  key={day.dayNumber}
                                  className="py-3 px-3 align-middle"
                                >
                                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                                    {/* Top Row: Active Time & Units */}
                                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-1.5">
                                      {day.status === 'idle' ? (
                                        <span className="text-amber-400/90 font-semibold">
                                          100% IDLE
                                        </span>
                                      ) : (
                                        <span className="text-white font-semibold">
                                          Run: {day.activeTimeHHMM} ({day.utilizationPercent.toFixed(0)}%)
                                        </span>
                                      )}
                                      <span className="text-slate-400 tabular-nums">
                                        {day.producedUnits.toLocaleString()} u
                                      </span>
                                    </div>

                                    {/* Visual Proportional Shift Bar (Active vs Idle) */}
                                    <div className="w-full h-3 rounded-md bg-slate-950 border border-slate-800 overflow-hidden flex">
                                      {activeWidthPct > 0 && (
                                        <div
                                          style={{ width: `${activeWidthPct}%` }}
                                          title={`Day ${day.dayNumber} Active: ${day.activeTimeHHMM} (${day.producedUnits.toLocaleString()} units)`}
                                          className={`h-full transition-all ${activeBarColor}`}
                                        />
                                      )}
                                      {idleWidthPct > 0 && (
                                        <div
                                          style={{ width: `${idleWidthPct}%` }}
                                          title={`Day ${day.dayNumber} Idle: ${day.idleTimeHHMM}`}
                                          className="h-full bg-amber-500/15 border-l border-amber-500/30"
                                        />
                                      )}
                                    </div>

                                    {/* Bottom Row: Idle Window Label */}
                                    <div className="flex items-center justify-between text-[10px] font-mono mt-1.5">
                                      {day.idleHours > 0 ? (
                                        <span className="text-amber-300/90">
                                          Idle: {day.idleTimeHHMM}
                                        </span>
                                      ) : (
                                        <span className="text-cyan-300/80">
                                          No Idle (Full Shift)
                                        </span>
                                      )}
                                      <span className="text-slate-500">
                                        /{settings.availableWorkingHoursPerDay}h
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
