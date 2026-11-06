import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  FileSpreadsheet,
  Layers,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  DashboardSummaryKPIs,
  MachineOperatorRanking,
  MachineProductionPlan,
  NavigationTab,
  PlanningSettings,
  ValidationReport,
} from '../types/planning';

interface DashboardViewProps {
  summary: DashboardSummaryKPIs;
  plans: MachineProductionPlan[];
  rankings: MachineOperatorRanking[];
  operatorsCount: number;
  settings: PlanningSettings;
  machineValidation: ValidationReport;
  operatorValidation: ValidationReport;
  onNavigate: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  plans,
  rankings,
  operatorsCount,
  settings,
  machineValidation,
  operatorValidation,
  onNavigate,
}) => {
  const machineRowErrors = machineValidation.errors.filter((e) => Boolean(e.rowId));
  const operatorRowErrors = operatorValidation.errors.filter((e) => Boolean(e.rowId));
  const hasValidationErrors = machineRowErrors.length > 0 || operatorRowErrors.length > 0;

  const hasMachines = plans.length > 0;
  const hasOperators = operatorsCount > 0;

  const maxChartValue = Math.max(
    1,
    ...plans.map((p) => Math.max(p.jobQuantity, p.dailyProductionCapacity))
  );

  return (
    <div className="space-y-6">
      {/* Validation Alert Banner if any entered rows have errors */}
      {hasValidationErrors && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">
                Data Validation Attention Required
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                {machineRowErrors.length} machine data error(s) and{' '}
                {operatorRowErrors.length} operator data error(s) detected. Please review
                and correct invalid records to ensure accurate production planning.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {machineRowErrors.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('upload-machines')}
                className="px-3 py-1.5 text-xs font-medium bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
              >
                Fix Machine Data
              </button>
            )}
            {operatorRowErrors.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('upload-operators')}
                className="px-3 py-1.5 text-xs font-medium bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
              >
                Fix Operator Data
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7 Required Summary Cards (display "-" when cleared/empty) */}
      <section aria-label="Dashboard Summary KPIs">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-1 text-slate-500 mb-2">
              <span className="text-[11px] font-medium whitespace-nowrap">Machine Types</span>
              <Layers className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            </div>
            <div
              data-testid="kpi-machine-types"
              className="text-xl font-bold text-slate-900 font-mono tabular-nums"
            >
              {hasMachines ? summary.totalMachineTypes : '-'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">Active categories</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-1 text-slate-500 mb-2">
              <span className="text-[11px] font-medium whitespace-nowrap">Available Machines</span>
              <Cpu className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            </div>
            <div
              data-testid="kpi-available-machines"
              className="text-xl font-bold text-slate-900 font-mono tabular-nums"
            >
              {hasMachines ? summary.totalAvailableMachines : '-'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">Parallel units</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-1 text-slate-500 mb-2">
              <span className="text-[11px] font-medium whitespace-nowrap">Total Operators</span>
              <Users className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            </div>
            <div
              data-testid="kpi-total-operators"
              className="text-xl font-bold text-slate-900 font-mono tabular-nums"
            >
              {hasOperators ? summary.totalOperators : '-'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">Evaluated personnel</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-1 text-slate-500 mb-2">
              <span className="text-[11px] font-medium whitespace-nowrap">Total Job Qty</span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            </div>
            <div
              data-testid="kpi-total-job-qty"
              className="text-xl font-bold text-slate-900 font-mono tabular-nums"
            >
              {hasMachines ? summary.totalJobQuantity.toLocaleString() : '-'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">Required units</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-1 text-slate-500 mb-2">
              <span className="text-[11px] font-medium whitespace-nowrap">Hourly Capacity</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            </div>
            <div
              data-testid="kpi-hourly-capacity"
              className="text-xl font-bold text-slate-900 font-mono tabular-nums"
            >
              {hasMachines ? summary.totalHourlyCapacity.toLocaleString() : '-'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">Units / hr combined</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-1 text-slate-500 mb-2">
              <span className="text-[11px] font-medium whitespace-nowrap">Daily Capacity</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            </div>
            <div
              data-testid="kpi-daily-capacity"
              className="text-xl font-bold text-blue-900 font-mono tabular-nums"
            >
              {hasMachines ? summary.totalDailyProductionCapacity.toLocaleString() : '-'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">
              At {settings.availableWorkingHoursPerDay}h / day
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between gap-1 text-slate-500 mb-2">
              <span className="text-[11px] font-medium whitespace-nowrap">Est. Prod. Time</span>
              <Clock className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            </div>
            <div
              data-testid="kpi-est-time"
              className="text-xl font-bold text-slate-900 font-mono tabular-nums"
            >
              {hasMachines ? summary.maxRequiredTimeHHMM : '-'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">
              {hasMachines ? `Max line (${summary.maxWorkingDaysRequired}d)` : 'Max line (-)'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Grid: Chart + Operator Suitability Quick View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Production Capacity vs Job Quantity Visual Comparison */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Machine Capacity vs. Job Quantity Analysis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison of total job demand against 1-day capacity (
                  {settings.availableWorkingHoursPerDay} net working hours/day)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-900 inline-block" />
                  Job Quantity
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-700 inline-block" />
                  Daily Capacity
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                  Daily Target
                </span>
              </div>
            </div>

            {plans.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-2xl font-mono text-slate-300 font-bold">-</div>
                <p className="text-xs text-slate-500">
                  No machine data entered yet. Upload an Excel file or add machine records manually.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('upload-machines')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Input Machine Data
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {plans.map((plan) => {
                  const jobPct = Math.min(100, (plan.jobQuantity / maxChartValue) * 100);
                  const capPct = Math.min(
                    100,
                    (plan.dailyProductionCapacity / maxChartValue) * 100
                  );
                  const targetPct = Math.min(100, (plan.dailyTarget / maxChartValue) * 100);

                  return (
                    <div key={plan.machineId} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{plan.machineName}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-mono tabular-nums">
                            {plan.numberOfMachines} unit{plan.numberOfMachines > 1 ? 's' : ''} @{' '}
                            {plan.capacityPerHour.toLocaleString()}/hr
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600">
                          <span>Req: {plan.requiredTimeHHMMFormatted}</span>
                          <span className="text-slate-300">|</span>
                          <span
                            className={
                              plan.capacityShortage > 0
                                ? 'text-amber-700 font-medium'
                                : 'text-emerald-700 font-medium'
                            }
                          >
                            {plan.requiredWorkingDays}d ({plan.capacityUtilization.toFixed(0)}% util)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {/* Job Quantity Bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-[11px] text-slate-500 shrink-0">Job Demand</span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-slate-900 rounded-sm transition-all duration-200"
                              style={{ width: `${Math.max(2, jobPct)}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs font-mono tabular-nums text-slate-800">
                            {plan.jobQuantity.toLocaleString()}
                          </span>
                        </div>

                        {/* Daily Capacity Bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-[11px] text-slate-500 shrink-0">Daily Cap.</span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-blue-700 rounded-sm transition-all duration-200"
                              style={{ width: `${Math.max(2, capPct)}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs font-mono tabular-nums text-blue-900">
                            {plan.dailyProductionCapacity.toLocaleString()}
                          </span>
                        </div>

                        {/* Daily Target Bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-[11px] text-slate-500 shrink-0">Daily Target</span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-sm transition-all duration-200"
                              style={{ width: `${Math.max(2, targetPct)}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs font-mono tabular-nums text-emerald-800 font-medium">
                            {plan.dailyTarget.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total Daily Target:{' '}
              <strong className="text-slate-900 font-mono tabular-nums">
                {hasMachines ? `${summary.totalDailyTarget.toLocaleString()} units` : '-'}
              </strong>{' '}
              · Remaining After Day 1:{' '}
              <strong className="text-slate-900 font-mono tabular-nums">
                {hasMachines ? `${summary.totalRemainingQuantity.toLocaleString()} units` : '-'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('production-planning')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Full Production Plan
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Operator Suitability Ranking Summary */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Machine-Wise Operator Ranking
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by Preference (P1 → P2 → P3) then Experience (Desc.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('operator-ranking')}
                className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
              >
                View Details
              </button>
            </div>

            {rankings.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-2xl font-mono text-slate-300 font-bold">-</div>
                <p className="text-xs text-slate-500">
                  No operator rankings generated yet. Input machines and operators to rank.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('upload-operators')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Input Operator Data
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {rankings.map((rank) => (
                  <div
                    key={rank.machineName}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 tracking-tight">
                        {rank.machineName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {rank.rankedOperators.length} suitable operator
                        {rank.rankedOperators.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">
                      {rank.compactLine}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Non-exclusive suitability ranking per machine
            </span>
            <button
              type="button"
              onClick={() => onNavigate('reports-export')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Export Reports
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Quick Production Plan Overview Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Production Plan Executive Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated from uploaded or manually entered capacity values (
              {settings.availableWorkingHoursPerDay} net working hours/day)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('upload-machines')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add / Edit Machine Data
            </button>
            <button
              type="button"
              onClick={() => onNavigate('production-planning')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              Open Planner
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4 text-right">No. of Machines</th>
                <th className="py-3 px-4 text-right">Job Quantity</th>
                <th className="py-3 px-4 text-right">Capacity/Hour</th>
                <th className="py-3 px-4 text-right">Total Hourly Capacity</th>
                <th className="py-3 px-4 text-right">Daily Target</th>
                <th className="py-3 px-4 text-right">Required Time</th>
                <th className="py-3 px-4 text-right">Working Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {plans.length === 0 ? (
                <tr className="text-slate-400 font-mono">
                  <td className="py-3.5 px-4">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.machineId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.machineName}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {p.numberOfMachines}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {p.jobQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {p.capacityPerHour.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-900 font-medium">
                      {p.totalHourlyCapacity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800 font-semibold">
                      {p.dailyTarget.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {p.requiredTimeDecimalFormatted} ({p.requiredTimeHHMMFormatted})
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {p.requiredWorkingDays} {p.requiredWorkingDays === 1 ? 'Day' : 'Days'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
