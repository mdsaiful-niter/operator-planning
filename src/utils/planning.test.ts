import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapMachineColumns,
  mapOperatorColumns,
  validateMachineData,
  validateOperatorData,
  validatePlanningSettings,
} from './validation';
import {
  formatAllRankingsAsText,
  rankOperatorsForMachines,
} from './rankingEngine';
import {
  calculateDashboardSummary,
  calculateMultiDayTimeline,
  calculateProductionPlans,
  formatProductionTime,
} from './productionEngine';
import {
  DEFAULT_PLANNING_SETTINGS,
  INITIAL_MACHINE_DATA,
  INITIAL_OPERATOR_DATA,
} from './sampleData';
import { MachineRecord, OperatorRecord } from '../types/planning';

test('Operator Ranking Engine - Strict Priority 1 > Priority 2 > Priority 3, Experience Descending, and Max Suggested = Number of Machines', () => {
  const machines: MachineRecord[] = [
    { id: '1', machineName: 'Zebra', numberOfMachines: 3, jobQuantity: 30000, capacityPerHour: 1200 },
  ];
  const operators: OperatorRecord[] = [
    { id: '1', operatorName: 'Rohim', experience: 20, priority1: 'Zebra', priority2: 'Snap 700', priority3: 'Epson' },
    { id: '2', operatorName: 'Karim', experience: 5, priority1: 'Zebra', priority2: 'Epson', priority3: 'Snap 700' },
    { id: '3', operatorName: 'Hasan', experience: 10, priority1: 'Snap 700', priority2: 'Zebra', priority3: 'Epson' },
    { id: '4', operatorName: 'Jamal', experience: 3, priority1: 'Epson', priority2: 'Snap 700', priority3: 'Zebra' },
  ];

  const rankings = rankOperatorsForMachines(machines, operators);
  assert.equal(rankings.length, 1);
  assert.equal(rankings[0].machineName, 'Zebra');
  assert.equal(rankings[0].numberOfMachines, 3);
  assert.equal(rankings[0].totalSuitableCount, 4);
  // Zebra has 3 machines -> suggest at most 3 operators: Rohim (P1, 20y), Karim (P1, 5y), Hasan (P2, 10y)
  assert.deepEqual(
    rankings[0].rankedOperators.map((o) => o.operatorName),
    ['Rohim', 'Karim', 'Hasan']
  );
  assert.equal(rankings[0].compactLine, 'Zebra - Rohim, Karim, Hasan');
});

test('Operator Ranking Engine - Preserves original Excel order on identical priority and experience & caps at numberOfMachines', () => {
  const machines: MachineRecord[] = [
    { id: '1', machineName: 'Zebra', numberOfMachines: 2, jobQuantity: 10000, capacityPerHour: 1000 },
    { id: '2', machineName: 'Cutting', numberOfMachines: 1, jobQuantity: 5000, capacityPerHour: 500 },
  ];
  const operators: OperatorRecord[] = [
    { id: '1', operatorName: 'OperatorAlpha', experience: 7, priority1: 'Zebra', priority2: 'Epson', priority3: 'Snap 700' },
    { id: '2', operatorName: 'OperatorBeta', experience: 7, priority1: 'Zebra', priority2: 'Snap 700', priority3: 'Epson' },
    { id: '3', operatorName: 'OperatorGamma', experience: 12, priority1: 'Zebra', priority2: 'Snap 700', priority3: 'Epson' },
  ];

  const rankings = rankOperatorsForMachines(machines, operators);
  // Zebra has 2 machines -> suggest top 2: OperatorGamma (12y, P1) -> OperatorAlpha (7y, P1, row 0)
  assert.equal(rankings[0].rankedOperators.length, 2);
  assert.equal(rankings[0].compactLine, 'Zebra - OperatorGamma, OperatorAlpha');
  assert.equal(rankings[1].hasSuitableOperators, false);
  assert.equal(rankings[1].compactLine, 'Cutting - No suitable operator found.');

  const textOutput = formatAllRankingsAsText(rankings);
  assert.equal(
    textOutput,
    'Zebra - OperatorGamma, OperatorAlpha\n\nCutting - No suitable operator found.'
  );
});

test('Production Calculation Engine - Zebra 3 machines, 30,000 units, 1,200 UPH, 8h working day', () => {
  const plans = calculateProductionPlans(INITIAL_MACHINE_DATA, DEFAULT_PLANNING_SETTINGS);
  const zebra = plans.find((p) => p.machineName === 'Zebra');
  assert.ok(zebra);

  // Total Hourly Capacity = 3 * 1200 = 3600
  assert.equal(zebra.totalHourlyCapacity, 3600);
  // Daily Production Capacity = 3600 * 8 = 28800
  assert.equal(zebra.dailyProductionCapacity, 28800);
  // Daily Target = MIN(30000, 28800) = 28800
  assert.equal(zebra.dailyTarget, 28800);
  // Remaining Quantity = MAX(0, 30000 - 28800) = 1200
  assert.equal(zebra.remainingQuantity, 1200);
  // Capacity Shortage = MAX(0, 30000 - 28800) = 1200
  assert.equal(zebra.capacityShortage, 1200);
  // Capacity Utilization = (28800 / 28800) * 100 = 100%
  assert.equal(zebra.capacityUtilization, 100);
  // Required Production Time = 30000 / 3600 = 8.333333... hours
  assert.equal(zebra.requiredTimeDecimalFormatted, '8.33 Hours');
  assert.equal(zebra.requiredTimeHoursMinutesFormatted, '08 Hours 20 Minutes');
  assert.equal(zebra.requiredTimeHHMMFormatted, '08:20');
  // Required Working Days = CEIL(8.3333 / 8) = 2 days (1 full day + 0.3333h remaining)
  assert.equal(zebra.requiredWorkingDays, 2);
  assert.equal(zebra.fullWorkingDays, 1);

  // Unit distribution: Zebra-01, Zebra-02, Zebra-03 each get 9,600 daily target
  assert.equal(zebra.unitAllocations.length, 3);
  assert.equal(zebra.unitAllocations[0].unitCode, 'Zebra-01');
  assert.equal(zebra.unitAllocations[0].assignedDailyTarget, 9600);
  assert.equal(zebra.unitAllocations[1].assignedDailyTarget, 9600);
  assert.equal(zebra.unitAllocations[2].assignedDailyTarget, 9600);
  const sumUnitDaily = zebra.unitAllocations.reduce((s, u) => s + u.assignedDailyTarget, 0);
  assert.equal(sumUnitDaily, zebra.dailyTarget);
});

test('Production Calculation Engine - Snap 700, Epson, and Cutting exact math', () => {
  const plans = calculateProductionPlans(INITIAL_MACHINE_DATA, DEFAULT_PLANNING_SETTINGS);

  const snap = plans.find((p) => p.machineName === 'Snap 700')!;
  // 2 * 973 = 1946 units/hr; 20,000 / 1946 = 10.277492 hours = 10h 17m
  assert.equal(snap.totalHourlyCapacity, 1946);
  assert.equal(snap.dailyProductionCapacity, 15568);
  assert.equal(snap.dailyTarget, 15568);
  assert.equal(snap.remainingQuantity, 4432);
  assert.equal(snap.requiredTimeHHMMFormatted, '10:17');
  assert.equal(snap.requiredWorkingDays, 2);

  const cutting = plans.find((p) => p.machineName === 'Cutting')!;
  // 1 * 500 = 500 units/hr; 10,000 / 500 = 20 hours; 20 / 8 = 2.5 -> 3 working days
  assert.equal(cutting.totalHourlyCapacity, 500);
  assert.equal(cutting.requiredProductionTimeHours, 20);
  assert.equal(cutting.requiredTimeHHMMFormatted, '20:00');
  assert.equal(cutting.requiredWorkingDays, 3);
  assert.equal(cutting.fullWorkingDays, 2);
  assert.equal(cutting.finalDayRemainingHours, 4);
});

test('Production Calculation Engine - Single day sufficiency when Job Quantity <= Daily Capacity', () => {
  const smallJob: MachineRecord[] = [
    { id: 'm1', machineName: 'Laser', numberOfMachines: 2, jobQuantity: 4000, capacityPerHour: 500 },
  ];
  const plans = calculateProductionPlans(smallJob, DEFAULT_PLANNING_SETTINGS);
  const laser = plans[0];
  // Total hourly = 1000, Daily Cap = 8000, Job = 4000
  assert.equal(laser.dailyTarget, 4000);
  assert.equal(laser.remainingQuantity, 0);
  assert.equal(laser.capacityShortage, 0);
  assert.equal(laser.capacityUtilization, 50);
  assert.equal(laser.requiredProductionTimeHours, 4);
  assert.equal(laser.requiredWorkingDays, 1);
  assert.equal(laser.isCapacitySufficientForSingleDay, true);
  assert.equal(laser.unitAllocations[0].assignedDailyTarget, 2000);
  assert.equal(laser.unitAllocations[1].assignedDailyTarget, 2000);
});

test('Validation Module - Detects duplicates, negative numbers, missing names, and flexible header aliases', () => {
  const colMap = mapMachineColumns(['Machine', 'No. of Machines', 'Job Qty', 'Capacity/Hour']);
  assert.equal(colMap.missingColumns.length, 0);

  const opColMap = mapOperatorColumns(['Operator Name', 'Experience', 'Priority 1', 'Priority 2', 'Priority 3']);
  assert.equal(opColMap.missingColumns.length, 0);

  const invalidMachines: MachineRecord[] = [
    { id: '1', machineName: 'Zebra', numberOfMachines: 0, jobQuantity: -100, capacityPerHour: 1200 },
    { id: '2', machineName: 'zebra', numberOfMachines: 2, jobQuantity: 5000, capacityPerHour: 0 },
  ];
  const machReport = validateMachineData(invalidMachines);
  assert.equal(machReport.isValid, false);
  // Zero machines, negative job quantity, duplicate name 'zebra', zero capacity
  assert.ok(machReport.errors.length >= 4);

  const invalidOperators: OperatorRecord[] = [
    { id: '1', operatorName: '', experience: -2, priority1: '', priority2: '', priority3: '' },
  ];
  const opReport = validateOperatorData(invalidOperators, INITIAL_MACHINE_DATA);
  assert.equal(opReport.isValid, false);
  assert.ok(opReport.errors.length >= 3);

  const badSettings = validatePlanningSettings({
    ...DEFAULT_PLANNING_SETTINGS,
    availableWorkingHoursPerDay: 0,
  });
  assert.equal(badSettings.isValid, false);

  const summary = calculateDashboardSummary(
    INITIAL_MACHINE_DATA,
    INITIAL_OPERATOR_DATA,
    calculateProductionPlans(INITIAL_MACHINE_DATA, DEFAULT_PLANNING_SETTINGS)
  );
  assert.equal(summary.totalMachineTypes, 4);
  assert.equal(summary.totalAvailableMachines, 8);
  assert.equal(summary.totalOperators, 6);
  assert.equal(summary.totalJobQuantity, 75000);
  assert.equal(summary.totalHourlyCapacity, 7746);
  assert.equal(formatProductionTime(8.3333333).hhmmFormatted, '08:20');
});

test('Multi-Day Production Timeline - Identifies bottleneck machine and calculates daily active vs. idle hours', () => {
  const plans = calculateProductionPlans(INITIAL_MACHINE_DATA, DEFAULT_PLANNING_SETTINGS);
  const timeline = calculateMultiDayTimeline(plans, 8);

  assert.equal(timeline.totalHorizonDays, 3);
  assert.equal(timeline.totalHorizonHours, 24);
  assert.deepEqual(timeline.bottleneckMachineNames, ['Cutting']);
  assert.equal(timeline.maxRequiredTimeHHMM, '20:00');

  const zebraRow = timeline.rows.find((r) => r.machineName === 'Zebra')!;
  assert.equal(zebraRow.isBottleneck, false);
  assert.equal(zebraRow.days.length, 3);
  // Day 1: 8h active, 0h idle, 28,800 units
  assert.equal(zebraRow.days[0].activeTimeHHMM, '08:00');
  assert.equal(zebraRow.days[0].idleTimeHHMM, '00:00');
  assert.equal(zebraRow.days[0].producedUnits, 28800);
  // Day 2: 00:20 active, 07:40 idle, 1,200 units
  assert.equal(zebraRow.days[1].activeTimeHHMM, '00:20');
  assert.equal(zebraRow.days[1].idleTimeHHMM, '07:40');
  assert.equal(zebraRow.days[1].producedUnits, 1200);
  // Day 3: 00:00 active, 08:00 idle, 0 units
  assert.equal(zebraRow.days[2].status, 'idle');
  assert.equal(zebraRow.days[2].idleTimeHHMM, '08:00');

  const cuttingRow = timeline.rows.find((r) => r.machineName === 'Cutting')!;
  assert.equal(cuttingRow.isBottleneck, true);
  assert.equal(cuttingRow.days[0].activeTimeHHMM, '08:00');
  assert.equal(cuttingRow.days[1].activeTimeHHMM, '08:00');
  assert.equal(cuttingRow.days[2].activeTimeHHMM, '04:00');
  assert.equal(cuttingRow.days[2].idleTimeHHMM, '04:00');
});

