import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'

type PointerState = {
  rowId: string | number | null
  pointerId: number | null
  startX: number
  startY: number
  baseX: number
  swiping: boolean
  rowActionsWidth: number
}

const emptyPointerState = (): PointerState => ({
  rowId: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  baseX: 0,
  swiping: false,
  rowActionsWidth: 0,
})

export function useSwipeRevealGroup<T extends string | number>() {
  const pointerRef = useRef<PointerState>(emptyPointerState())
  const swipeSuppressRef = useRef<{ rowId: T | null; at: number }>({
    rowId: null,
    at: 0,
  })
  const [openRowId, setOpenRowId] = useState<T | null>(null)
  const [dragRowId, setDragRowId] = useState<T | null>(null)
  const [dragOffsetX, setDragOffsetX] = useState(0)

  const closeOpenRow = () => setOpenRowId(null)

  const handlePointerDown = (
    e: PointerEvent<HTMLDivElement>,
    rowId: T,
    rowIsOpen: boolean,
    rowActionsWidth: number,
    disabled = false,
  ) => {
    if (disabled || rowActionsWidth === 0) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-no-swipe="true"]')) return
    pointerRef.current = {
      rowId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: rowIsOpen ? -rowActionsWidth : 0,
      swiping: false,
      rowActionsWidth,
    }
    setDragRowId(rowId)
    setDragOffsetX(rowIsOpen ? -rowActionsWidth : 0)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const active = pointerRef.current
    if (active.rowId == null || active.pointerId !== e.pointerId) return
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
    if (active.rowId == null || active.pointerId !== e.pointerId) return
    const raw = active.baseX + (e.clientX - active.startX)
    const finalOffset = Math.max(
      -active.rowActionsWidth,
      Math.min(0, raw),
    )
    const didSwipe = active.swiping
    if (didSwipe) {
      e.preventDefault()
      const shouldOpen = finalOffset <= -active.rowActionsWidth * 0.45
      setOpenRowId(shouldOpen ? (active.rowId as T) : null)
      swipeSuppressRef.current = {
        rowId: active.rowId as T,
        at: Date.now(),
      }
    }
    pointerRef.current = emptyPointerState()
    setDragRowId(null)
    setDragOffsetX(0)
  }

  const handleContentClick = (
    rowId: T,
    rowIsOpen: boolean,
    target: EventTarget | null,
    onActivate?: () => void,
    disabled = false,
  ) => {
    if (disabled) return
    if (
      target instanceof HTMLElement &&
      target.closest('[data-no-toggle="true"]')
    ) {
      return
    }
    const recentlySwiped =
      swipeSuppressRef.current.rowId === rowId &&
      Date.now() - swipeSuppressRef.current.at < 300
    if (recentlySwiped) return
    if (rowIsOpen) {
      setOpenRowId(null)
      return
    }
    onActivate?.()
  }

  const bindRow = (
    rowId: T,
    actionsWidth: number,
    options?: {
      disabled?: boolean
      onActivate?: () => void
    },
  ) => {
    const rowIsOpen = openRowId === rowId
    const translateX =
      dragRowId === rowId
        ? dragOffsetX
        : rowIsOpen && actionsWidth > 0
          ? -actionsWidth
          : 0

    return {
      rowIsOpen,
      translateX,
      hasSwipeActions: actionsWidth > 0,
      closeOpenRow,
      pointerHandlers: {
        onPointerDown: (e: PointerEvent<HTMLDivElement>) =>
          handlePointerDown(
            e,
            rowId,
            rowIsOpen,
            actionsWidth,
            options?.disabled,
          ),
        onPointerMove: handlePointerMove,
        onPointerUp: finishSwipe,
        onPointerCancel: finishSwipe,
      },
      onContentClick: (e: MouseEvent<HTMLDivElement>) =>
        handleContentClick(
          rowId,
          rowIsOpen,
          e.target,
          options?.onActivate,
          options?.disabled,
        ),
      surfaceSx: {
        transform: `translateX(${translateX}px)`,
        transition:
          dragRowId === rowId
            ? 'none'
            : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
        touchAction: actionsWidth > 0 ? 'pan-y' : 'auto',
      },
    }
  }

  return {
    openRowId,
    setOpenRowId,
    closeOpenRow,
    bindRow,
  }
}

export type SwipeRevealGroup<T extends string | number> = ReturnType<
  typeof useSwipeRevealGroup<T>
>
