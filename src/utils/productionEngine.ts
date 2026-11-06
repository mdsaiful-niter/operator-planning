import {
  DashboardSummaryKPIs,
  DayTimelineSegment,
  IndividualMachineAllocation,
  MachineOperatorRanking,
  MachineProductionPlan,
  MachineRecord,
  MachineTimelineRow,
  MultiDayTimelineAnalysis,
  OperatorRecord,
  PlanningSettings,
} from '../types/planning';

/**
 * Formats a duration in hours into:
 * 1) Decimal Hours: "8.33 Hours"
 * 2) Hours and Minutes: "08 Hours 20 Minutes"
 * 3) HH:MM format: "08:20"
 */
export function formatProductionTime(hours: number): {
  decimalFormatted: string;
  hoursMinutesFormatted: string;
  hhmmFormatted: string;
} {
  if (!Number.isFinite(hours) || hours <= 0) {
    return {
      decimalFormatted: '0.00 Hours',
      hoursMinutesFormatted: '00 Hours 00 Minutes',
      hhmmFormatted: '00:00',
    };
  }

  const decimalFormatted = `${hours.toFixed(2)} Hours`;

  // Convert total hours to nearest whole minute to avoid floating point precision drift (e.g. 8.333333 * 60 = 500 mins = 8h 20m)
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const paddedHours = String(wholeHours).padStart(2, '0');
  const paddedMinutes = String(remainingMinutes).padStart(2, '0');

  return {
    decimalFormatted,
    hoursMinutesFormatted: `${paddedHours} Hours ${paddedMinutes} Minutes`,
    hhmmFormatted: `${paddedHours}:${paddedMinutes}`,
  };
}

/**
 * Calculates the expected completion calendar date given a start date, required working days,
 * and working days per week (1..7).
 */
export function calculateExpectedCompletionDate(
  planningDateStr: string,
  requiredWorkingDays: number,
  workingDaysPerWeek: number = 6
): { dateFormatted: string; label: string } {
  if (requiredWorkingDays <= 0) {
    return {
      dateFormatted: planningDateStr || 'N/A',
      label: 'Immediate (0 Days)',
    };
  }

  const parsed = planningDateStr ? new Date(`${planningDateStr}T00:00:00`) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return {
      dateFormatted: 'N/A',
      label: `Day ${requiredWorkingDays}`,
    };
  }

  // Day 1 of production is the planning start date itself (assuming it is a working day).
  // Each additional working day advances the calendar, skipping non-working weekend days if workingDaysPerWeek < 7.
  const current = new Date(parsed.getTime());
  let daysRemainingToAdvance = Math.max(0, requiredWorkingDays - 1);

  while (daysRemainingToAdvance > 0) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    const isOffDay =
      (workingDaysPerWeek === 6 && dayOfWeek === 0) ||
      (workingDaysPerWeek <= 5 && (dayOfWeek === 0 || dayOfWeek === 6));
    if (!isOffDay) {
      daysRemainingToAdvance--;
    }
  }

  const yyyy = current.getFullYear();
  const mm = String(current.getMonth() + 1).padStart(2, '0');
  const dd = String(current.getDate()).padStart(2, '0');
  const isoDate = `${yyyy}-${mm}-${dd}`;

  return {
    dateFormatted: isoDate,
    label: requiredWorkingDays === 1 ? `Day 1 (${isoDate})` : `Day ${requiredWorkingDays} (${isoDate})`,
  };
}

/**
 * Distributes the daily target and total job quantity across individual machines of the same type
 * (e.g. Zebra-01, Zebra-02, Zebra-03) while ensuring:
 * 1) Assigned daily quantity never exceeds individual machine daily capacity or total job quantity.
 * 2) Total assigned quantity across units reconciles accurately with the machine group total.
 */
export function calculateUnitAllocations(
  machine: MachineRecord,
  availableWorkingHoursPerDay: number,
  dailyTarget: number,
  rankedOperators?: MachineOperatorRanking
): IndividualMachineAllocation[] {
  const count = Math.max(0, Math.floor(Number(machine.numberOfMachines) || 0));
  const capacityPerHour = Math.max(0, Number(machine.capacityPerHour) || 0);
  const jobQuantity = Math.max(0, Number(machine.jobQuantity) || 0);
  const unitDailyCapacity = capacityPerHour * availableWorkingHoursPerDay;

  if (count <= 0) return [];

  const allocations: IndividualMachineAllocation[] = [];

  // Even integer distribution with remainder reconciliation so sum matches exactly
  const baseDailyUnit = Math.floor(dailyTarget / count);
  let dailyRemainder = Math.round(dailyTarget - baseDailyUnit * count);

  const baseTotalJobUnit = Math.floor(jobQuantity / count);
  let totalJobRemainder = Math.round(jobQuantity - baseTotalJobUnit * count);

  for (let i = 0; i < count; i++) {
    const unitNumber = String(i + 1).padStart(2, '0');
    const unitCode = `${machine.machineName.trim()}-${unitNumber}`;

    let assignedDaily = baseDailyUnit + (dailyRemainder > 0 ? 1 : 0);
    if (dailyRemainder > 0) dailyRemainder--;
    // Never exceed unit daily capacity
    assignedDaily = Math.min(assignedDaily, unitDailyCapacity);

    let assignedTotalJob = baseTotalJobUnit + (totalJobRemainder > 0 ? 1 : 0);
    if (totalJobRemainder > 0) totalJobRemainder--;

    const dailyProdHours = capacityPerHour > 0 ? assignedDaily / capacityPerHour : 0;
    const totalJobHours = capacityPerHour > 0 ? assignedTotalJob / capacityPerHour : 0;
    const utilizationPercent =
      unitDailyCapacity > 0 ? (assignedDaily / unitDailyCapacity) * 100 : 0;

    const dailyTimeFormatted = formatProductionTime(dailyProdHours).hhmmFormatted;
    const totalTimeFormatted = formatProductionTime(totalJobHours).hhmmFormatted;

    const suggestedOperator =
      rankedOperators && rankedOperators.rankedOperators[i]
        ? `${rankedOperators.rankedOperators[i].operatorName} (P${rankedOperators.rankedOperators[i].priorityLevel}, ${rankedOperators.rankedOperators[i].experience}y)`
        : undefined;

    allocations.push({
      unitCode,
      machineName: machine.machineName.trim(),
      unitIndex: i + 1,
      hourlyCapacity: capacityPerHour,
      dailyCapacity: unitDailyCapacity,
      assignedDailyTarget: assignedDaily,
      assignedTotalJobQuantity: assignedTotalJob,
      dailyProductionHours: dailyProdHours,
      dailyProductionTimeFormatted: dailyTimeFormatted,
      totalJobHours,
      totalJobTimeFormatted: totalTimeFormatted,
      utilizationPercent,
      suggestedOperator,
    });
  }

  return allocations;
}

/**
 * Calculates the complete production plan for every machine type
 * strictly adhering to Sections 5, 6, 7, 8, 9, and 17.
 */
export function calculateProductionPlans(
  machines: MachineRecord[],
  settings: PlanningSettings,
  rankings: MachineOperatorRanking[] = []
): MachineProductionPlan[] {
  const workingHours = Math.max(0, Number(settings.availableWorkingHoursPerDay) || 0);
  const rankingMap = new Map<string, MachineOperatorRanking>();
  rankings.forEach((r) => rankingMap.set(r.machineName.trim().toLowerCase(), r));

  return machines.map((machine) => {
    const numMachines = Math.max(0, Math.floor(Number(machine.numberOfMachines) || 0));
    const jobQuantity = Math.max(0, Number(machine.jobQuantity) || 0);
    // Rule 1-5: Treat input capacity as final usable production rate per individual machine per hour
    const capacityPerHour = Math.max(0, Number(machine.capacityPerHour) || 0);

    // Formula A: Total Hourly Capacity = Number of Machines * Capacity per Machine per Hour
    const totalHourlyCapacity = numMachines * capacityPerHour;

    // Formula B: Daily Production Capacity = Total Hourly Capacity * Available Working Hours per Day
    const dailyProductionCapacity = totalHourlyCapacity * workingHours;

    // Formula C: Daily Production Target = MIN(Job Quantity, Daily Production Capacity)
    const dailyTarget = Math.min(jobQuantity, dailyProductionCapacity);

    // Formula D: Remaining Quantity = MAX(0, Job Quantity - Daily Production Target)
    const remainingQuantity = Math.max(0, jobQuantity - dailyTarget);

    // Formula E: Capacity Shortage = MAX(0, Job Quantity - Daily Production Capacity)
    const capacityShortage = Math.max(0, jobQuantity - dailyProductionCapacity);

    // Formula F: Capacity Utilization = (Daily Production Target / Daily Production Capacity) * 100
    const capacityUtilization =
      dailyProductionCapacity > 0 ? (dailyTarget / dailyProductionCapacity) * 100 : 0;

    // Section 6: Required Production Time (Hours) = Job Quantity / Total Hourly Capacity
    const requiredProductionTimeHours =
      totalHourlyCapacity > 0 ? jobQuantity / totalHourlyCapacity : 0;

    const timeFormats = formatProductionTime(requiredProductionTimeHours);

    // Section 7: Required Working Days = CEILING(Required Production Time / Available Working Hours per Day)
    const requiredWorkingDays =
      workingHours > 0 && requiredProductionTimeHours > 0
        ? Math.ceil(requiredProductionTimeHours / workingHours - 1e-9)
        : 0;

    const fullWorkingDays =
      workingHours > 0 && requiredProductionTimeHours > 0
        ? Math.floor((requiredProductionTimeHours + 1e-9) / workingHours)
        : 0;

    const rawRemainingHours =
      workingHours > 0
        ? Math.max(0, requiredProductionTimeHours - fullWorkingDays * workingHours)
        : 0;

    const finalDayRemainingHours = rawRemainingHours < 1e-6 ? 0 : rawRemainingHours;
    const finalDayRemainingFormatted = formatProductionTime(finalDayRemainingHours).hhmmFormatted;

    const completionInfo = calculateExpectedCompletionDate(
      settings.planningDate,
      requiredWorkingDays,
      settings.workingDaysPerWeek
    );

    const isCapacitySufficientForSingleDay = capacityShortage === 0;

    const machineRanking = rankingMap.get((machine.machineName ?? '').trim().toLowerCase());
    const unitAllocations = calculateUnitAllocations(
      machine,
      workingHours,
      dailyTarget,
      machineRanking
    );

    return {
      machineId: machine.id,
      machineName: (machine.machineName ?? '').trim(),
      numberOfMachines: numMachines,
      jobQuantity,
      capacityPerHour,
      totalHourlyCapacity,
      dailyProductionCapacity,
      dailyTarget,
      remainingQuantity,
      capacityShortage,
      capacityUtilization,
      requiredProductionTimeHours,
      requiredTimeDecimalFormatted: timeFormats.decimalFormatted,
      requiredTimeHoursMinutesFormatted: timeFormats.hoursMinutesFormatted,
      requiredTimeHHMMFormatted: timeFormats.hhmmFormatted,
      requiredWorkingDays,
      fullWorkingDays,
      finalDayRemainingHours,
      finalDayRemainingFormatted,
      expectedCompletionDate: completionInfo.dateFormatted,
      expectedCompletionLabel: completionInfo.label,
      isCapacitySufficientForSingleDay,
      unitAllocations,
    };
  });
}

/**
 * Calculates aggregate Dashboard Summary KPIs from the active production plans and operators
 */
export function calculateDashboardSummary(
  machines: MachineRecord[],
  operators: OperatorRecord[],
  plans: MachineProductionPlan[]
): DashboardSummaryKPIs {
  const totalMachineTypes = machines.length;
  const totalAvailableMachines = plans.reduce((sum, p) => sum + p.numberOfMachines, 0);
  const totalOperators = operators.length;
  const totalJobQuantity = plans.reduce((sum, p) => sum + p.jobQuantity, 0);
  const totalHourlyCapacity = plans.reduce((sum, p) => sum + p.totalHourlyCapacity, 0);
  const totalDailyProductionCapacity = plans.reduce(
    (sum, p) => sum + p.dailyProductionCapacity,
    0
  );
  const totalDailyTarget = plans.reduce((sum, p) => sum + p.dailyTarget, 0);
  const totalRemainingQuantity = plans.reduce((sum, p) => sum + p.remainingQuantity, 0);

  const overallCapacityUtilization =
    totalDailyProductionCapacity > 0
      ? (totalDailyTarget / totalDailyProductionCapacity) * 100
      : 0;

  // Since machine types operate in parallel across departments/lines, the bottleneck line determines overall completion span,
  // while totalWorkloadHoursSum represents the sum of line-hours across all machine groups.
  const maxRequiredProductionTimeHours =
    plans.length > 0
      ? Math.max(...plans.map((p) => p.requiredProductionTimeHours))
      : 0;

  const maxTimeFormats = formatProductionTime(maxRequiredProductionTimeHours);

  const maxWorkingDaysRequired =
    plans.length > 0 ? Math.max(...plans.map((p) => p.requiredWorkingDays)) : 0;

  const totalWorkloadHoursSum = plans.reduce(
    (sum, p) => sum + p.requiredProductionTimeHours,
    0
  );

  return {
    totalMachineTypes,
    totalAvailableMachines,
    totalOperators,
    totalJobQuantity,
    totalHourlyCapacity,
    totalDailyProductionCapacity,
    totalDailyTarget,
    totalRemainingQuantity,
    overallCapacityUtilization,
    maxRequiredProductionTimeHours,
    maxRequiredTimeHHMM: maxTimeFormats.hhmmFormatted,
    maxRequiredTimeHoursMinutes: maxTimeFormats.hoursMinutesFormatted,
    maxWorkingDaysRequired,
    totalWorkloadHoursSum,
  };
}

/**
 * Calculates a day-by-day production timeline across the multi-day schedule horizon
 * for each machine group, identifying active run hours, idle capacity hours, produced units per day,
 * and critical bottleneck machines.
 */
export function calculateMultiDayTimeline(
  plans: MachineProductionPlan[],
  workingHoursPerDay: number
): MultiDayTimelineAnalysis {
  const safeWorkingHours = Math.max(0.5, Number(workingHoursPerDay) || 8);

  if (plans.length === 0) {
    return {
      totalHorizonDays: 0,
      workingHoursPerDay: safeWorkingHours,
      totalHorizonHours: 0,
      bottleneckMachineNames: [],
      maxRequiredHours: 0,
      maxRequiredTimeHHMM: '00:00',
      totalFleetIdleHours: 0,
      totalFleetIdleTimeHHMM: '00:00',
      rows: [],
    };
  }

  const maxRequiredHours = Math.max(
    0,
    ...plans.map((p) => p.requiredProductionTimeHours)
  );
  const totalHorizonDays = Math.max(
    1,
    ...plans.map((p) => p.requiredWorkingDays)
  );
  const totalHorizonHours = totalHorizonDays * safeWorkingHours;

  const bottleneckMachineNames =
    maxRequiredHours > 0
      ? plans
          .filter(
            (p) => Math.abs(p.requiredProductionTimeHours - maxRequiredHours) < 1e-6
          )
          .map((p) => p.machineName)
      : [];

  let totalFleetIdleHours = 0;

  const rows: MachineTimelineRow[] = plans.map((p) => {
    const isBottleneck =
      maxRequiredHours > 0 &&
      Math.abs(p.requiredProductionTimeHours - maxRequiredHours) < 1e-6;

    let remainingHoursToSchedule = p.requiredProductionTimeHours;
    let remainingUnitsToSchedule = p.jobQuantity;

    const days: DayTimelineSegment[] = [];

    for (let dayNum = 1; dayNum <= totalHorizonDays; dayNum++) {
      const rawActive = Math.min(
        safeWorkingHours,
        Math.max(0, remainingHoursToSchedule)
      );
      const activeHours = rawActive < 1e-6 ? 0 : rawActive;
      const idleHours = Math.max(0, safeWorkingHours - activeHours);

      remainingHoursToSchedule = Math.max(0, remainingHoursToSchedule - activeHours);

      const producedUnits =
        activeHours > 0
          ? Math.min(
              remainingUnitsToSchedule,
              Math.round(activeHours * p.totalHourlyCapacity)
            )
          : 0;
      remainingUnitsToSchedule = Math.max(
        0,
        remainingUnitsToSchedule - producedUnits
      );

      const utilizationPercent =
        safeWorkingHours > 0 ? (activeHours / safeWorkingHours) * 100 : 0;

      let status: 'full' | 'partial' | 'idle' = 'idle';
      if (Math.abs(activeHours - safeWorkingHours) < 1e-4) {
        status = 'full';
      } else if (activeHours > 0) {
        status = 'partial';
      }

      days.push({
        dayNumber: dayNum,
        activeHours,
        idleHours,
        activeTimeHHMM: formatProductionTime(activeHours).hhmmFormatted,
        idleTimeHHMM: formatProductionTime(idleHours).hhmmFormatted,
        producedUnits,
        utilizationPercent,
        status,
      });
    }

    const totalIdleHoursInHorizon = Math.max(
      0,
      totalHorizonHours - p.requiredProductionTimeHours
    );
    totalFleetIdleHours += totalIdleHoursInHorizon;

    const horizonUtilizationPercent =
      totalHorizonHours > 0
        ? (p.requiredProductionTimeHours / totalHorizonHours) * 100
        : 0;

    return {
      machineId: p.machineId,
      machineName: p.machineName,
      numberOfMachines: p.numberOfMachines,
      totalHourlyCapacity: p.totalHourlyCapacity,
      jobQuantity: p.jobQuantity,
      totalActiveHours: p.requiredProductionTimeHours,
      totalActiveTimeHHMM: p.requiredTimeHHMMFormatted,
      totalIdleHoursInHorizon,
      totalIdleTimeHHMM: formatProductionTime(totalIdleHoursInHorizon).hhmmFormatted,
      requiredWorkingDays: p.requiredWorkingDays,
      horizonUtilizationPercent,
      isBottleneck,
      days,
    };
  });

  return {
    totalHorizonDays,
    workingHoursPerDay: safeWorkingHours,
    totalHorizonHours,
    bottleneckMachineNames,
    maxRequiredHours,
    maxRequiredTimeHHMM: formatProductionTime(maxRequiredHours).hhmmFormatted,
    totalFleetIdleHours,
    totalFleetIdleTimeHHMM: formatProductionTime(totalFleetIdleHours).hhmmFormatted,
    rows,
  };
}

