import React from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { PlanningSettings, ValidationReport } from '../types/planning';
import { DEFAULT_PLANNING_SETTINGS } from '../utils/sampleData';

interface SettingsViewProps {
  settings: PlanningSettings;
  onUpdateSettings: (settings: PlanningSettings) => void;
  settingsValidation: ValidationReport;
  onResetAllDataToDefault: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  settingsValidation,
  onResetAllDataToDefault,
}) => {
  const handleNumberChange = (field: keyof PlanningSettings, rawVal: string) => {
    const num = rawVal.trim() === '' ? Number.NaN : Number(rawVal);
    onUpdateSettings({
      ...settings,
      [field]: num,
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Production Planning Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Changes to planning parameters immediately recalculate daily production capacities,
              targets, working days, and completion schedules.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings(DEFAULT_PLANNING_SETTINGS)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restore Default Settings (8h)
          </button>
        </div>

        {!settingsValidation.isValid && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 space-y-1"
          >
            {settingsValidation.errors.map((err) => (
              <div key={err.id}>• {err.message}</div>
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 1. Net Available Working Hours per Day */}
          <div>
            <label
              htmlFor="setting-working-hours"
              className="block text-xs font-semibold text-slate-900 mb-1.5"
            >
              Net Available Working Hours per Day
            </label>
            <input
              id="setting-working-hours"
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={
                Number.isNaN(settings.availableWorkingHoursPerDay)
                  ? ''
                  : settings.availableWorkingHoursPerDay
              }
              onChange={(e) =>
                handleNumberChange('availableWorkingHoursPerDay', e.target.value)
              }
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Default: 8 hours. Represents actual available planning time per machine per day.
            </p>
          </div>

          {/* 2. Planning Start Date */}
          <div>
            <label
              htmlFor="setting-planning-date"
              className="block text-xs font-semibold text-slate-900 mb-1.5"
            >
              Planning Start Date
            </label>
            <input
              id="setting-planning-date"
              type="date"
              value={settings.planningDate}
              onChange={(e) =>
                onUpdateSettings({ ...settings, planningDate: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Used to estimate expected job completion calendar dates across working days.
            </p>
          </div>

          {/* 3. Working Days per Week */}
          <div>
            <label
              htmlFor="setting-days-per-week"
              className="block text-xs font-semibold text-slate-900 mb-1.5"
            >
              Number of Working Days per Week
            </label>
            <select
              id="setting-days-per-week"
              value={settings.workingDaysPerWeek}
              onChange={(e) =>
                handleNumberChange('workingDaysPerWeek', e.target.value)
              }
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
            >
              <option value={5}>5 Days / Week (Mon–Fri)</option>
              <option value={6}>6 Days / Week (Mon–Sat)</option>
              <option value={7}>7 Days / Week (Continuous)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Determines non-working weekend days skipped during multi-day completion date
              projection.
            </p>
          </div>

          {/* 4. Number of Shifts per Day (Future-ready setting) */}
          <div>
            <label
              htmlFor="setting-shifts-per-day"
              className="block text-xs font-semibold text-slate-900 mb-1.5"
            >
              Number of Shifts per Day
            </label>
            <select
              id="setting-shifts-per-day"
              value={settings.shiftsPerDay}
              onChange={(e) => handleNumberChange('shiftsPerDay', e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
            >
              <option value={1}>1 Shift / Day (Standard)</option>
              <option value={2}>2 Shifts / Day</option>
              <option value={3}>3 Shifts / Day</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Recorded in exported reports. Ensure Net Available Working Hours per Day reflects your
              total planned daily operating hours.
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Industrial Engineering Rules Verification */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
          <ShieldCheck className="w-4 h-4 text-blue-800" />
          <h3>Industrial Engineering Calculation Integrity Guarantees</h3>
        </div>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Predetermined Machine Capacity:</strong> Uploaded Capacity (Units/Hour) is
              used directly without automatic efficiency deductions or setup/packaging activity
              adjustments.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Strict Preference-First Operator Ranking:</strong> Priority 1 always ranks
              above Priority 2, and Priority 2 always ranks above Priority 3. Experience sorts
              operators in descending order strictly within the same priority group.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>100% Local Browser Processing:</strong> Uploaded Excel sheets and production
              records are processed strictly in local browser memory and never transmitted to
              external servers.
            </span>
          </li>
        </ul>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Clear all entered machine and operator datasets back to empty (&quot;-&quot;)?
          </span>
          <button
            type="button"
            onClick={onResetAllDataToDefault}
            className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
          >
            Clear All Datasets &amp; Reset Settings
          </button>
        </div>
      </div>
    </div>
  );
};
