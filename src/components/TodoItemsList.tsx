import { Checkbox, IconButton, Paper, Stack, Typography } from '@mui/material'
import { TbX } from 'react-icons/tb'

export type TodoListItem = {
  id: number
  task: string
  is_complete: boolean
}

type TodoItemsListProps = {
  todos: TodoListItem[]
  onToggle?: (id: number) => void
  onRemove?: (id: number) => void
  readOnly?: boolean
  showDelete?: boolean
}

export default function TodoItemsList({
  todos,
  onToggle,
  onRemove,
  readOnly = false,
  showDelete = true,
}: TodoItemsListProps) {
  return (
    <Stack spacing={1.25}>
      {todos.map((todo) => (
        <Paper
          key={todo.id}
          elevation={1}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 1.25,
            py: 0.8,
            bgcolor: 'background.paper',
          }}
        >
          <Checkbox
            checked={todo.is_complete}
            disabled={readOnly}
            onChange={() => onToggle?.(todo.id)}
          />
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: 600,
              textDecoration: todo.is_complete ? 'line-through' : 'none',
              color: todo.is_complete ? 'text.secondary' : 'text.primary',
            }}
            noWrap
          >
            {todo.task}
          </Typography>
          {showDelete && (
            <IconButton
              aria-label="Delete task"
              onClick={() => onRemove?.(todo.id)}
              sx={{ color: 'text.secondary' }}
            >
              <TbX size={20} />
            </IconButton>
          )}
        </Paper>
      ))}
      {todos.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No tasks yet.
        </Typography>
      ) : null}
    </Stack>
  )
}
