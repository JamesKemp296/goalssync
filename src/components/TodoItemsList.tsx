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
import {
  TbCheck,
  TbEdit,
  TbMinus,
  TbPlus,
  TbSubtask,
  TbTrash,
  TbX,
} from 'react-icons/tb'

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
  subTasksMap?: Record<number, TodoListItem[]>
  onToggle?: (id: number) => void
  onRemove?: (id: number) => void
  onEdit?: (id: number, payload: TodoEditPayload) => Promise<void> | void
  onAddSubtask?: (
    parentId: number,
    payload: TodoEditPayload,
  ) => Promise<void> | void
  onToggleSubtask?: (id: number) => void
  onRemoveSubtask?: (id: number) => void
  onEditSubtask?: (id: number, payload: TodoEditPayload) => Promise<void> | void
  readOnly?: boolean
  showDelete?: boolean
}

export default function TodoItemsList({
  todos,
  subTasksMap = {},
  onToggle,
  onRemove,
  onEdit,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onEditSubtask,
  readOnly = false,
  showDelete = true,
}: TodoItemsListProps) {
  const ACTION_BUTTON_WIDTH = 50
  const ACTION_BUTTON_GAP = 8
  const ACTION_REVEAL_GAP = 8

  // ── shared swipe state ──────────────────────────────────────────────────
  const pointerRef = useRef<{
    todoId: number | null
    pointerId: number | null
    startX: number
    startY: number
    baseX: number
    swiping: boolean
    rowActionsWidth: number
  }>({
    todoId: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    baseX: 0,
    swiping: false,
    rowActionsWidth: 0,
  })
  const swipeSuppressRef = useRef<{ todoId: number | null; at: number }>({
    todoId: null,
    at: 0,
  })
  const [openTodoId, setOpenTodoId] = useState<number | null>(null)
  const [dragTodoId, setDragTodoId] = useState<number | null>(null)
  const [dragOffsetX, setDragOffsetX] = useState(0)

  // ── edit state (parent todos) ───────────────────────────────────────────
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingTargetCount, setEditingTargetCount] = useState(1)
  const [savingEdit, setSavingEdit] = useState(false)

  // ── edit state (sub-tasks) ──────────────────────────────────────────────
  const [editingSubId, setEditingSubId] = useState<number | null>(null)
  const [editingSubValue, setEditingSubValue] = useState('')
  const [editingSubTargetCount, setEditingSubTargetCount] = useState(1)
  const [savingSubEdit, setSavingSubEdit] = useState(false)

  // ── add-subtask form state ──────────────────────────────────────────────
  const [addingSubtaskForId, setAddingSubtaskForId] = useState<number | null>(
    null,
  )
  const [newSubtaskValue, setNewSubtaskValue] = useState('')
  const [newSubtaskTargetCount, setNewSubtaskTargetCount] = useState(1)
  const [savingNewSubtask, setSavingNewSubtask] = useState(false)

  // ── action availability ─────────────────────────────────────────────────
  const hasEditAction = !readOnly && Boolean(onEdit)
  const hasDeleteAction = !readOnly && showDelete && Boolean(onRemove)
  const hasAddSubtaskAction = !readOnly && Boolean(onAddSubtask)

  const parentActionCount =
    (hasAddSubtaskAction ? 1 : 0) +
    (hasEditAction ? 1 : 0) +
    (hasDeleteAction ? 1 : 0)
  const parentActionsWidth =
    parentActionCount > 0
      ? ACTION_BUTTON_WIDTH * parentActionCount +
        ACTION_BUTTON_GAP * (parentActionCount - 1) +
        ACTION_REVEAL_GAP
      : 0

  const hasSubEditAction = !readOnly && Boolean(onEditSubtask)
  const hasSubDeleteAction = !readOnly && showDelete && Boolean(onRemoveSubtask)
  const subActionCount =
    (hasSubEditAction ? 1 : 0) + (hasSubDeleteAction ? 1 : 0)
  const subActionsWidth =
    subActionCount > 0
      ? ACTION_BUTTON_WIDTH * subActionCount +
        ACTION_BUTTON_GAP * (subActionCount - 1) +
        ACTION_REVEAL_GAP
      : 0

  // ── helpers ─────────────────────────────────────────────────────────────
  const clampTarget = (n: number) =>
    Math.min(TARGET_MAX, Math.max(1, Math.round(n)))

  // ── parent edit ─────────────────────────────────────────────────────────
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
      await onEdit(id, { task: next, target_count: clampTarget(editingTargetCount) })
      setEditingTodoId(null)
      setEditingValue('')
      setEditingTargetCount(1)
    } finally {
      setSavingEdit(false)
    }
  }

  // ── sub-task edit ───────────────────────────────────────────────────────
  const beginSubEdit = (sub: TodoListItem) => {
    setOpenTodoId(null)
    setDragTodoId(null)
    setDragOffsetX(0)
    setEditingSubId(sub.id)
    setEditingSubValue(sub.task)
    setEditingSubTargetCount(Math.max(1, sub.target_count))
  }

  const cancelSubEdit = () => {
    setEditingSubId(null)
    setEditingSubValue('')
    setEditingSubTargetCount(1)
  }

  const saveSubEdit = async (id: number) => {
    if (!onEditSubtask || savingSubEdit) return
    const next = editingSubValue.trim()
    if (!next) return
    setSavingSubEdit(true)
    try {
      await onEditSubtask(id, {
        task: next,
        target_count: clampTarget(editingSubTargetCount),
      })
      setEditingSubId(null)
      setEditingSubValue('')
      setEditingSubTargetCount(1)
    } finally {
      setSavingSubEdit(false)
    }
  }

  // ── add subtask ─────────────────────────────────────────────────────────
  const openAddSubtask = (parentId: number) => {
    setOpenTodoId(null)
    setDragTodoId(null)
    setDragOffsetX(0)
    setAddingSubtaskForId(parentId)
    setNewSubtaskValue('')
    setNewSubtaskTargetCount(1)
  }

  const cancelAddSubtask = () => {
    setAddingSubtaskForId(null)
    setNewSubtaskValue('')
    setNewSubtaskTargetCount(1)
  }

  const saveNewSubtask = async (parentId: number) => {
    if (!onAddSubtask || savingNewSubtask) return
    const next = newSubtaskValue.trim()
    if (!next) return
    setSavingNewSubtask(true)
    try {
      await onAddSubtask(parentId, {
        task: next,
        target_count: clampTarget(newSubtaskTargetCount),
      })
      setAddingSubtaskForId(null)
      setNewSubtaskValue('')
      setNewSubtaskTargetCount(1)
    } finally {
      setSavingNewSubtask(false)
    }
  }

  // ── swipe handlers ──────────────────────────────────────────────────────
  const handlePointerDown = (
    e: PointerEvent<HTMLDivElement>,
    todoId: number,
    rowIsOpen: boolean,
    rowActionsWidth: number,
  ) => {
    if (rowActionsWidth === 0 || editingTodoId != null || editingSubId != null)
      return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-no-swipe="true"]')) return
    pointerRef.current = {
      todoId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: rowIsOpen ? -rowActionsWidth : 0,
      swiping: false,
      rowActionsWidth,
    }
    setDragTodoId(todoId)
    setDragOffsetX(rowIsOpen ? -rowActionsWidth : 0)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const active = pointerRef.current
    if (active.todoId == null || active.pointerId !== e.pointerId) return
    const deltaX = e.clientX - active.startX
    const deltaY = e.clientY - active.startY
    if (!active.swiping) {
      if (Math.abs(deltaX) < 8) return
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return
      active.swiping = true
    }
    e.preventDefault()
    const clamped = Math.max(
      -active.rowActionsWidth,
      Math.min(0, active.baseX + deltaX),
    )
    setDragOffsetX(clamped)
  }

  const finishSwipe = (e: PointerEvent<HTMLDivElement>) => {
    const active = pointerRef.current
    if (active.todoId == null || active.pointerId !== e.pointerId) return
    const raw = active.baseX + (e.clientX - active.startX)
    const finalOffset = Math.max(
      -active.rowActionsWidth,
      Math.min(0, raw),
    )
    const didSwipe = active.swiping
    if (didSwipe) {
      e.preventDefault()
      const shouldOpen = finalOffset <= -active.rowActionsWidth * 0.45
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
      rowActionsWidth: 0,
    }
    setDragTodoId(null)
    setDragOffsetX(0)
  }

  const handleCardClick = (
    todoId: number,
    rowIsOpen: boolean,
    target: EventTarget | null,
    onToggleFn: (() => void) | null,
  ) => {
    if (editingTodoId != null || editingSubId != null) return
    if (
      target instanceof HTMLElement &&
      target.closest('[data-no-toggle="true"]')
    ) {
      return
    }
    const recentlySwiped =
      swipeSuppressRef.current.todoId === todoId &&
      Date.now() - swipeSuppressRef.current.at < 300
    if (recentlySwiped) return
    if (rowIsOpen) {
      setOpenTodoId(null)
      return
    }
    onToggleFn?.()
  }

  // ── reusable edit form ──────────────────────────────────────────────────
  const renderEditForm = (opts: {
    value: string
    targetCount: number
    saving: boolean
    onValueChange: (v: string) => void
    onTargetChange: (n: number) => void
    onSave: () => void
    onCancel: () => void
  }) => (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault()
          opts.onSave()
        }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}
      >
        <TextField
          autoFocus
          size="small"
          value={opts.value}
          onChange={(e) => opts.onValueChange(e.target.value)}
          placeholder="Edit task"
          fullWidth
          disabled={opts.saving}
          slotProps={{ htmlInput: { maxLength: 280 } }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') opts.onCancel()
          }}
          data-no-swipe="true"
          data-no-toggle="true"
        />
        <IconButton
          aria-label="Save"
          type="submit"
          disabled={opts.saving || !opts.value.trim()}
          color="primary"
          data-no-swipe="true"
          data-no-toggle="true"
        >
          <TbCheck size={20} />
        </IconButton>
        <IconButton
          aria-label="Cancel"
          onClick={opts.onCancel}
          disabled={opts.saving}
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
          disabled={opts.saving || opts.targetCount <= 1}
          onClick={() => opts.onTargetChange(clampTarget(opts.targetCount - 1))}
        >
          <TbMinus size={18} />
        </IconButton>
        <Typography
          variant="body2"
          sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}
        >
          {opts.targetCount}
        </Typography>
        <IconButton
          type="button"
          size="small"
          aria-label="Increase repeat count"
          disabled={opts.saving || opts.targetCount >= TARGET_MAX}
          onClick={() => opts.onTargetChange(clampTarget(opts.targetCount + 1))}
        >
          <TbPlus size={18} />
        </IconButton>
      </Stack>
    </Stack>
  )

  // ── todo display row (shared between parent & sub-task) ─────────────────
  const renderTodoContent = (
    todo: TodoListItem,
    opts: {
      isSubtask: boolean
      hasSubtasks: boolean
    },
  ) => {
    const target = Math.max(1, todo.target_count)
    const progress = Math.min(Math.max(0, todo.progress_count), target)
    const multiCount = target > 1
    const progressPct = target > 0 ? Math.round((progress / target) * 100) : 0
    const progressLabel = multiCount ? `${progress}/${target}` : null
    const checkboxDisabled = readOnly || opts.hasSubtasks
    const checkboxAriaLabel = opts.hasSubtasks
      ? 'Completes automatically via sub-tasks'
      : multiCount
        ? `${progress} of ${target} completed`
        : todo.is_complete
          ? 'Mark incomplete'
          : 'Mark complete'

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <Checkbox
          checked={todo.is_complete}
          disabled={checkboxDisabled}
          onChange={
            opts.hasSubtasks
              ? undefined
              : () =>
                  opts.isSubtask
                    ? onToggleSubtask?.(todo.id)
                    : onToggle?.(todo.id)
          }
          slotProps={{
            input: {
              'aria-label': checkboxAriaLabel,
              ...(multiCount
                ? { 'aria-valuenow': progress, 'aria-valuemax': target }
                : {}),
            },
          }}
          data-no-swipe="true"
          data-no-toggle="true"
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
          >
            <Typography
              variant={opts.isSubtask ? 'body2' : 'body1'}
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: 600,
                lineHeight: 1.35,
                maxHeight: 'calc(1.35em * 2)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                overflowWrap: 'anywhere',
                textDecoration: todo.is_complete ? 'line-through' : 'none',
                color: todo.is_complete ? 'text.secondary' : 'text.primary',
              }}
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
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  bgcolor: 'primary.main',
                },
              }}
            />
          ) : null}
        </Box>
      </Box>
    )
  }

  // ── action button stack (reusable) ──────────────────────────────────────
  const renderActionButtons = (
    todo: TodoListItem,
    opts: {
      isSubtask: boolean
      top: number
      bottom: number
      width: number
    },
  ) => {
    if (opts.width === 0) return null
    const showAdd = !opts.isSubtask && hasAddSubtaskAction
    const showEdit = opts.isSubtask ? hasSubEditAction : hasEditAction
    const showDelete = opts.isSubtask ? hasSubDeleteAction : hasDeleteAction

    return (
      <Stack
        direction="row"
        sx={{
          position: 'absolute',
          top: opts.top,
          right: 0,
          bottom: opts.bottom,
          width: opts.width,
          zIndex: 0,
          justifyContent: 'flex-end',
          gap: `${ACTION_BUTTON_GAP}px`,
        }}
      >
        {showAdd ? (
          <Box
            component="button"
            type="button"
            aria-label="Add sub-task"
            onClick={() => openAddSubtask(todo.id)}
            data-no-toggle="true"
            sx={{
              width: ACTION_BUTTON_WIDTH,
              border: 0,
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: 'info.main',
              color: 'info.contrastText',
              display: 'grid',
              placeItems: 'center',
              '&:active': { opacity: 0.9 },
            }}
          >
            <TbSubtask size={20} />
          </Box>
        ) : null}
        {showEdit ? (
          <Box
            component="button"
            type="button"
            aria-label="Edit task"
            onClick={() =>
              opts.isSubtask ? beginSubEdit(todo) : beginEdit(todo)
            }
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
        {showDelete ? (
          <Box
            component="button"
            type="button"
            aria-label="Delete task"
            onClick={() =>
              opts.isSubtask ? onRemoveSubtask?.(todo.id) : onRemove?.(todo.id)
            }
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
    )
  }

  // ── main render ─────────────────────────────────────────────────────────
  return (
    <Stack spacing={1.25}>
      {todos.map((todo) => {
        const subTasks = subTasksMap[todo.id] ?? []
        const hasSubtasks = subTasks.length > 0
        const isAddingSubtask = addingSubtaskForId === todo.id

        const rowIsOpen = openTodoId === todo.id
        const rowIsEditing = editingTodoId === todo.id
        const translateX =
          dragTodoId === todo.id
            ? dragOffsetX
            : rowIsOpen && parentActionsWidth > 0
              ? -parentActionsWidth
              : 0

        return (
          <Box key={todo.id}>
            {/* ── parent card ── */}
            <Box
              sx={{
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {renderActionButtons(todo, {
                isSubtask: false,
                top: 4,
                bottom: 4,
                width: parentActionsWidth - ACTION_REVEAL_GAP,
              })}

              <Paper
                elevation={1}
                onPointerDown={(e) =>
                  handlePointerDown(e, todo.id, rowIsOpen, parentActionsWidth)
                }
                onPointerMove={handlePointerMove}
                onPointerUp={finishSwipe}
                onPointerCancel={finishSwipe}
                onClick={(e) =>
                  handleCardClick(
                    todo.id,
                    rowIsOpen,
                    e.target,
                    !hasSubtasks && !readOnly && onToggle
                      ? () => onToggle(todo.id)
                      : null,
                  )
                }
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  transform: `translateX(${translateX}px)`,
                  transition:
                    dragTodoId === todo.id
                      ? 'none'
                      : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
                  touchAction: parentActionsWidth > 0 ? 'pan-y' : 'auto',
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
                    !rowIsEditing && !readOnly && !hasSubtasks && onToggle
                      ? 'pointer'
                      : 'default',
                }}
              >
                {rowIsEditing
                  ? renderEditForm({
                      value: editingValue,
                      targetCount: editingTargetCount,
                      saving: savingEdit,
                      onValueChange: setEditingValue,
                      onTargetChange: setEditingTargetCount,
                      onSave: () => void saveEdit(todo.id),
                      onCancel: cancelEdit,
                    })
                  : renderTodoContent(todo, {
                      isSubtask: false,
                      hasSubtasks,
                    })}
              </Paper>
            </Box>

            {/* ── sub-tasks section ── */}
            {(hasSubtasks || isAddingSubtask) && (
              <Box
                sx={{
                  pl: 2.5,
                  mt: 0.75,
                  borderLeft: '2px solid',
                  borderColor: 'divider',
                  ml: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                }}
              >
                {subTasks.map((sub) => {
                  const subIsOpen = openTodoId === sub.id
                  const subIsEditing = editingSubId === sub.id
                  const subTranslateX =
                    dragTodoId === sub.id
                      ? dragOffsetX
                      : subIsOpen && subActionsWidth > 0
                        ? -subActionsWidth
                        : 0

                  return (
                    <Box
                      key={sub.id}
                      sx={{
                        position: 'relative',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                      }}
                    >
                      {renderActionButtons(sub, {
                        isSubtask: true,
                        top: 3,
                        bottom: 3,
                        width: subActionsWidth - ACTION_REVEAL_GAP,
                      })}

                      <Paper
                        elevation={0}
                        onPointerDown={(e) =>
                          handlePointerDown(
                            e,
                            sub.id,
                            subIsOpen,
                            subActionsWidth,
                          )
                        }
                        onPointerMove={handlePointerMove}
                        onPointerUp={finishSwipe}
                        onPointerCancel={finishSwipe}
                        onClick={(e) =>
                          handleCardClick(
                            sub.id,
                            subIsOpen,
                            e.target,
                            !readOnly && onToggleSubtask
                              ? () => onToggleSubtask(sub.id)
                              : null,
                          )
                        }
                        sx={{
                          position: 'relative',
                          zIndex: 1,
                          transform: `translateX(${subTranslateX}px)`,
                          transition:
                            dragTodoId === sub.id
                              ? 'none'
                              : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
                          touchAction: subActionsWidth > 0 ? 'pan-y' : 'auto',
                          display: 'flex',
                          alignItems: 'stretch',
                          gap: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          px: 1.5,
                          py: 1,
                          bgcolor: 'background.default',
                          cursor:
                            !subIsEditing && !readOnly && onToggleSubtask
                              ? 'pointer'
                              : 'default',
                        }}
                      >
                        {subIsEditing
                          ? renderEditForm({
                              value: editingSubValue,
                              targetCount: editingSubTargetCount,
                              saving: savingSubEdit,
                              onValueChange: setEditingSubValue,
                              onTargetChange: setEditingSubTargetCount,
                              onSave: () => void saveSubEdit(sub.id),
                              onCancel: cancelSubEdit,
                            })
                          : renderTodoContent(sub, {
                              isSubtask: true,
                              hasSubtasks: false,
                            })}
                      </Paper>
                    </Box>
                  )
                })}

                {/* ── add subtask form ── */}
                {isAddingSubtask && (
                  <Paper
                    elevation={0}
                    sx={{
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1,
                      bgcolor: 'background.default',
                    }}
                  >
                    {renderEditForm({
                      value: newSubtaskValue,
                      targetCount: newSubtaskTargetCount,
                      saving: savingNewSubtask,
                      onValueChange: setNewSubtaskValue,
                      onTargetChange: setNewSubtaskTargetCount,
                      onSave: () => void saveNewSubtask(todo.id),
                      onCancel: cancelAddSubtask,
                    })}
                  </Paper>
                )}
              </Box>
            )}
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
