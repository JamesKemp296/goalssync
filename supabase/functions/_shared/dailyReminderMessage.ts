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

  const title = remainingTasks === 1 ? 'One thing left today' : `${remainingTasks} things left today`

  if (incompleteRows.length === 1) {
    const row = incompleteRows[0]!
    const left = row.total_count - row.completed_count
    const taskWord = left === 1 ? 'task' : 'tasks'
    return {
      title,
      body: `${row.listTitle} still has ${left} open ${taskWord}. There’s still time tonight!`,
    }
  }

  return {
    title,
    body: `You’ve got open tasks on ${incompleteRows.length} of your daily lists. There’s still time tonight!`,
  }
}
