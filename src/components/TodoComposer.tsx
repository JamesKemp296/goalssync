import type { FormEvent } from 'react'
import {
  Box,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { TbCheck, TbMinus, TbPlus } from 'react-icons/tb'

const TARGET_MAX = 99

type TodoComposerProps = {
  value: string
  onChange: (value: string) => void
  targetCount: number
  onTargetCountChange: (value: number) => void
  onSubmit: (e: FormEvent) => void
  placeholder?: string
}

export default function TodoComposer({
  value,
  onChange,
  targetCount,
  onTargetCountChange,
  onSubmit,
  placeholder = 'Add new task',
}: TodoComposerProps) {
  const clampTarget = (n: number) =>
    Math.min(TARGET_MAX, Math.max(1, Math.round(n)))

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ mb: 2.5 }}>
      <Paper
        elevation={1}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 2,
          py: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1} sx={{ width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
            }}
          >
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 280 } }}
            />
            <IconButton
              type="submit"
              aria-label="Add task"
              disabled={!value.trim()}
              color="primary"
            >
              <TbCheck size={20} />
            </IconButton>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Times
            </Typography>
            <IconButton
              type="button"
              size="small"
              aria-label="Decrease repeat count"
              disabled={targetCount <= 1}
              onClick={() => onTargetCountChange(clampTarget(targetCount - 1))}
            >
              <TbMinus size={18} />
            </IconButton>
            <Typography
              variant="body2"
              sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}
            >
              {targetCount}
            </Typography>
            <IconButton
              type="button"
              size="small"
              aria-label="Increase repeat count"
              disabled={targetCount >= TARGET_MAX}
              onClick={() => onTargetCountChange(clampTarget(targetCount + 1))}
            >
              <TbPlus size={18} />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
