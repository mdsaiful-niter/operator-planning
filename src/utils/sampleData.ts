import { MachineRecord, OperatorRecord, PlanningSettings } from '../types/planning';

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = {
  availableWorkingHoursPerDay: 8,
  planningDate: '2026-11-06',
  workingDaysPerWeek: 6,
  shiftsPerDay: 1,
};

export const INITIAL_MACHINE_DATA: MachineRecord[] = [
  {
    id: 'mach-1',
    machineName: 'Zebra',
    numberOfMachines: 3,
    jobQuantity: 30000,
    capacityPerHour: 1200,
  },
  {
    id: 'mach-2',
    machineName: 'Snap 700',
    numberOfMachines: 2,
    jobQuantity: 20000,
    capacityPerHour: 973,
  },
  {
    id: 'mach-3',
    machineName: 'Epson',
    numberOfMachines: 2,
    jobQuantity: 15000,
    capacityPerHour: 850,
  },
  {
    id: 'mach-4',
    machineName: 'Cutting',
    numberOfMachines: 1,
    jobQuantity: 10000,
    capacityPerHour: 500,
  },
];

export const INITIAL_OPERATOR_DATA: OperatorRecord[] = [
  {
    id: 'op-1',
    operatorName: 'Rohim',
    experience: 20,
    priority1: 'Zebra',
    priority2: 'Snap 700',
    priority3: 'Epson',
  },
  {
    id: 'op-2',
    operatorName: 'Karim',
    experience: 5,
    priority1: 'Zebra',
    priority2: 'Epson',
    priority3: 'Snap 700',
  },
  {
    id: 'op-3',
    operatorName: 'Hasan',
    experience: 10,
    priority1: 'Snap 700',
    priority2: 'Zebra',
    priority3: 'Epson',
  },
  {
    id: 'op-4',
    operatorName: 'Jamal',
    experience: 3,
    priority1: 'Epson',
    priority2: 'Snap 700',
    priority3: 'Zebra',
  },
  {
    id: 'op-5',
    operatorName: 'Rafi',
    experience: 8,
    priority1: 'Snap 700',
    priority2: 'Epson',
    priority3: 'Zebra',
  },
  {
    id: 'op-6',
    operatorName: 'Saiful',
    experience: 4,
    priority1: 'Epson',
    priority2: 'Zebra',
    priority3: 'Snap 700',
  },
];
