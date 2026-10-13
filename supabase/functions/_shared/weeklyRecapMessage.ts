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

  if (rows.length === 1) {
    const row = rows[0]!
    if (row.completed_all) {
      return {
        title: 'You crushed last week',
        body: `You finished all ${row.total_count} tasks on ${row.listTitle}. Nice work!`,
      }
    }
    return {
      title: 'Your week in review',
      body: `You finished ${row.completed_count} of ${row.total_count} tasks on ${row.listTitle} last week.`,
    }
  }

  if (perfectLists === rows.length) {
    return {
      title: 'You crushed last week',
      body: `You finished every task on all ${rows.length} of your weekly lists. Nice work!`,
    }
  }

  return {
    title: 'Your week in review',
    body: `You finished ${doneTasks} of ${totalTasks} tasks across your ${rows.length} weekly lists last week.`,
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
