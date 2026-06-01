export type WeeklyRecapRow = {
  listTitle: string
  completed_count: number
  total_count: number
  completed_all: boolean
}

export type WeeklyRecapMessage = {
  title: string
  body: string
}

/** Returns null when there is nothing meaningful to report (no tasks). */
export function buildWeeklyRecapMessage(
  rows: WeeklyRecapRow[],
): WeeklyRecapMessage | null {
  if (rows.length === 0) return null

  const totalTasks = rows.reduce((acc, r) => acc + r.total_count, 0)
  if (totalTasks === 0) return null

  const doneTasks = rows.reduce((acc, r) => acc + r.completed_count, 0)
  const perfectLists = rows.filter((r) => r.completed_all).length
  const listWord = rows.length === 1 ? 'list' : 'lists'

  if (rows.length === 1) {
    const row = rows[0]!
    const pct = Math.round((row.completed_count / row.total_count) * 100)
    if (row.completed_all) {
      return {
        title: 'Perfect week!',
        body: `${row.listTitle}: ${row.completed_count}/${row.total_count} — perfect week!`,
      }
    }
    return {
      title: 'Weekly recap',
      body: `${row.listTitle}: ${row.completed_count}/${row.total_count} last week (${pct}%).`,
    }
  }

  if (perfectLists === rows.length) {
    return {
      title: 'Perfect week!',
      body: `You finished all ${rows.length} weekly ${listWord} (${doneTasks}/${totalTasks} tasks).`,
    }
  }

  const pct = Math.round((doneTasks / totalTasks) * 100)
  return {
    title: 'Weekly recap',
    body: `Last week: ${doneTasks} of ${totalTasks} tasks across ${rows.length} weekly ${listWord} (${pct}%).`,
  }
}

export function isLindseyUser(firstName: string | null, email: string): boolean {
  const normalizedFirstName = (firstName ?? '').toLowerCase()
  const normalizedEmail = email.toLowerCase()
  return (
    normalizedFirstName.includes('lindsey') ||
    normalizedEmail.includes('lindsey')
  )
}

export function pushIconUrl(
  appBaseUrl: string,
  firstName: string | null,
  email: string,
): string {
  const base = appBaseUrl.replace(/\/$/, '')
  const icon = isLindseyUser(firstName, email) ? 'nutmeg' : 'ace'
  return `${base}/icons/${icon}.png`
}
