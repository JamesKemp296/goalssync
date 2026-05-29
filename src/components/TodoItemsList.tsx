import { useRef, useState, type PointerEvent } from 'react'
import {
  Box,
  Checkbox,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { TbCheck, TbEdit, TbMinus, TbPlus, TbTrash, TbX } from 'react-icons/tb'

const TARGET_MAX = 99

export type TodoListItem = {
  id: number
  task: string
  is_complete: boolean
  target_count: number
  progress_count: number
}

export type TodoEditPayload = {
  task: string
  target_count: number
}

type TodoItemsListProps = {
  todos: TodoListItem[]
  onToggle?: (id: number) => void
  onRemove?: (id: number) => void
  onEdit?: (id: number, payload: TodoEditPayload) => Promise<void> | void
  readOnly?: boolean
  showDelete?: boolean
}

export default function TodoItemsList({
  todos,
  onToggle,
  onRemove,
  onEdit,
  readOnly = false,
  showDelete = true,
}: TodoItemsListProps) {
  const ACTION_BUTTON_WIDTH = 56
  const ACTION_BUTTON_GAP = 8
  const ACTION_REVEAL_GAP = 8
  const pointerRef = useRef<{
    todoId: number | null
    pointerId: number | null
    startX: number
    startY: number
    baseX: number
    swiping: boolean
  }>({
    todoId: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    baseX: 0,
    swiping: false,
  })
  const swipeSuppressRef = useRef<{ todoId: number | null; at: number }>({
    todoId: null,
    at: 0,
  })
  const [openTodoId, setOpenTodoId] = useState<number | null>(null)
  const [dragTodoId, setDragTodoId] = useState<number | null>(null)
  const [dragOffsetX, setDragOffsetX] = useState(0)
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingTargetCount, setEditingTargetCount] = useState(1)
  const [savingEdit, setSavingEdit] = useState(false)

  const hasEditAction = !readOnly && Boolean(onEdit)
  const hasDeleteAction = !readOnly && showDelete && Boolean(onRemove)
  const actionCount = (hasEditAction ? 1 : 0) + (hasDeleteAction ? 1 : 0)
  const hasSwipeActions = actionCount > 0
  const actionButtonsWidth =
    actionCount > 0
      ? ACTION_BUTTON_WIDTH * actionCount +
        ACTION_BUTTON_GAP * (actionCount - 1)
      : 0
  const actionsWidth = hasSwipeActions
    ? actionButtonsWidth + ACTION_REVEAL_GAP
    : 0

  const clampOffset = (value: number) =>
    Math.max(-actionsWidth, Math.min(0, value))

  const clampTarget = (n: number) =>
    Math.min(TARGET_MAX, Math.max(1, Math.round(n)))

  const beginEdit = (todo: TodoListItem) => {
    setOpenTodoId(null)
    setDragTodoId(null)
    setDragOffsetX(0)
    setEditingTodoId(todo.id)
    setEditingValue(todo.task)
    setEditingTargetCount(Math.max(1, todo.target_count))
  }

  const cancelEdit = () => {
    setEditingTodoId(null)
    setEditingValue('')
    setEditingTargetCount(1)
  }

  const saveEdit = async (id: number) => {
    if (!onEdit || savingEdit) return
    const next = editingValue.trim()
    if (!next) return
    setSavingEdit(true)
    try {
      await onEdit(id, {
        task: next,
        target_count: clampTarget(editingTargetCount),
      })
      setEditingTodoId(null)
      setEditingValue('')
      setEditingTargetCount(1)
    } finally {
      setSavingEdit(false)
    }
  }

  const handlePointerDown = (
    e: PointerEvent<HTMLDivElement>,
    todoId: number,
    rowIsOpen: boolean,
  ) => {
    if (!hasSwipeActions || editingTodoId != null) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-no-swipe="true"]')) return
    pointerRef.current = {
      todoId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: rowIsOpen ? -actionsWidth : 0,
      swiping: false,
    }
    setDragTodoId(todoId)
    setDragOffsetX(rowIsOpen ? -actionsWidth : 0)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const active = pointerRef.current
    if (
      !hasSwipeActions ||
      active.todoId == null ||
      active.pointerId !== e.pointerId
    ) {
      return
    }
    const deltaX = e.clientX - active.startX
    const deltaY = e.clientY - active.startY
    if (!active.swiping) {
      if (Math.abs(deltaX) < 8) return
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return
      active.swiping = true
    }
    e.preventDefault()
    setDragOffsetX(clampOffset(active.baseX + deltaX))
  }

  const finishSwipe = (e: PointerEvent<HTMLDivElement>) => {
    const active = pointerRef.current
    if (
      !hasSwipeActions ||
      active.todoId == null ||
      active.pointerId !== e.pointerId
    ) {
      return
    }
    const finalOffset = clampOffset(active.baseX + (e.clientX - active.startX))
    const didSwipe = active.swiping
    if (didSwipe) {
      e.preventDefault()
      const shouldOpen = finalOffset <= -actionsWidth * 0.45
      setOpenTodoId(shouldOpen ? active.todoId : null)
      swipeSuppressRef.current = { todoId: active.todoId, at: Date.now() }
    }
    pointerRef.current = {
      todoId: null,
      pointerId: null,
      startX: 0,
      startY: 0,
      baseX: 0,
      swiping: false,
    }
    setDragTodoId(null)
    setDragOffsetX(0)
  }

  const handleCardClick = (
    todo: TodoListItem,
    rowIsOpen: boolean,
    target: EventTarget | null,
  ) => {
    if (!onToggle || readOnly || editingTodoId != null) return
    if (
      target instanceof HTMLElement &&
      target.closest('[data-no-toggle="true"]')
    ) {
      return
    }
    const recentlySwiped =
      swipeSuppressRef.current.todoId === todo.id &&
      Date.now() - swipeSuppressRef.current.at < 300
    if (recentlySwiped) return
    if (rowIsOpen) {
      setOpenTodoId(null)
      return
    }
    onToggle(todo.id)
  }

  return (
    <Stack spacing={1.25}>
      {todos.map((todo) => {
        const target = Math.max(1, todo.target_count)
        const progress = Math.min(Math.max(0, todo.progress_count), target)
        const multiCount = target > 1
        const progressLabel = multiCount ? `${progress}/${target}` : null
        const checkboxAriaLabel = multiCount
          ? `${progress} of ${target} completed`
          : todo.is_complete
            ? 'Mark incomplete'
            : 'Mark complete'

        const rowIsOpen = openTodoId === todo.id
        const rowIsEditing = editingTodoId === todo.id
        const translateX =
          dragTodoId === todo.id
            ? dragOffsetX
            : rowIsOpen && hasSwipeActions
              ? -actionsWidth
              : 0
        const progressPct =
          target > 0 ? Math.round((progress / target) * 100) : 0
        return (
          <Box
            key={todo.id}
            sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {hasSwipeActions ? (
              <Stack
                direction="row"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 0,
                  bottom: 4,
                  width: actionsWidth,
                  zIndex: 0,
                  justifyContent: 'flex-end',
                  gap: `${ACTION_BUTTON_GAP}px`,
                }}
              >
                {hasEditAction ? (
                  <Box
                    component="button"
                    type="button"
                    aria-label="Edit task"
                    onClick={() => beginEdit(todo)}
                    data-no-toggle="true"
                    sx={{
                      width: ACTION_BUTTON_WIDTH,
                      border: 0,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: 'warning.main',
                      color: 'warning.contrastText',
                      display: 'grid',
                      placeItems: 'center',
                      '&:active': { opacity: 0.9 },
                    }}
                  >
                    <TbEdit size={20} />
                  </Box>
                ) : null}
                {hasDeleteAction ? (
                  <Box
                    component="button"
                    type="button"
                    aria-label="Delete task"
                    onClick={() => onRemove?.(todo.id)}
                    data-no-toggle="true"
                    sx={{
                      width: ACTION_BUTTON_WIDTH,
                      border: 0,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: 'error.main',
                      color: 'error.contrastText',
                      display: 'grid',
                      placeItems: 'center',
                      '&:active': { opacity: 0.9 },
                    }}
                  >
                    <TbTrash size={20} />
                  </Box>
                ) : null}
              </Stack>
            ) : null}

            <Paper
              elevation={1}
              onPointerDown={(e) => handlePointerDown(e, todo.id, rowIsOpen)}
              onPointerMove={handlePointerMove}
              onPointerUp={finishSwipe}
              onPointerCancel={finishSwipe}
              onClick={(e) => handleCardClick(todo, rowIsOpen, e.target)}
              sx={{
                position: 'relative',
                zIndex: 1,
                transform: `translateX(${translateX}px)`,
                transition:
                  dragTodoId === todo.id
                    ? 'none'
                    : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
                touchAction: hasSwipeActions ? 'pan-y' : 'auto',
                display: 'flex',
                alignItems: 'stretch',
                gap: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                px: 2,
                py: 1.5,
                bgcolor: 'background.paper',
                cursor:
                  !rowIsEditing && !readOnly && onToggle
                    ? 'pointer'
                    : 'default',
              }}
            >
              {rowIsEditing ? (
                <Stack spacing={1} sx={{ width: '100%' }}>
                  <Box
                    component="form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void saveEdit(todo.id)
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      width: '100%',
                    }}
                  >
                    <TextField
                      autoFocus
                      size="small"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      placeholder="Edit task"
                      fullWidth
                      disabled={savingEdit}
                      slotProps={{ htmlInput: { maxLength: 280 } }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      data-no-swipe="true"
                      data-no-toggle="true"
                    />
                    <IconButton
                      aria-label="Save task edit"
                      type="submit"
                      disabled={savingEdit || !editingValue.trim()}
                      color="primary"
                      data-no-swipe="true"
                      data-no-toggle="true"
                    >
                      <TbCheck size={20} />
                    </IconButton>
                    <IconButton
                      aria-label="Cancel task edit"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      data-no-swipe="true"
                      data-no-toggle="true"
                    >
                      <TbX size={20} />
                    </IconButton>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                    data-no-swipe="true"
                    data-no-toggle="true"
                  >
                    <Typography variant="body2" color="text.secondary">
                      Times
                    </Typography>
                    <IconButton
                      type="button"
                      size="small"
                      aria-label="Decrease repeat count"
                      disabled={savingEdit || editingTargetCount <= 1}
                      onClick={() =>
                        setEditingTargetCount((n) => clampTarget(n - 1))
                      }
                    >
                      <TbMinus size={18} />
                    </IconButton>
                    <Typography
                      variant="body2"
                      sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}
                    >
                      {editingTargetCount}
                    </Typography>
                    <IconButton
                      type="button"
                      size="small"
                      aria-label="Increase repeat count"
                      disabled={savingEdit || editingTargetCount >= TARGET_MAX}
                      onClick={() =>
                        setEditingTargetCount((n) => clampTarget(n + 1))
                      }
                    >
                      <TbPlus size={18} />
                    </IconButton>
                  </Stack>
                </Stack>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    width: '100%',
                  }}
                >
                  <Checkbox
                    checked={todo.is_complete}
                    disabled={readOnly}
                    onChange={() => onToggle?.(todo.id)}
                    slotProps={{
                      input: {
                        'aria-label': checkboxAriaLabel,
                        ...(multiCount
                          ? {
                              'aria-valuenow': progress,
                              'aria-valuemax': target,
                            }
                          : {}),
                      },
                    }}
                    data-no-swipe="true"
                    data-no-toggle="true"
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 600,
                          textDecoration: todo.is_complete
                            ? 'line-through'
                            : 'none',
                          color: todo.is_complete
                            ? 'text.secondary'
                            : 'text.primary',
                        }}
                        noWrap
                      >
                        {todo.task}
                      </Typography>
                      {progressLabel ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontWeight: 700,
                            flexShrink: 0,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                          aria-hidden
                        >
                          {progressLabel}
                        </Typography>
                      ) : null}
                    </Box>
                    {multiCount ? (
                      <LinearProgress
                        variant="determinate"
                        value={progressPct}
                        aria-hidden
                        sx={{
                          mt: 1.25,
                          height: 6,
                          borderRadius: 999,
                          bgcolor: (theme) =>
                            alpha(theme.palette.primary.main, 0.16),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            bgcolor: 'primary.main',
                          },
                        }}
                      />
                    ) : null}
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        )
      })}
      {todos.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No tasks yet.
        </Typography>
      ) : null}
    </Stack>
  )
}
