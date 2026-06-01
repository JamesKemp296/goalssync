export function partitionTodosByParent<
  T extends { id: number; parent_id: number | null },
>(todos: T[]): {
  parentTodos: T[]
  subTasksMap: Record<number, T[]>
} {
  const subTasksMap: Record<number, T[]> = {}
  for (const t of todos) {
    if (t.parent_id != null) {
      ;(subTasksMap[t.parent_id] ??= []).push(t)
    }
  }
  const parentTodos = todos.filter((t) => t.parent_id == null)
  return { parentTodos, subTasksMap }
}
