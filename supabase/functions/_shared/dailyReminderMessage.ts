export type DailyReminderRow = {
  listTitle: string
  completed_count: number
  total_count: number
}

export type DailyReminderMessage = {
  title: string
  body: string
}

/** Returns null when there are no incomplete tasks to remind about. */
export function buildDailyReminderMessage(
  rows: DailyReminderRow[],
): DailyReminderMessage | null {
  if (rows.length === 0) return null

  const incompleteRows = rows.filter(
    (r) => r.total_count > 0 && r.completed_count < r.total_count,
  )
  if (incompleteRows.length === 0) return null

  const remainingTasks = incompleteRows.reduce(
    (acc, r) => acc + (r.total_count - r.completed_count),
    0,
  )

  if (incompleteRows.length === 1) {
    const row = incompleteRows[0]!
    const left = row.total_count - row.completed_count
    const taskWord = left === 1 ? 'task' : 'tasks'
    return {
      title: 'Daily reminder',
      body: `${row.listTitle}: ${left} ${taskWord} left tonight.`,
    }
  }

  const listWord = incompleteRows.length === 1 ? 'list' : 'lists'
  return {
    title: 'Daily reminder',
    body: `${remainingTasks} tasks left across ${incompleteRows.length} daily ${listWord} tonight.`,
  }
}
