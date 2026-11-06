import {
  MachineRecord,
  OperatorRecord,
  PlanningSettings,
  ValidationIssue,
  ValidationReport,
} from '../types/planning';

/**
 * Normalizes an Excel column header string for flexible matching
 */
export function normalizeHeader(header: unknown): string {
  if (header === null || header === undefined) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[().]/g, '');
}

const MACHINE_HEADER_ALIASES: Record<keyof Omit<MachineRecord, 'id'>, string[]> = {
  machineName: [
    'machine name',
    'machine',
    'machinename',
    'machine type',
    'equipment',
    'equipment name',
  ],
  numberOfMachines: [
    'number of machines',
    'no of machines',
    'num of machines',
    'machines',
    'machine count',
    'machine quantity',
    'machine qty',
    'no machines',
    'qty of machines',
    'available machines',
  ],
  jobQuantity: [
    'job quantity',
    'job qty',
    'order quantity',
    'order qty',
    'production quantity',
    'total quantity',
    'target quantity',
    'quantity',
  ],
  capacityPerHour: [
    'capacity units/hour',
    'capacity unit/hour',
    'capacity units / hour',
    'capacity/hour',
    'capacity / hour',
    'capacity per hour',
    'hourly capacity',
    'capacity',
    'units/hour',
    'units per hour',
    'uph',
  ],
};

const OPERATOR_HEADER_ALIASES: Record<keyof Omit<OperatorRecord, 'id'>, string[]> = {
  operatorName: [
    'operator name',
    'operator',
    'operatorname',
    'worker name',
    'employee name',
    'name',
  ],
  experience: [
    'experience years',
    'experience year',
    'experience',
    'exp years',
    'exp',
    'years of experience',
    'work experience',
  ],
  priority1: [
    'machine priority 1',
    'priority 1',
    'preference 1',
    'machine preference 1',
    'p1',
    'first priority',
    '1st priority',
  ],
  priority2: [
    'machine priority 2',
    'priority 2',
    'preference 2',
    'machine preference 2',
    'p2',
    'second priority',
    '2nd priority',
  ],
  priority3: [
    'machine priority 3',
    'priority 3',
    'preference 3',
    'machine preference 3',
    'p3',
    'third priority',
    '3rd priority',
  ],
};

export interface ColumnMappingResult<T extends string> {
  mappedHeaders: Partial<Record<T, string>>;
  missingColumns: string[];
}

export function mapMachineColumns(rawHeaders: string[]): ColumnMappingResult<keyof Omit<MachineRecord, 'id'>> {
  const mappedHeaders: Partial<Record<keyof Omit<MachineRecord, 'id'>, string>> = {};
  const missingColumns: string[] = [];

  const normalizedMap = new Map<string, string>();
  for (const h of rawHeaders) {
    normalizedMap.set(normalizeHeader(h), h);
  }

  const labelMap: Record<keyof Omit<MachineRecord, 'id'>, string> = {
    machineName: 'Machine Name',
    numberOfMachines: 'Number of Machines',
    jobQuantity: 'Job Quantity',
    capacityPerHour: 'Capacity (Units/Hour)',
  };

  (Object.keys(MACHINE_HEADER_ALIASES) as Array<keyof Omit<MachineRecord, 'id'>>).forEach((key) => {
    const aliases = MACHINE_HEADER_ALIASES[key];
    let foundOriginal: string | undefined;
    for (const alias of aliases) {
      if (normalizedMap.has(alias)) {
        foundOriginal = normalizedMap.get(alias);
        break;
      }
    }
    if (foundOriginal) {
      mappedHeaders[key] = foundOriginal;
    } else {
      missingColumns.push(labelMap[key]);
    }
  });

  return { mappedHeaders, missingColumns };
}

export function mapOperatorColumns(rawHeaders: string[]): ColumnMappingResult<keyof Omit<OperatorRecord, 'id'>> {
  const mappedHeaders: Partial<Record<keyof Omit<OperatorRecord, 'id'>, string>> = {};
  const missingColumns: string[] = [];

  const normalizedMap = new Map<string, string>();
  for (const h of rawHeaders) {
    normalizedMap.set(normalizeHeader(h), h);
  }

  const labelMap: Record<keyof Omit<OperatorRecord, 'id'>, string> = {
    operatorName: 'Operator Name',
    experience: 'Experience (Years)',
    priority1: 'Machine Priority 1',
    priority2: 'Machine Priority 2',
    priority3: 'Machine Priority 3',
  };

  (Object.keys(OPERATOR_HEADER_ALIASES) as Array<keyof Omit<OperatorRecord, 'id'>>).forEach((key) => {
    const aliases = OPERATOR_HEADER_ALIASES[key];
    let foundOriginal: string | undefined;
    for (const alias of aliases) {
      if (normalizedMap.has(alias)) {
        foundOriginal = normalizedMap.get(alias);
        break;
      }
    }
    if (foundOriginal) {
      mappedHeaders[key] = foundOriginal;
    } else {
      missingColumns.push(labelMap[key]);
    }
  });

  return { mappedHeaders, missingColumns };
}

/**
 * Validates the Machine & Production dataset
 */
export function validateMachineData(machines: MachineRecord[]): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!machines || machines.length === 0) {
    errors.push({
      id: 'mach-empty',
      severity: 'error',
      message: 'Machine dataset is empty. Upload a Machine & Production Excel file or add at least one machine.',
    });
    return { isValid: false, errors, warnings };
  }

  const seenNames = new Map<string, number>();

  machines.forEach((row, idx) => {
    const rowNum = idx + 1;
    const cleanName = (row.machineName ?? '').trim();

    if (!cleanName) {
      errors.push({
        id: `mach-name-empty-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'machineName',
        message: `Row ${rowNum}: Machine Name is empty.`,
      });
    } else {
      const lower = cleanName.toLowerCase();
      if (seenNames.has(lower)) {
        errors.push({
          id: `mach-dup-${row.id}`,
          severity: 'error',
          rowIndex: rowNum,
          rowId: row.id,
          field: 'machineName',
          message: `Row ${rowNum}: Duplicate machine record "${cleanName}" (already defined in Row ${seenNames.get(lower)}).`,
        });
      } else {
        seenNames.set(lower, rowNum);
      }
    }

    if (
      row.numberOfMachines === null ||
      row.numberOfMachines === undefined ||
      Number.isNaN(Number(row.numberOfMachines))
    ) {
      errors.push({
        id: `mach-qty-nan-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'numberOfMachines',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Number of Machines must be a valid number.`,
      });
    } else if (Number(row.numberOfMachines) <= 0) {
      errors.push({
        id: `mach-qty-zero-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'numberOfMachines',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Number of Machines must be greater than 0 (found ${row.numberOfMachines}).`,
      });
    } else if (!Number.isInteger(Number(row.numberOfMachines))) {
      errors.push({
        id: `mach-qty-int-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'numberOfMachines',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Number of Machines must be a whole integer (found ${row.numberOfMachines}).`,
      });
    }

    if (
      row.jobQuantity === null ||
      row.jobQuantity === undefined ||
      Number.isNaN(Number(row.jobQuantity))
    ) {
      errors.push({
        id: `mach-job-nan-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'jobQuantity',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Job Quantity must be a valid numeric value.`,
      });
    } else if (Number(row.jobQuantity) < 0) {
      errors.push({
        id: `mach-job-neg-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'jobQuantity',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Job Quantity cannot be negative (found ${row.jobQuantity}).`,
      });
    } else if (Number(row.jobQuantity) === 0) {
      warnings.push({
        id: `mach-job-zero-${row.id}`,
        severity: 'warning',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'jobQuantity',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Job Quantity is 0. Daily target and required production time will be 0.`,
      });
    }

    if (
      row.capacityPerHour === null ||
      row.capacityPerHour === undefined ||
      Number.isNaN(Number(row.capacityPerHour))
    ) {
      errors.push({
        id: `mach-cap-nan-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'capacityPerHour',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Capacity (Units/Hour) must be a valid number.`,
      });
    } else if (Number(row.capacityPerHour) <= 0) {
      errors.push({
        id: `mach-cap-nonpos-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'capacityPerHour',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Capacity (Units/Hour) must be greater than 0 (found ${row.capacityPerHour}).`,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates the Operator Information dataset and checks cross-sheet machine references
 */
export function validateOperatorData(
  operators: OperatorRecord[],
  machines: MachineRecord[] = []
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!operators || operators.length === 0) {
    errors.push({
      id: 'op-empty',
      severity: 'error',
      message: 'Operator dataset is empty. Upload an Operator Information Excel file or add at least one operator.',
    });
    return { isValid: false, errors, warnings };
  }

  const validMachineNames = new Set(
    machines
      .map((m) => (m.machineName ?? '').trim().toLowerCase())
      .filter(Boolean)
  );

  const seenOperators = new Map<string, number>();

  operators.forEach((row, idx) => {
    const rowNum = idx + 1;
    const cleanName = (row.operatorName ?? '').trim();

    if (!cleanName) {
      errors.push({
        id: `op-name-empty-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'operatorName',
        message: `Row ${rowNum}: Operator Name is empty.`,
      });
    } else {
      const lower = cleanName.toLowerCase();
      if (seenOperators.has(lower)) {
        errors.push({
          id: `op-dup-${row.id}`,
          severity: 'error',
          rowIndex: rowNum,
          rowId: row.id,
          field: 'operatorName',
          message: `Row ${rowNum}: Duplicate operator record "${cleanName}" (already defined in Row ${seenOperators.get(lower)}).`,
        });
      } else {
        seenOperators.set(lower, rowNum);
      }
    }

    if (
      row.experience === null ||
      row.experience === undefined ||
      String(row.experience).trim() === '' ||
      Number.isNaN(Number(row.experience))
    ) {
      errors.push({
        id: `op-exp-nan-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'experience',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Experience (Years) must be a valid number.`,
      });
    } else if (Number(row.experience) < 0) {
      errors.push({
        id: `op-exp-neg-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'experience',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Experience cannot be negative (found ${row.experience}).`,
      });
    }

    const p1 = (row.priority1 ?? '').trim();
    const p2 = (row.priority2 ?? '').trim();
    const p3 = (row.priority3 ?? '').trim();

    if (!p1 && !p2 && !p3) {
      errors.push({
        id: `op-prio-none-${row.id}`,
        severity: 'error',
        rowIndex: rowNum,
        rowId: row.id,
        field: 'priority1',
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): All machine priority columns are empty. At least Priority 1 must be specified.`,
      });
    } else {
      if (!p1) {
        errors.push({
          id: `op-p1-empty-${row.id}`,
          severity: 'error',
          rowIndex: rowNum,
          rowId: row.id,
          field: 'priority1',
          message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Machine Priority 1 is missing.`,
        });
      }
      if (!p2) {
        warnings.push({
          id: `op-p2-empty-${row.id}`,
          severity: 'warning',
          rowIndex: rowNum,
          rowId: row.id,
          field: 'priority2',
          message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Machine Priority 2 is empty.`,
        });
      }
      if (!p3) {
        warnings.push({
          id: `op-p3-empty-${row.id}`,
          severity: 'warning',
          rowIndex: rowNum,
          rowId: row.id,
          field: 'priority3',
          message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Machine Priority 3 is empty.`,
        });
      }
    }

    // Check duplicate preferences within the same operator row
    const prefs = [p1, p2, p3].filter(Boolean).map((p) => p.toLowerCase());
    if (new Set(prefs).size !== prefs.length) {
      warnings.push({
        id: `op-dup-pref-${row.id}`,
        severity: 'warning',
        rowIndex: rowNum,
        rowId: row.id,
        message: `Row ${rowNum} (${cleanName || 'Unnamed'}): Operator listed the same machine in multiple priority columns.`,
      });
    }

    // Cross-check machine names against uploaded Machine dataset
    if (validMachineNames.size > 0) {
      [
        { label: 'Priority 1', val: p1, field: 'priority1' },
        { label: 'Priority 2', val: p2, field: 'priority2' },
        { label: 'Priority 3', val: p3, field: 'priority3' },
      ].forEach(({ label, val, field }) => {
        if (val && !validMachineNames.has(val.toLowerCase())) {
          warnings.push({
            id: `op-unmatched-mach-${row.id}-${field}`,
            severity: 'warning',
            rowIndex: rowNum,
            rowId: row.id,
            field,
            message: `Row ${rowNum} (${cleanName || 'Unnamed'}): ${label} machine "${val}" does not match any Machine Name in the Machine & Production sheet.`,
          });
        }
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates planning settings
 */
export function validatePlanningSettings(settings: PlanningSettings): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (
    settings.availableWorkingHoursPerDay === null ||
    settings.availableWorkingHoursPerDay === undefined ||
    Number.isNaN(Number(settings.availableWorkingHoursPerDay)) ||
    Number(settings.availableWorkingHoursPerDay) <= 0
  ) {
    errors.push({
      id: 'settings-hours-invalid',
      severity: 'error',
      field: 'availableWorkingHoursPerDay',
      message: 'Net Available Working Hours per Day must be greater than 0.',
    });
  } else if (Number(settings.availableWorkingHoursPerDay) > 24) {
    errors.push({
      id: 'settings-hours-max',
      severity: 'error',
      field: 'availableWorkingHoursPerDay',
      message: 'Net Available Working Hours per Day cannot exceed 24 hours.',
    });
  }

  if (
    settings.workingDaysPerWeek < 1 ||
    settings.workingDaysPerWeek > 7 ||
    Number.isNaN(Number(settings.workingDaysPerWeek))
  ) {
    errors.push({
      id: 'settings-days-invalid',
      severity: 'error',
      field: 'workingDaysPerWeek',
      message: 'Working Days per Week must be between 1 and 7.',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
