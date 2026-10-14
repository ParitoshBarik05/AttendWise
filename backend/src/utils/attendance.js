export function summarize(sessions, target = 75) {
  const counted = sessions.filter(s => s.status === 'present' || s.status === 'absent');
  const present = counted.filter(s => s.status === 'present').length;
  const absent = counted.length - present;
  const total = counted.length;
  const percentage = total ? (present / total) * 100 : 0;
  const needed = percentage >= target ? 0 : (target >= 100 ? null : Math.max(0, Math.ceil((target * total - 100 * present) / (100 - target))));
  // Largest number of future absences allowed if all other future classes are attended.
  // Derived from P / (C + futureMisses) >= target, with no extra future presents assumed.
  const maxBunksNow = total === 0 ? null : Math.max(0, Math.floor((100 * present / target) - total));
  return { present, absent, total, percentage: Number(percentage.toFixed(1)), target, classesNeeded: needed, maxBunksNow, remainingToTarget: Math.max(0, Number((target - percentage).toFixed(1))) };
}
