import React, { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Box, Typography } from '@mui/material'
import { TbCar, TbPlane } from 'react-icons/tb'
import type { IconType } from 'react-icons'

type CatRunGameProps = {
  catSvgSrc: string
  colors: {
    background: string
    text: string
    ground: string
    obstacle: string
    accent: string
  }
}

type ObstacleKind = 'car' | 'plane'
type PlaneLane = 'high' | 'low'

type Obstacle = {
  x: number
  kind: ObstacleKind
  lane?: PlaneLane
}

const CANVAS_HEIGHT = 480
const GRAVITY = 0.55
const JUMP_VELOCITY = 10.5
const MAX_JUMP_HEIGHT = 130
const TAP_DEAD_SPACE = 100
const ROAD_HEIGHT = 14
const GROUND_OFFSET = TAP_DEAD_SPACE + ROAD_HEIGHT
const PLAYER_SIZE = 44
const CAR_SIZE = 30
const PLANE_SIZE = 32
const BASE_OBSTACLE_SPEED = 3.5
const MAX_SPEED_MULT = 2.2
const SPAWN_MIN_MS = 1400
const SPAWN_MAX_MS = 2400
const MIN_SPAWN_MIN_MS = 650
const MIN_SPAWN_MAX_MS = 1100
const PLANE_SCORE_THRESHOLD = 400
const DOUBLE_SPAWN_SCORE = 350

function iconToImage(
  Icon: IconType,
  color: string,
  strokeWidth = 1.2,
): HTMLImageElement {
  const svg = renderToStaticMarkup(
    React.createElement(
      Icon as React.ComponentType<React.SVGProps<SVGSVGElement>>,
      {
        viewBox: '0 0 24 24',
        width: '24',
        height: '24',
        stroke: color,
        fill: 'none',
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    ),
  )
  const img = new Image()
  img.src = 'data:image/svg+xml,' + encodeURIComponent(svg)
  return img
}

function speedMultiplier(score: number): number {
  return 1 + Math.min(score / 800, 1) * (MAX_SPEED_MULT - 1)
}

function spawnInterval(score: number): { min: number; max: number } {
  const min = Math.max(MIN_SPAWN_MIN_MS, SPAWN_MIN_MS - score * 1.4)
  const max = Math.max(MIN_SPAWN_MAX_MS, SPAWN_MAX_MS - score * 2)
  return { min, max: Math.max(min + 200, max) }
}

export default function CatRunGame({ catSvgSrc, colors }: CatRunGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const catImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = catSvgSrc
    catImageRef.current = img
  }, [catSvgSrc])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const carImg = iconToImage(TbCar, colors.obstacle, 1.5)
    const planeImg = iconToImage(TbPlane, colors.obstacle, 1.5)

    let raf = 0
    let width = container.clientWidth
    let playerX = width * 0.15
    let playerY = 0
    let playerVy = 0
    let obstacles: Obstacle[] = []
    let score = 0
    let lastScoreAt = 0
    let lastSpawnAt = 0
    let nextSpawnIn = SPAWN_MIN_MS
    let started = false
    let gameOver = false
    let lastFrameAt = 0

    const groundY = () => CANVAS_HEIGHT - GROUND_OFFSET

    const reset = () => {
      playerY = 0
      playerVy = 0
      obstacles = []
      score = 0
      lastScoreAt = 0
      lastSpawnAt = performance.now()
      nextSpawnIn = SPAWN_MIN_MS
      started = false
      gameOver = false
    }

    const jump = () => {
      if (gameOver) {
        reset()
        started = true
        playerVy = JUMP_VELOCITY
        return
      }
      if (!started) {
        started = true
        lastSpawnAt = performance.now()
        lastScoreAt = performance.now()
      }
      if (playerY <= 0 && playerVy <= 0) {
        playerVy = JUMP_VELOCITY
      }
    }

    const spawnCar = (offsetX = 0) => {
      obstacles.push({ x: width + CAR_SIZE + offsetX, kind: 'car' })
    }

    const spawnPlane = () => {
      const lane: PlaneLane = Math.random() < 0.5 ? 'high' : 'low'
      obstacles.push({ x: width + PLANE_SIZE, kind: 'plane', lane })
    }

    const spawnObstacle = () => {
      const canSpawnPlane = score >= PLANE_SCORE_THRESHOLD
      const planeChance = canSpawnPlane ? 0.35 : 0

      if (Math.random() < planeChance) {
        spawnPlane()
      } else {
        spawnCar()
      }

      // Double spawn at higher scores — two obstacles close together
      if (score >= DOUBLE_SPAWN_SCORE && Math.random() < 0.22) {
        spawnCar(180 + Math.random() * 120)
      }
    }

    const drawIconFlipped = (
      img: HTMLImageElement,
      x: number,
      y: number,
      size: number,
    ) => {
      if (!img.complete) return
      ctx.save()
      ctx.translate(x + size, y)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, size, size)
      ctx.restore()
    }

    const planeY = (lane: PlaneLane, gy: number) =>
      lane === 'high' ? gy - 108 : gy - 44

    const draw = () => {
      ctx.fillStyle = colors.background
      ctx.fillRect(0, 0, width, CANVAS_HEIGHT)

      const gy = groundY()
      ctx.strokeStyle = colors.ground
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(width, gy)
      ctx.stroke()

      ctx.setLineDash([6, 10])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, gy + 14)
      ctx.lineTo(width, gy + 14)
      ctx.stroke()
      ctx.setLineDash([])

      const cat = catImageRef.current
      const catX = playerX - PLAYER_SIZE / 2
      const catY = gy - PLAYER_SIZE - playerY
      if (cat?.complete) {
        ctx.drawImage(cat, catX, catY, PLAYER_SIZE, PLAYER_SIZE)
      } else {
        ctx.fillStyle = colors.accent
        ctx.fillRect(catX, catY, PLAYER_SIZE, PLAYER_SIZE)
      }

      for (const ob of obstacles) {
        if (ob.kind === 'car') {
          drawIconFlipped(carImg, ob.x, gy - CAR_SIZE, CAR_SIZE)
        } else if (ob.lane) {
          drawIconFlipped(
            planeImg,
            ob.x,
            planeY(ob.lane, gy) - PLANE_SIZE,
            PLANE_SIZE,
          )
        }
      }

      ctx.fillStyle = colors.text
      ctx.font = '600 14px system-ui, sans-serif'
      ctx.fillText(String(Math.floor(score)), width - 36, 24)

      if (!started && !gameOver) {
        ctx.font = '600 15px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Tap to jump', width / 2, gy * 0.44)
        ctx.textAlign = 'start'
      }

      if (gameOver) {
        ctx.save()
        ctx.globalAlpha = 0.88
        ctx.fillStyle = colors.background
        ctx.fillRect(0, 0, width, gy + ROAD_HEIGHT)
        ctx.restore()
        ctx.fillStyle = colors.text
        ctx.font = '800 22px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Oops!', width / 2, gy * 0.4)
        ctx.font = '500 15px system-ui, sans-serif'
        ctx.fillText(`Score: ${Math.floor(score)}`, width / 2, gy * 0.4 + 28)
        ctx.fillText('Tap to retry', width / 2, gy * 0.4 + 52)
        ctx.textAlign = 'start'
      }
    }

    const tick = (now: number) => {
      const dt = lastFrameAt ? Math.min(now - lastFrameAt, 32) : 16
      lastFrameAt = now

      if (started && !gameOver) {
        playerVy -= GRAVITY * (dt / 16)
        playerY += playerVy * (dt / 16)
        if (playerY > MAX_JUMP_HEIGHT) {
          playerY = MAX_JUMP_HEIGHT
          if (playerVy > 0) playerVy = 0
        }
        if (playerY <= 0) {
          playerY = 0
          playerVy = 0
        }

        if (now - lastScoreAt >= 100) {
          score += 1
          lastScoreAt = now
        }

        const speed = BASE_OBSTACLE_SPEED * speedMultiplier(score)

        if (now - lastSpawnAt >= nextSpawnIn) {
          spawnObstacle()
          lastSpawnAt = now
          const interval = spawnInterval(score)
          nextSpawnIn =
            interval.min + Math.random() * (interval.max - interval.min)
        }

        for (const ob of obstacles) {
          ob.x -= speed * (dt / 16)
        }
        obstacles = obstacles.filter((ob) => {
          const size = ob.kind === 'car' ? CAR_SIZE : PLANE_SIZE
          return ob.x + size > 0
        })

        const gy = groundY()
        const hitboxPad = 6
        const px = playerX - PLAYER_SIZE / 2 + hitboxPad
        const py = gy - PLAYER_SIZE - playerY + hitboxPad
        const pw = PLAYER_SIZE - hitboxPad * 2
        const ph = PLAYER_SIZE - hitboxPad * 2

        for (const ob of obstacles) {
          if (ob.kind === 'car') {
            const ox = ob.x + 2
            const oy = gy - CAR_SIZE + 2
            const ow = CAR_SIZE - 4
            const oh = CAR_SIZE - 4
            if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
              gameOver = true
              break
            }
          } else if (ob.lane) {
            const ox = ob.x + 3
            const oy = planeY(ob.lane, gy) - PLANE_SIZE + 3
            const ow = PLANE_SIZE - 6
            const oh = PLANE_SIZE - 6

            // High lane: punishes jumping — stay on the ground
            if (ob.lane === 'high' && playerY > 50) {
              if (
                px < ox + ow &&
                px + pw > ox &&
                py < oy + oh &&
                py + ph > oy
              ) {
                gameOver = true
                break
              }
            }

            // Low lane: punishes staying grounded — jump over it
            if (ob.lane === 'low' && playerY < 18) {
              if (
                px < ox + ow &&
                px + pw > ox &&
                py < oy + oh &&
                py + ph > oy
              ) {
                gameOver = true
                break
              }
            }
          }
        }
      }

      draw()
      raf = requestAnimationFrame(tick)
    }

    const resize = () => {
      width = container.clientWidth
      canvas.width = width
      canvas.height = CANVAS_HEIGHT
      playerX = width * 0.15
    }

    const onPointerDown = () => jump()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return
      event.preventDefault()
      jump()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()
    reset()
    raf = requestAnimationFrame(tick)

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [catSvgSrc, colors])

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{
          display: 'block',
          width: '100%',
          height: CANVAS_HEIGHT,
          touchAction: 'none',
          cursor: 'pointer',
        }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', py: 1 }}
      >
        Tap or press Space to jump
      </Typography>
    </Box>
  )
}
