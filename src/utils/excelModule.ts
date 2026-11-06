import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DashboardSummaryKPIs,
  MachineOperatorRanking,
  MachineProductionPlan,
  MachineRecord,
  OperatorRecord,
  PlanningSettings,
} from '../types/planning';
import { INITIAL_MACHINE_DATA, INITIAL_OPERATOR_DATA } from './sampleData';
import { mapMachineColumns, mapOperatorColumns } from './validation';

export interface ParsedExcelResult<T> {
  records: T[];
  missingColumns: string[];
  rawRowCount: number;
  sheetName: string;
}

/**
 * Parses an uploaded Excel (.xlsx / .xls) file for Machine & Production Data
 */
export async function parseMachineExcelFile(
  file: File
): Promise<ParsedExcelResult<MachineRecord>> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    return {
      records: [],
      missingColumns: [],
      rawRowCount: 0,
      sheetName,
    };
  }

  const headers = Object.keys(rawRows[0]);
  const { mappedHeaders, missingColumns } = mapMachineColumns(headers);

  if (missingColumns.length > 0) {
    return {
      records: [],
      missingColumns,
      rawRowCount: rawRows.length,
      sheetName,
    };
  }

  const records: MachineRecord[] = rawRows.map((row, idx) => {
    const rawName = row[mappedHeaders.machineName!];
    const rawCount = row[mappedHeaders.numberOfMachines!];
    const rawJobQty = row[mappedHeaders.jobQuantity!];
    const rawCap = row[mappedHeaders.capacityPerHour!];

    const parseNumeric = (val: unknown): number => {
      if (val === null || val === undefined || String(val).trim() === '') {
        return Number.NaN;
      }
      const cleaned = String(val).replace(/,/g, '').trim();
      return Number(cleaned);
    };

    return {
      id: `mach-upload-${Date.now()}-${idx + 1}`,
      machineName: rawName !== null && rawName !== undefined ? String(rawName).trim() : '',
      numberOfMachines: parseNumeric(rawCount),
      jobQuantity: parseNumeric(rawJobQty),
      capacityPerHour: parseNumeric(rawCap),
    };
  });

  return {
    records,
    missingColumns: [],
    rawRowCount: rawRows.length,
    sheetName,
  };
}

/**
 * Parses an uploaded Excel (.xlsx / .xls) file for Operator Information
 */
export async function parseOperatorExcelFile(
  file: File
): Promise<ParsedExcelResult<OperatorRecord>> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    return {
      records: [],
      missingColumns: [],
      rawRowCount: 0,
      sheetName,
    };
  }

  const headers = Object.keys(rawRows[0]);
  const { mappedHeaders, missingColumns } = mapOperatorColumns(headers);

  if (missingColumns.length > 0) {
    return {
      records: [],
      missingColumns,
      rawRowCount: rawRows.length,
      sheetName,
    };
  }

  const records: OperatorRecord[] = rawRows.map((row, idx) => {
    const rawName = row[mappedHeaders.operatorName!];
    const rawExp = row[mappedHeaders.experience!];
    const rawP1 = row[mappedHeaders.priority1!];
    const rawP2 = row[mappedHeaders.priority2!];
    const rawP3 = row[mappedHeaders.priority3!];

    const parseNumeric = (val: unknown): number => {
      if (val === null || val === undefined || String(val).trim() === '') {
        return Number.NaN;
      }
      const cleaned = String(val).replace(/,/g, '').trim();
      return Number(cleaned);
    };

    return {
      id: `op-upload-${Date.now()}-${idx + 1}`,
      operatorName: rawName !== null && rawName !== undefined ? String(rawName).trim() : '',
      experience: parseNumeric(rawExp),
      priority1: rawP1 !== null && rawP1 !== undefined ? String(rawP1).trim() : '',
      priority2: rawP2 !== null && rawP2 !== undefined ? String(rawP2).trim() : '',
      priority3: rawP3 !== null && rawP3 !== undefined ? String(rawP3).trim() : '',
    };
  });

  return {
    records,
    missingColumns: [],
    rawRowCount: rawRows.length,
    sheetName,
  };
}

/**
 * Downloads Sample Machine & Production Excel Template
 */
export function downloadSampleMachineTemplate(): void {
  const rows = INITIAL_MACHINE_DATA.map((m) => ({
    'Machine Name': m.machineName,
    'Number of Machines': m.numberOfMachines,
    'Job Quantity': m.jobQuantity,
    'Capacity (Units/Hour)': m.capacityPerHour,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Machine & Production');
  XLSX.writeFile(wb, 'Sample_Machine_Production_Template.xlsx');
}

/**
 * Downloads Sample Operator Information Excel Template
 */
export function downloadSampleOperatorTemplate(): void {
  const rows = INITIAL_OPERATOR_DATA.map((o) => ({
    'Operator Name': o.operatorName,
    'Experience (Years)': o.experience,
    'Machine Priority 1': o.priority1,
    'Machine Priority 2': o.priority2,
    'Machine Priority 3': o.priority3,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Operator Information');
  XLSX.writeFile(wb, 'Sample_Operator_Information_Template.xlsx');
}

/**
 * EXPORT 1: Download Machine Production Plan.xlsx
 */
export function exportMachineProductionPlanExcel(
  plans: MachineProductionPlan[],
  settings: PlanningSettings
): void {
  const planRows = plans.map((p) => ({
    Machine: p.machineName,
    'No. of Machines': p.numberOfMachines,
    'Job Quantity': p.jobQuantity,
    'Capacity/Hour': p.capacityPerHour,
    'Total Hourly Capacity': p.totalHourlyCapacity,
    'Daily Production Capacity': p.dailyProductionCapacity,
    'Daily Target': p.dailyTarget,
    'Remaining Job Quantity': p.remainingQuantity,
    'Capacity Shortage': p.capacityShortage,
    'Capacity Utilization (%)': Number(p.capacityUtilization.toFixed(2)),
    'Required Time (Decimal Hours)': Number(p.requiredProductionTimeHours.toFixed(2)),
    'Required Time (HH:MM)': p.requiredTimeHHMMFormatted,
    'Required Time (Hours & Minutes)': p.requiredTimeHoursMinutesFormatted,
    'Working Days': p.requiredWorkingDays,
    'Estimated Completion': p.expectedCompletionLabel,
  }));

  const unitRows = plans.flatMap((p) =>
    p.unitAllocations.map((u) => ({
      'Unit ID': u.unitCode,
      'Machine Group': u.machineName,
      'Unit Capacity/Hour': u.hourlyCapacity,
      'Unit Daily Capacity': u.dailyCapacity,
      'Assigned Daily Target': u.assignedDailyTarget,
      'Daily Operating Time (HH:MM)': u.dailyProductionTimeFormatted,
      'Total Job Allocation': u.assignedTotalJobQuantity,
      'Total Unit Production Time (HH:MM)': u.totalJobTimeFormatted,
      'Daily Utilization (%)': Number(u.utilizationPercent.toFixed(2)),
      'Top Ranked Available Operator': u.suggestedOperator || 'Unassigned',
    }))
  );

  const wb = XLSX.utils.book_new();

  const wsPlan = XLSX.utils.json_to_sheet(planRows);
  wsPlan['!cols'] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 15 },
    { wch: 15 },
    { wch: 22 },
    { wch: 24 },
    { wch: 15 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 26 },
    { wch: 20 },
    { wch: 28 },
    { wch: 15 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPlan, 'Production Plan');

  if (unitRows.length > 0) {
    const wsUnits = XLSX.utils.json_to_sheet(unitRows);
    wsUnits['!cols'] = [
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 26 },
      { wch: 22 },
      { wch: 30 },
      { wch: 20 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsUnits, 'Machine Unit Distribution');
  }

  const wsConfig = XLSX.utils.json_to_sheet([
    { Parameter: 'Net Available Working Hours per Day', Value: settings.availableWorkingHoursPerDay },
    { Parameter: 'Planning Start Date', Value: settings.planningDate },
    { Parameter: 'Working Days per Week', Value: settings.workingDaysPerWeek },
    { Parameter: 'Shifts per Day', Value: settings.shiftsPerDay },
  ]);
  wsConfig['!cols'] = [{ wch: 35 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsConfig, 'Planning Parameters');

  XLSX.writeFile(wb, 'Machine Production Plan.xlsx');
}

/**
 * EXPORT 2: Download Operator Ranking.xlsx
 * Maintains the simple format: Machine Name | Ranked Operator Names
 */
export function exportOperatorRankingExcel(rankings: MachineOperatorRanking[]): void {
  const simpleRows = rankings.map((r) => ({
    'Machine Name': r.machineName,
    'Ranked Operator Names': r.rankedNamesCsv,
    'Formatted Summary': r.compactLine,
  }));

  const wb = XLSX.utils.book_new();
  const wsSimple = XLSX.utils.json_to_sheet(simpleRows);
  wsSimple['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsSimple, 'Operator Ranking');

  const breakdownRows = rankings.flatMap<{
    'Machine Name': string;
    Rank: number | string;
    'Operator Name': string;
    'Machine Priority': string;
    'Experience (Years)': number | string;
  }>((r) =>
    r.rankedOperators.length > 0
      ? r.rankedOperators.map((op, idx) => ({
          'Machine Name': r.machineName,
          Rank: idx + 1,
          'Operator Name': op.operatorName,
          'Machine Priority': `Priority ${op.priorityLevel}`,
          'Experience (Years)': op.experience,
        }))
      : [
          {
            'Machine Name': r.machineName,
            Rank: '-',
            'Operator Name': 'No suitable operator found.',
            'Machine Priority': '-',
            'Experience (Years)': '-',
          },
        ]
  );

  const wsDetails = XLSX.utils.json_to_sheet(breakdownRows);
  wsDetails['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Ranking Breakdown');

  XLSX.writeFile(wb, 'Operator Ranking.xlsx');
}

/**
 * EXPORT 3: Download Complete Production Report.xlsx
 */
export function exportCompleteProductionReportExcel(
  plans: MachineProductionPlan[],
  rankings: MachineOperatorRanking[],
  machines: MachineRecord[],
  operators: OperatorRecord[],
  settings: PlanningSettings,
  summary: DashboardSummaryKPIs
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryRows = [
    { Metric: 'Total Machine Types', Value: summary.totalMachineTypes },
    { Metric: 'Total Available Machines', Value: summary.totalAvailableMachines },
    { Metric: 'Total Operators', Value: summary.totalOperators },
    { Metric: 'Total Job Quantity (Units)', Value: summary.totalJobQuantity },
    { Metric: 'Total Hourly Capacity (Units/Hr)', Value: summary.totalHourlyCapacity },
    { Metric: 'Total Daily Production Capacity (Units/Day)', Value: summary.totalDailyProductionCapacity },
    { Metric: 'Total Daily Production Target (Units/Day)', Value: summary.totalDailyTarget },
    { Metric: 'Total Remaining Job Quantity (Units)', Value: summary.totalRemainingQuantity },
    { Metric: 'Overall Daily Capacity Utilization (%)', Value: Number(summary.overallCapacityUtilization.toFixed(2)) },
    { Metric: 'Critical Path Max Production Time (Hours)', Value: Number(summary.maxRequiredProductionTimeHours.toFixed(2)) },
    { Metric: 'Critical Path Max Production Time (HH:MM)', Value: summary.maxRequiredTimeHHMM },
    { Metric: 'Estimated Total Working Days Required', Value: summary.maxWorkingDaysRequired },
    { Metric: 'Net Available Working Hours per Day', Value: settings.availableWorkingHoursPerDay },
    { Metric: 'Planning Date', Value: settings.planningDate },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 44 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // Sheet 2: Production Plan
  const planRows = plans.map((p) => ({
    Machine: p.machineName,
    'No. of Machines': p.numberOfMachines,
    'Job Quantity': p.jobQuantity,
    'Capacity/Hour': p.capacityPerHour,
    'Total Hourly Capacity': p.totalHourlyCapacity,
    'Daily Production Capacity': p.dailyProductionCapacity,
    'Daily Target': p.dailyTarget,
    'Remaining Quantity': p.remainingQuantity,
    'Capacity Shortage': p.capacityShortage,
    'Capacity Utilization (%)': Number(p.capacityUtilization.toFixed(2)),
    'Required Time (Decimal)': p.requiredTimeDecimalFormatted,
    'Required Time (HH:MM)': p.requiredTimeHHMMFormatted,
    'Required Time (Full)': p.requiredTimeHoursMinutesFormatted,
    'Working Days': p.requiredWorkingDays,
    'Completion Schedule': p.expectedCompletionLabel,
  }));
  const wsPlan = XLSX.utils.json_to_sheet(planRows);
  wsPlan['!cols'] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 15 },
    { wch: 15 },
    { wch: 22 },
    { wch: 24 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 26 },
    { wch: 15 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPlan, 'Production Plan');

  // Sheet 3: Operator Ranking
  const rankingRows = rankings.map((r) => ({
    'Machine Name': r.machineName,
    'Ranked Operator Names': r.rankedNamesCsv,
    'Compact Output': r.compactLine,
  }));
  const wsRanking = XLSX.utils.json_to_sheet(rankingRows);
  wsRanking['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsRanking, 'Operator Ranking');

  // Sheet 4: Machine-Wise Distribution
  const unitRows = plans.flatMap((p) =>
    p.unitAllocations.map((u) => ({
      'Machine Unit': u.unitCode,
      'Machine Type': u.machineName,
      'Capacity/Hour': u.hourlyCapacity,
      'Daily Capacity': u.dailyCapacity,
      'Daily Target': u.assignedDailyTarget,
      'Daily Run Time (HH:MM)': u.dailyProductionTimeFormatted,
      'Total Job Quantity': u.assignedTotalJobQuantity,
      'Total Run Time (HH:MM)': u.totalJobTimeFormatted,
      'Utilization (%)': Number(u.utilizationPercent.toFixed(2)),
    }))
  );
  const wsUnits = XLSX.utils.json_to_sheet(unitRows);
  wsUnits['!cols'] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsUnits, 'Unit Distribution');

  // Sheet 5: Raw Operator Data
  const opRows = operators.map((o) => ({
    'Operator Name': o.operatorName,
    'Experience (Years)': o.experience,
    'Machine Priority 1': o.priority1,
    'Machine Priority 2': o.priority2,
    'Machine Priority 3': o.priority3,
  }));
  const wsOps = XLSX.utils.json_to_sheet(opRows);
  wsOps['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsOps, 'Operator Input Data');

  // Sheet 6: Raw Machine Data
  const machRows = machines.map((m) => ({
    'Machine Name': m.machineName,
    'Number of Machines': m.numberOfMachines,
    'Job Quantity': m.jobQuantity,
    'Capacity (Units/Hour)': m.capacityPerHour,
  }));
  const wsMach = XLSX.utils.json_to_sheet(machRows);
  wsMach['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsMach, 'Machine Input Data');

  XLSX.writeFile(wb, 'Complete Production Report.xlsx');
}

/**
 * EXPORT 4: Download Production Report.pdf
 */
export function exportProductionReportPDF(
  plans: MachineProductionPlan[],
  rankings: MachineOperatorRanking[],
  settings: PlanningSettings,
  summary: DashboardSummaryKPIs
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('MACHINE & OPERATOR PLANNING REPORT', 40, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Planning Date: ${settings.planningDate}   |   Available Working Hours/Day: ${settings.availableWorkingHoursPerDay}h   |   Working Days/Week: ${settings.workingDaysPerWeek}   |   Shifts/Day: ${settings.shiftsPerDay}`,
    40,
    58
  );

  // Summary KPIs row
  autoTable(doc, {
    startY: 72,
    head: [
      [
        'Machine Types',
        'Total Machines',
        'Total Operators',
        'Total Job Qty',
        'Total Hourly Cap.',
        'Daily Prod. Capacity',
        'Daily Target',
        'Max Completion Time',
      ],
    ],
    body: [
      [
        String(summary.totalMachineTypes),
        String(summary.totalAvailableMachines),
        String(summary.totalOperators),
        summary.totalJobQuantity.toLocaleString(),
        `${summary.totalHourlyCapacity.toLocaleString()} /hr`,
        `${summary.totalDailyProductionCapacity.toLocaleString()} /day`,
        summary.totalDailyTarget.toLocaleString(),
        `${summary.maxRequiredTimeHHMM} (${summary.maxWorkingDaysRequired}d)`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
    margin: { left: 40, right: 40 },
  });

  const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Machine-Wise Production Plan', 40, afterSummaryY);

  autoTable(doc, {
    startY: afterSummaryY + 8,
    head: [
      [
        'Machine',
        'No. of Machines',
        'Job Quantity',
        'Capacity/Hour',
        'Total Hourly Cap.',
        'Daily Capacity',
        'Daily Target',
        'Remaining Qty',
        'Utilization',
        'Required Time',
        'Working Days',
      ],
    ],
    body: plans.map((p) => [
      p.machineName,
      String(p.numberOfMachines),
      p.jobQuantity.toLocaleString(),
      p.capacityPerHour.toLocaleString(),
      p.totalHourlyCapacity.toLocaleString(),
      p.dailyProductionCapacity.toLocaleString(),
      p.dailyTarget.toLocaleString(),
      p.remainingQuantity.toLocaleString(),
      `${p.capacityUtilization.toFixed(1)}%`,
      `${p.requiredTimeDecimalFormatted} (${p.requiredTimeHHMMFormatted})`,
      `${p.requiredWorkingDays}d`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    margin: { left: 40, right: 40 },
  });

  const afterPlanY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Machine-Wise Operator Suitability Ranking', 40, afterPlanY);

  autoTable(doc, {
    startY: afterPlanY + 8,
    head: [['Machine Name', 'Ranked Suitable Operators (Priority 1 -> Priority 2 -> Priority 3, Experience Desc.)']],
    body: rankings.map((r) => [r.machineName, r.rankedNamesCsv]),
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 140, fontStyle: 'bold' },
    },
    margin: { left: 40, right: 40 },
  });

  doc.save('Production Report.pdf');
}
