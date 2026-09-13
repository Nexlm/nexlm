/**
 * Completion rate as a percentage with one decimal, or null when the user has
 * no closed trades yet (so new traders are not shown as 0%).
 */
export function completionRate(completed, closed) {
  if (!closed) return null;
  return Math.round((completed / closed) * 1000) / 10;
}

/** Folds groupBy rows ({ userId, status, count }) into per-user trade stats. */
export function foldTradeStats(userIds, rows) {
  const totals = new Map(userIds.map((id) => [id, { completed: 0, closed: 0 }]));
  for (const { userId, status, count } of rows) {
    const entry = totals.get(userId);
    if (!entry) continue;
    entry.closed += count;
    if (status === 'COMPLETED') entry.completed += count;
  }
  return new Map(
    [...totals].map(([id, { completed, closed }]) => [
      id,
      { completedTrades: completed, completionRate: completionRate(completed, closed) },
    ]),
  );
}
