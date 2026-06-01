import {
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { TbMinus, TbPlus } from 'react-icons/tb'

const TARGET_MAX = 99

type TodoComposerProps = {
  value: string
  onChange: (value: string) => void
  targetCount: number
  onTargetCountChange: (value: number) => void
  placeholder?: string
}

export default function TodoComposer({
  value,
  onChange,
  targetCount,
  onTargetCountChange,
  placeholder = 'Add new task',
}: TodoComposerProps) {
  const clampTarget = (n: number) =>
    Math.min(TARGET_MAX, Math.max(1, Math.round(n)))

  return (
    <>
      <TextField
        autoFocus
        fullWidth
        margin="dense"
        label="Task"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 280 } }}
      />
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ mt: 2, display: 'block' }}
      >
        Times
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
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
    </>
  )
}
