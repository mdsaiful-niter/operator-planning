export type NavigationTab =
  | 'dashboard'
  | 'upload-machines'
  | 'upload-operators'
  | 'production-planning'
  | 'operator-ranking'
  | 'reports-export'
  | 'settings';

export interface MachineRecord {
  id: string;
  machineName: string;
  numberOfMachines: number;
  jobQuantity: number;
  capacityPerHour: number;
}

export interface OperatorRecord {
  id: string;
  operatorName: string;
  experience: number;
  priority1: string;
  priority2: string;
  priority3: string;
}

export interface PlanningSettings {
  availableWorkingHoursPerDay: number;
  planningDate: string;
  workingDaysPerWeek: number;
  shiftsPerDay: number;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  rowIndex?: number;
  rowId?: string;
  field?: string;
  message: string;
}

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface RankedOperatorItem {
  operatorId: string;
  operatorName: string;
  experience: number;
  priorityLevel: 1 | 2 | 3;
  originalIndex: number;
}

export interface MachineOperatorRanking {
  machineName: string;
  numberOfMachines: number;
  totalSuitableCount: number;
  rankedOperators: RankedOperatorItem[];
  compactLine: string;
  rankedNamesCsv: string;
  hasSuitableOperators: boolean;
}

export interface IndividualMachineAllocation {
  unitCode: string; // e.g., Zebra-01
  machineName: string;
  unitIndex: number;
  hourlyCapacity: number;
  dailyCapacity: number;
  assignedDailyTarget: number;
  assignedTotalJobQuantity: number;
  dailyProductionHours: number;
   dailyProductionTimeFormatted: string;
  totalJobHours: number;
  totalJobTimeFormatted: string;
  utilizationPercent: number;
  suggestedOperator?: string;
}

export interface MachineProductionPlan {
  machineId: string;
  machineName: string;
  numberOfMachines: number;
  jobQuantity: number;
  capacityPerHour: number;
  totalHourlyCapacity: number;
  dailyProductionCapacity: number;
  dailyTarget: number;
  remainingQuantity: number;
  capacityShortage: number;
  capacityUtilization: number;
  requiredProductionTimeHours: number;
  requiredTimeDecimalFormatted: string; // e.g., "8.33 Hours"
  requiredTimeHoursMinutesFormatted: string; // e.g., "08 Hours 20 Minutes"
  requiredTimeHHMMFormatted: string; // e.g., "08:20"
  requiredWorkingDays: number;
  fullWorkingDays: number;
  finalDayRemainingHours: number;
  finalDayRemainingFormatted: string;
  expectedCompletionDate: string;
  expectedCompletionLabel: string;
  isCapacitySufficientForSingleDay: boolean;
  unitAllocations: IndividualMachineAllocation[];
}

export interface DashboardSummaryKPIs {
  totalMachineTypes: number;
  totalAvailableMachines: number;
  totalOperators: number;
  totalJobQuantity: number;
  totalHourlyCapacity: number;
  totalDailyProductionCapacity: number;
  totalDailyTarget: number;
  totalRemainingQuantity: number;
  overallCapacityUtilization: number;
  maxRequiredProductionTimeHours: number;
  maxRequiredTimeHHMM: string;
  maxRequiredTimeHoursMinutes: string;
  maxWorkingDaysRequired: number;
  totalWorkloadHoursSum: number;
}

export interface DayTimelineSegment {
  dayNumber: number;
  activeHours: number;
  idleHours: number;
  activeTimeHHMM: string;
  idleTimeHHMM: string;
  producedUnits: number;
  utilizationPercent: number;
  status: 'full' | 'partial' | 'idle';
}

export interface MachineTimelineRow {
  machineId: string;
  machineName: string;
  numberOfMachines: number;
  totalHourlyCapacity: number;
  jobQuantity: number;
  totalActiveHours: number;
  totalActiveTimeHHMM: string;
  totalIdleHoursInHorizon: number;
  totalIdleTimeHHMM: string;
  requiredWorkingDays: number;
  horizonUtilizationPercent: number;
  isBottleneck: boolean;
  days: DayTimelineSegment[];
}

export interface MultiDayTimelineAnalysis {
  totalHorizonDays: number;
  workingHoursPerDay: number;
  totalHorizonHours: number;
  bottleneckMachineNames: string[];
  maxRequiredHours: number;
  maxRequiredTimeHHMM: string;
  totalFleetIdleHours: number;
  totalFleetIdleTimeHHMM: string;
  rows: MachineTimelineRow[];
}

