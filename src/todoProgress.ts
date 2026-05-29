export type TodoProgressFields = {
  target_count: number
  progress_count: number
  is_complete: boolean
  completed_at: string | null
}

export function nextProgressCount(t: TodoProgressFields): number {
  const target = Math.max(1, t.target_count)
  if (target <= 1) {
    return t.is_complete ? 0 : 1
  }
  if (t.is_complete) return 0
  return Math.min(t.progress_count + 1, target)
}

export function completionFromProgress(
  nextProgress: number,
  targetCount: number,
  previousCompletedAt: string | null,
): Pick<TodoProgressFields, 'is_complete' | 'completed_at'> {
  const target = Math.max(1, targetCount)
  const is_complete = nextProgress >= target
  let completed_at = previousCompletedAt
  if (is_complete) {
    completed_at = new Date().toISOString()
  } else if (nextProgress === 0) {
    completed_at = null
  }
  return { is_complete, completed_at }
}

export function completionFromTargetEdit(
  progressCount: number,
  targetCount: number,
  previousCompletedAt: string | null,
): Pick<TodoProgressFields, 'progress_count' | 'is_complete' | 'completed_at'> {
  const target = Math.max(1, targetCount)
  const progress_count = Math.min(Math.max(0, progressCount), target)
  const { is_complete, completed_at } = completionFromProgress(
    progress_count,
    target,
    previousCompletedAt,
  )
  return { progress_count, is_complete, completed_at }
}
