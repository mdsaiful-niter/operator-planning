import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DashboardSummaryKPIs,
  MachineProductionPlan,
  NavigationTab,
  PlanningSettings,
} from '../types/planning';
import { exportMachineProductionPlanExcel } from '../utils/excelModule';

interface ProductionPlanningViewProps {
  plans: MachineProductionPlan[];
  settings: PlanningSettings;
  onUpdateSettings: (settings: PlanningSettings) => void;
  summary: DashboardSummaryKPIs;
  onNavigate?: (tab: NavigationTab) => void;
}

export const ProductionPlanningView: React.FC<ProductionPlanningViewProps> = ({
  plans,
  settings,
  onUpdateSettings,
  summary,
  onNavigate,
}) => {
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('ALL');
  const [timeFormatMode, setTimeFormatMode] = useState<'all' | 'decimal' | 'hhmm'>('all');

  const handleHoursChange = (val: string) => {
    const parsed = Number(val);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 24) {
      onUpdateSettings({
        ...settings,
        availableWorkingHoursPerDay: parsed,
      });
    }
  };

  const filteredDistributionPlans =
    selectedMachineFilter === 'ALL'
      ? plans
      : plans.filter((p) => p.machineName === selectedMachineFilter);

  const hasData = plans.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Planning Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Daily Production Target &amp; Capacity Planning Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculates parallel hourly capacity, daily targets, required elapsed production time,
            working days, and individual machine unit distributions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Quick configurable Net Available Working Hours per Day */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-800 shrink-0" />
            <label
              htmlFor="quick-working-hours"
              className="text-xs font-medium text-slate-700 whitespace-nowrap"
            >
              Net Available Working Hours / Day:
            </label>
            <input
              id="quick-working-hours"
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={settings.availableWorkingHoursPerDay}
              onChange={(e) => handleHoursChange(e.target.value)}
              className="w-16 px-2 py-1 text-right text-xs font-mono font-bold text-blue-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            <span className="text-xs text-slate-500">hrs</span>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('upload-machines')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Input Machine Data
            </button>
          )}

          <button
            type="button"
            disabled={!hasData}
            onClick={() => exportMachineProductionPlanExcel(plans, settings)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              !hasData
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'text-white bg-blue-900 hover:bg-blue-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Download Machine Production Plan.xlsx
          </button>
        </div>
      </div>

      {/* Section 9: Machine-Wise Production Plan Output Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Machine-Wise Production Plan Output
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Elapsed required time assumes all available machines of each type operate in parallel
              at their predetermined hourly capacity.
            </p>
          </div>

          {/* Interactive Time Display Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setTimeFormatMode('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                timeFormatMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time Formats
            </button>
            <button
              type="button"
              onClick={() => setTimeFormatMode('decimal')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                timeFormatMode === 'decimal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Decimal Hours
            </button>
            <button
              type="button"
              onClick={() => setTimeFormatMode('hhmm')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                timeFormatMode === 'hhmm'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HH:MM &amp; Mins
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="production-plan-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-3">Machine</th>
                <th className="py-3 px-2 text-right">Machines</th>
                <th className="py-3 px-2.5 text-right">Job Qty</th>
                <th className="py-3 px-2.5 text-right">Cap./Hr</th>
                <th className="py-3 px-2.5 text-right">Total Cap./Hr</th>
                <th className="py-3 px-2.5 text-right">Daily Cap.</th>
                <th className="py-3 px-2.5 text-right">Daily Target</th>
                <th className="py-3 px-2.5 text-right">Remaining</th>
                <th className="py-3 px-2 text-right">Util.</th>
                <th className="py-3 px-3">Required Time</th>
                <th className="py-3 px-2.5 text-right">Working Days</th>
                <th className="py-3 px-3">Capacity &amp; Schedule Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {!hasData ? (
                <tr className="text-slate-400 font-mono">
                  <td className="py-3.5 px-3">-</td>
                  <td className="py-3.5 px-2 text-right">-</td>
                  <td className="py-3.5 px-2.5 text-right">-</td>
                  <td className="py-3.5 px-2.5 text-right">-</td>
                  <td className="py-3.5 px-2.5 text-right">-</td>
                  <td className="py-3.5 px-2.5 text-right">-</td>
                  <td className="py-3.5 px-2.5 text-right">-</td>
                  <td className="py-3.5 px-2.5 text-right">-</td>
                  <td className="py-3.5 px-2 text-right">-</td>
                  <td className="py-3.5 px-3">-</td>
                  <td className="py-3.5 px-2.5 text-right">-</td>
                  <td className="py-3.5 px-3">-</td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.machineId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {p.machineName}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-700">
                      {p.numberOfMachines}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums font-medium text-slate-900">
                      {p.jobQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums text-slate-700">
                      {p.capacityPerHour.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums font-semibold text-blue-900">
                      {p.totalHourlyCapacity.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums text-slate-700">
                      {p.dailyProductionCapacity.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums font-bold text-emerald-800">
                      {p.dailyTarget.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums text-slate-700">
                      {p.remainingQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-medium text-slate-900">
                      {p.capacityUtilization.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                      {timeFormatMode === 'decimal' && (
                        <div className="font-semibold text-slate-900">
                          {p.requiredTimeDecimalFormatted}
                        </div>
                      )}
                      {timeFormatMode === 'hhmm' && (
                        <div>
                          <div className="font-semibold text-slate-900">
                            {p.requiredTimeHHMMFormatted}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.requiredTimeHoursMinutesFormatted}
                          </div>
                        </div>
                      )}
                      {timeFormatMode === 'all' && (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">
                            {p.requiredTimeDecimalFormatted} · {p.requiredTimeHHMMFormatted}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.requiredTimeHoursMinutesFormatted}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {p.requiredWorkingDays} {p.requiredWorkingDays === 1 ? 'Day' : 'Days'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.fullWorkingDays}d full
                        {p.finalDayRemainingHours > 0
                          ? ` + ${p.finalDayRemainingFormatted}h`
                          : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {p.isCapacitySufficientForSingleDay ? (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Capacity Sufficient (1 Working Day)</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Est. Completion: {p.expectedCompletionLabel}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1.5 text-amber-800 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Capacity Shortage: {p.capacityShortage.toLocaleString()} units
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Requires {p.requiredWorkingDays} Working Days · Est:{' '}
                            {p.expectedCompletionLabel}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900">
                <td className="py-3 px-3">Total / System Summary</td>
                <td className="py-3 px-2 text-right font-mono tabular-nums">
                  {hasData ? summary.totalAvailableMachines : '-'}
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                  {hasData ? summary.totalJobQuantity.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums text-slate-400">
                  -
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums text-blue-900">
                  {hasData ? summary.totalHourlyCapacity.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                  {hasData ? summary.totalDailyProductionCapacity.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums text-emerald-800">
                  {hasData ? summary.totalDailyTarget.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                  {hasData ? summary.totalRemainingQuantity.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-2 text-right font-mono tabular-nums">
                  {hasData ? `${summary.overallCapacityUtilization.toFixed(1)}%` : '-'}
                </td>
                <td className="py-3 px-3 font-mono tabular-nums">
                  {hasData ? `Max Line: ${summary.maxRequiredTimeHHMM}` : '-'}
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                  {hasData ? `Max ${summary.maxWorkingDaysRequired}d` : '-'}
                </td>
                <td className="py-3 px-3 text-slate-500 font-normal">
                  {hasData ? 'Parallel execution across machine groups' : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Section 8: Machine-Wise Production Distribution (Individual Units) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-800" />
              <h3 className="text-base font-semibold text-slate-900">
                Machine-Wise Production Distribution (Individual Machine Units)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Even distribution of daily production targets and total job quantities across
              individual machines (e.g., Zebra-01, Zebra-02, Zebra-03). Never exceeds unit daily
              capacity.
            </p>
          </div>

          {hasData && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedMachineFilter('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedMachineFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Machines ({summary.totalAvailableMachines} units)
              </button>
              {plans.map((p) => (
                <button
                  key={p.machineId}
                  type="button"
                  onClick={() => setSelectedMachineFilter(p.machineName)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedMachineFilter === p.machineName
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.machineName} ({p.numberOfMachines})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {!hasData ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Individual Machine ID</th>
                    <th className="py-2.5 px-4 text-right">Capacity / Hour</th>
                    <th className="py-2.5 px-4 text-right">
                      Daily Capacity ({settings.availableWorkingHoursPerDay}h)
                    </th>
                    <th className="py-2.5 px-4 text-right">Assigned Daily Target</th>
                    <th className="py-2.5 px-4 text-right">Daily Run Time</th>
                    <th className="py-2.5 px-4 text-right">Full Job Unit Share</th>
                    <th className="py-2.5 px-4 text-right">Total Unit Time</th>
                    <th className="py-2.5 px-4">Ranked Operator Reference</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono text-slate-400">
                  <tr>
                    <td className="py-3 px-4">-</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            filteredDistributionPlans.map((plan) => (
              <div
                key={plan.machineId}
                className="rounded-xl border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{plan.machineName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-mono tabular-nums">
                      {plan.numberOfMachines} Machine{plan.numberOfMachines > 1 ? 's' : ''}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-mono tabular-nums">
                      Unit Daily Capacity:{' '}
                      {(
                        plan.capacityPerHour * settings.availableWorkingHoursPerDay
                      ).toLocaleString()}{' '}
                      units
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums text-slate-700">
                    <span>
                      Group Daily Target:{' '}
                      <strong className="text-emerald-800">
                        {plan.dailyTarget.toLocaleString()} units
                      </strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>
                      Total Job:{' '}
                      <strong className="text-slate-900">
                        {plan.jobQuantity.toLocaleString()} units
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white text-[11px] font-semibold text-slate-500">
                        <th className="py-2.5 px-4">Individual Machine ID</th>
                        <th className="py-2.5 px-4 text-right">Capacity / Hour</th>
                        <th className="py-2.5 px-4 text-right">
                          Daily Capacity ({settings.availableWorkingHoursPerDay}h)
                        </th>
                        <th className="py-2.5 px-4 text-right">Assigned Daily Target</th>
                        <th className="py-2.5 px-4 text-right">Daily Run Time</th>
                        <th className="py-2.5 px-4 text-right">Full Job Unit Share</th>
                        <th className="py-2.5 px-4 text-right">Total Unit Time</th>
                        <th className="py-2.5 px-4">Ranked Operator Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {plan.unitAllocations.map((unit) => (
                        <tr key={unit.unitCode} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-mono font-semibold text-blue-900">
                            {unit.unitCode}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                            {unit.hourlyCapacity.toLocaleString()} /hr
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                            {unit.dailyCapacity.toLocaleString()} units
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-800">
                            {unit.assignedDailyTarget.toLocaleString()} units
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                            {unit.dailyProductionHours.toFixed(2)}h (
                            {unit.dailyProductionTimeFormatted})
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                            {unit.assignedTotalJobQuantity.toLocaleString()} units
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                            {unit.totalJobHours.toFixed(2)}h ({unit.totalJobTimeFormatted})
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {unit.suggestedOperator || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Formula Reference Card for Industrial Engineering Transparency */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 mb-3">
          <Clock className="w-4 h-4" />
          <span>Industrial Engineering Mathematical Formulas Applied</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 font-mono">
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
            <div className="text-slate-400 text-[11px] mb-1">
              A &amp; B. Hourly &amp; Daily Capacity
            </div>
            <div>Total Hourly Cap = No. Machines × Cap/Hr</div>
            <div className="mt-1">Daily Cap = Total Hourly Cap × Working Hrs</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
            <div className="text-slate-400 text-[11px] mb-1">
              C, D &amp; E. Daily Target &amp; Shortage
            </div>
            <div>Daily Target = MIN(Job Qty, Daily Cap)</div>
            <div className="mt-1">Shortage = MAX(0, Job Qty - Daily Cap)</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
            <div className="text-slate-400 text-[11px] mb-1">
              6 &amp; 7. Elapsed Time &amp; Working Days
            </div>
            <div>Req Time (Hrs) = Job Qty / Total Hourly Cap</div>
            <div className="mt-1">Working Days = CEIL(Req Time / Working Hrs)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
