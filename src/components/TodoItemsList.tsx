import { useState } from 'react'
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
import SwipeActionButtons from './swipe/SwipeActionButtons'
import type { SwipeAction } from './swipe/swipeActions'
import {
  computeSwipeActionsWidth,
  swipeActionButtonsWidth,
} from './swipe/swipeActions'
import { useSwipeRevealGroup } from './swipe/useSwipeRevealGroup'

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
  const swipe = useSwipeRevealGroup<number>()

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

  const swipeDisabled = editingTodoId != null || editingSubId != null

  // ── action availability ─────────────────────────────────────────────────
  const hasEditAction = !readOnly && Boolean(onEdit)
  const hasDeleteAction = !readOnly && showDelete && Boolean(onRemove)
  const hasAddSubtaskAction = !readOnly && Boolean(onAddSubtask)
  const hasSubEditAction = !readOnly && Boolean(onEditSubtask)
  const hasSubDeleteAction = !readOnly && showDelete && Boolean(onRemoveSubtask)

  const buildParentActions = (todo: TodoListItem): SwipeAction[] => {
    const actions: SwipeAction[] = []
    if (hasAddSubtaskAction) {
      actions.push({
        key: 'add',
        label: 'Add sub-task',
        icon: <TbSubtask size={20} />,
        color: 'info',
        onClick: () => openAddSubtask(todo.id),
      })
    }
    if (hasEditAction) {
      actions.push({
        key: 'edit',
        label: 'Edit task',
        icon: <TbEdit size={20} />,
        color: 'warning',
        onClick: () => beginEdit(todo),
      })
    }
    if (hasDeleteAction) {
      actions.push({
        key: 'delete',
        label: 'Delete task',
        icon: <TbTrash size={20} />,
        color: 'error',
        onClick: () => onRemove?.(todo.id),
      })
    }
    return actions
  }

  const buildSubActions = (sub: TodoListItem): SwipeAction[] => {
    const actions: SwipeAction[] = []
    if (hasSubEditAction) {
      actions.push({
        key: 'edit',
        label: 'Edit task',
        icon: <TbEdit size={20} />,
        color: 'warning',
        onClick: () => beginSubEdit(sub),
      })
    }
    if (hasSubDeleteAction) {
      actions.push({
        key: 'delete',
        label: 'Delete task',
        icon: <TbTrash size={20} />,
        color: 'error',
        onClick: () => onRemoveSubtask?.(sub.id),
      })
    }
    return actions
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  const clampTarget = (n: number) =>
    Math.min(TARGET_MAX, Math.max(1, Math.round(n)))

  // ── parent edit ─────────────────────────────────────────────────────────
  const beginEdit = (todo: TodoListItem) => {
    swipe.closeOpenRow()
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
    swipe.closeOpenRow()
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
    swipe.closeOpenRow()
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

  // ── main render ─────────────────────────────────────────────────────────
  return (
    <Stack spacing={1.25}>
      {todos.map((todo) => {
        const subTasks = subTasksMap[todo.id] ?? []
        const hasSubtasks = subTasks.length > 0
        const isAddingSubtask = addingSubtaskForId === todo.id
        const rowIsEditing = editingTodoId === todo.id
        const parentActions = buildParentActions(todo)
        const parentSwipe = swipe.bindRow(
          todo.id,
          computeSwipeActionsWidth(parentActions.length),
          {
            disabled: swipeDisabled,
            onActivate:
              !hasSubtasks && !readOnly && onToggle
                ? () => onToggle(todo.id)
                : undefined,
          },
        )

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
              <SwipeActionButtons
                actions={parentActions}
                width={swipeActionButtonsWidth(parentActions.length)}
              />

              <Paper
                elevation={1}
                {...parentSwipe.pointerHandlers}
                onClick={parentSwipe.onContentClick}
                sx={{
                  position: 'relative',
                  zIndex: 1,
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
                  ...parentSwipe.surfaceSx,
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
                  const subIsEditing = editingSubId === sub.id
                  const subActions = buildSubActions(sub)
                  const subSwipe = swipe.bindRow(
                    sub.id,
                    computeSwipeActionsWidth(subActions.length),
                    {
                      disabled: swipeDisabled,
                      onActivate:
                        !readOnly && onToggleSubtask
                          ? () => onToggleSubtask(sub.id)
                          : undefined,
                    },
                  )

                  return (
                    <Box
                      key={sub.id}
                      sx={{
                        position: 'relative',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                      }}
                    >
                      <SwipeActionButtons
                        actions={subActions}
                        width={swipeActionButtonsWidth(subActions.length)}
                        inset={{ top: 3, bottom: 3 }}
                      />

                      <Paper
                        elevation={0}
                        {...subSwipe.pointerHandlers}
                        onClick={subSwipe.onContentClick}
                        sx={{
                          position: 'relative',
                          zIndex: 1,
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
                          ...subSwipe.surfaceSx,
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
