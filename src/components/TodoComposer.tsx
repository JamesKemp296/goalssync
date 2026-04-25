import type { FormEvent } from 'react'
import { Box, IconButton, Stack, TextField } from '@mui/material'
import { TbPlus } from 'react-icons/tb'

type TodoComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  placeholder?: string
}

export default function TodoComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Add new task',
}: TodoComposerProps) {
  return (
    <Box component="form" onSubmit={onSubmit} sx={{ mb: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <IconButton
          type="submit"
          aria-label="Add task"
          disabled={!value.trim()}
          sx={(theme) => ({
            width: 38,
            height: 38,
            flexShrink: 0,
            bgcolor: 'text.primary',
            color: theme.palette.background.paper,
            '&:hover': { bgcolor: 'text.secondary' },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
          })}
        >
          <TbPlus size={20} />
        </IconButton>
      </Stack>
    </Box>
  )
}
