import {
  MachineOperatorRanking,
  MachineRecord,
  OperatorRecord,
  RankedOperatorItem,
} from '../types/planning';

/**
 * OPERATOR RANKING ENGINE
 *
 * Identifies and ranks the best operators for EVERY machine independently.
 * Primary Criterion: Machine Preference (Priority 1 -> Priority 2 -> Priority 3)
 * Secondary Criterion: Experience (Descending order within the same priority group)
 * Tie-breaker: Original Excel row order (ascending originalIndex)
 */
export function rankOperatorsForMachines(
  machines: MachineRecord[],
  operators: OperatorRecord[]
): MachineOperatorRanking[] {
  return machines.map((machine) => {
    const targetMachineName = (machine.machineName ?? '').trim();
    const normalizedTarget = targetMachineName.toLowerCase();

    const group1: RankedOperatorItem[] = [];
    const group2: RankedOperatorItem[] = [];
    const group3: RankedOperatorItem[] = [];

    if (normalizedTarget) {
      operators.forEach((op, index) => {
        const opName = (op.operatorName ?? '').trim();
        const exp = Number(op.experience);
        if (!opName || Number.isNaN(exp) || exp < 0) {
          return;
        }

        const p1 = (op.priority1 ?? '').trim().toLowerCase();
        const p2 = (op.priority2 ?? '').trim().toLowerCase();
        const p3 = (op.priority3 ?? '').trim().toLowerCase();

        // STEP 1 & STEP 2: Filter operators who selected this machine and divide into 3 priority groups.
        // If an operator listed the same machine more than once, place them in their highest priority group.
        if (p1 === normalizedTarget) {
          group1.push({
            operatorId: op.id,
            operatorName: opName,
            experience: exp,
            priorityLevel: 1,
            originalIndex: index,
          });
        } else if (p2 === normalizedTarget) {
          group2.push({
            operatorId: op.id,
            operatorName: opName,
            experience: exp,
            priorityLevel: 2,
            originalIndex: index,
          });
        } else if (p3 === normalizedTarget) {
          group3.push({
            operatorId: op.id,
            operatorName: opName,
            experience: exp,
            priorityLevel: 3,
            originalIndex: index,
          });
        }
      });
    }

    // STEP 3: Rank operators inside each group according to experience in descending order.
    // Rule 9: If two operators have identical priority and experience, preserve their original Excel order.
    const sortByExperienceDesc = (a: RankedOperatorItem, b: RankedOperatorItem): number => {
      if (b.experience !== a.experience) {
        return b.experience - a.experience;
      }
      return a.originalIndex - b.originalIndex;
    };

    group1.sort(sortByExperienceDesc);
    group2.sort(sortByExperienceDesc);
    group3.sort(sortByExperienceDesc);

    // STEP 4: Combine the three groups: Priority 1 -> Priority 2 -> Priority 3
    const allRankedOperators: RankedOperatorItem[] = [...group1, ...group2, ...group3];

    // STEP 5: Suggest at most numberOfMachines operators (never more than available machines of that type)
    const maxMachines = Math.max(0, Math.floor(Number(machine.numberOfMachines) || 0));
    const rankedOperators: RankedOperatorItem[] =
      maxMachines > 0 ? allRankedOperators.slice(0, maxMachines) : [];

    const hasSuitableOperators = rankedOperators.length > 0;
    const rankedNamesCsv = hasSuitableOperators
      ? rankedOperators.map((o) => o.operatorName).join(', ')
      : 'No suitable operator found.';

    const compactLine = hasSuitableOperators
      ? `${targetMachineName} - ${rankedNamesCsv}`
      : `${targetMachineName} - No suitable operator found.`;

    return {
      machineName: targetMachineName,
      numberOfMachines: maxMachines,
      totalSuitableCount: allRankedOperators.length,
      rankedOperators,
      compactLine,
      rankedNamesCsv,
      hasSuitableOperators,
    };
  });
}

/**
 * Formats all machine operator rankings into the required simple text block
 */
export function formatAllRankingsAsText(rankings: MachineOperatorRanking[]): string {
  return rankings.map((r) => r.compactLine).join('\n\n');
}
