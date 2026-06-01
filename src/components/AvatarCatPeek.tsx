import { useEffect, useState } from 'react'
import { Avatar, Box, IconButton } from '@mui/material'

type AvatarCatPeekProps = {
  initial: string
  lindseyUser: boolean
  catName: string
  onClick: () => void
}

function CatEarsIcon({
  furColor,
  accentColor,
}: {
  furColor: string
  accentColor: string
}) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path
        d="M14 24 L22 7 L30 24 Z"
        fill={furColor}
        transform="rotate(-14 22 18)"
      />
      <path
        d="M34 24 L42 7 L50 24 Z"
        fill={furColor}
        transform="rotate(14 42 18)"
      />
      <path
        d="M21 22 L23.5 15 L26 22 Z"
        fill={accentColor}
        transform="rotate(-14 23.5 19)"
      />
      <path
        d="M38 22 L40.5 15 L43 22 Z"
        fill={accentColor}
        transform="rotate(14 40.5 19)"
      />
    </svg>
  )
}

const PEEK_MS = 1300
const MIN_INTERVAL_MS = 4_000
const MAX_INTERVAL_MS = 7_000

export default function AvatarCatPeek({
  initial,
  lindseyUser,
  catName,
  onClick,
}: AvatarCatPeekProps) {
  const [peeking, setPeeking] = useState(false)
  const furColor = lindseyUser ? '#8a7869' : '#ffc97f'
  const accentColor = lindseyUser ? '#d79a8f' : '#f58f86'

  useEffect(() => {
    let peekTimeout: ReturnType<typeof setTimeout>
    let hideTimeout: ReturnType<typeof setTimeout>

    const schedulePeek = () => {
      const delay =
        MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS)
      peekTimeout = setTimeout(() => {
        setPeeking(true)
        hideTimeout = setTimeout(() => {
          setPeeking(false)
          schedulePeek()
        }, PEEK_MS)
      }, delay)
    }

    schedulePeek()

    return () => {
      clearTimeout(peekTimeout)
      clearTimeout(hideTimeout)
    }
  }, [])

  return (
    <IconButton
      onClick={onClick}
      aria-label={`View ${catName}`}
      sx={{ p: 0, mx: 'auto', display: 'block', overflow: 'visible' }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 50,
          height: 50,
          overflow: 'visible',
          '@keyframes earPeek': {
            '0%': { transform: 'translateY(12px)' },
            '30%': { transform: 'translateY(-2px)' },
            '55%': { transform: 'translateY(-5px) rotate(-2deg)' },
            '75%': { transform: 'translateY(-3px) rotate(2deg)' },
            '100%': { transform: 'translateY(-4px)' },
          },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 58,
            height: 58,
            ml: '-29px',
            mt: '-29px',
            zIndex: 0,
            pointerEvents: 'none',
            opacity: peeking ? 1 : 0,
            transform: peeking ? undefined : 'translateY(12px)',
            transition: peeking ? 'opacity 0.2s ease' : 'opacity 0.25s ease, transform 0.3s ease',
            animation: peeking ? 'earPeek 0.55s ease-out forwards' : 'none',
          }}
        >
          <CatEarsIcon furColor={furColor} accentColor={accentColor} />
        </Box>
        <Avatar
          sx={{
            position: 'relative',
            zIndex: 1,
            width: 50,
            height: 50,
            bgcolor: 'primary.main',
            fontWeight: 900,
            fontSize: 28,
          }}
        >
          {initial}
        </Avatar>
      </Box>
    </IconButton>
  )
}
