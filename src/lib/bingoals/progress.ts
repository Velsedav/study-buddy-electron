import type { Objective, Subobjective } from "./db";
import { clamp01 } from "./format";

export function computeObjectivePercent(
  objective: Objective,
  subobjectives: Subobjective[]
): number | null {
  if (objective.goal_kind === "count") {
    const target = objective.goal_target;
    if (!target || target <= 0) return null;
    const sum = subobjectives.reduce((acc, s) => {
      const hasTarget = (s.target_total ?? 0) > 0;
      if (hasTarget) {
        return acc + clamp01((s.progress_current ?? 0) / (s.target_total ?? 1));
      }
      return acc + (s.is_done ? 1 : 0);
    }, 0);
    return clamp01(sum / target);
  }

  // metric / amount / manual
  const target = objective.goal_target;
  if (!target || target <= 0) return null;
  return clamp01((objective.current_value ?? 0) / target);
}

export function progressLabel(
  percent: number | null,
  goalKind: string,
  goalTarget: number | null,
  goalUnit: string | null
): string {
  if (percent === null) return '—'
  if (goalKind === 'manual' || !goalTarget) {
    return `${Math.round(percent * 100)}%`
  }
  const done = Math.round(percent * goalTarget)
  const unit = goalUnit ? ` ${goalUnit}` : ''
  return `${done} / ${goalTarget}${unit}`
}
