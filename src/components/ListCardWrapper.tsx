import { Grid } from '@mui/material'
import type { ReactNode } from 'react'

const LIST_CARD_GAP = 1.5

type ListCardWrapperProps = {
  children: ReactNode
}

type ListCardWrapperItemProps = {
  children: ReactNode
}

export default function ListCardWrapper({ children }: ListCardWrapperProps) {
  return (
    <Grid container spacing={LIST_CARD_GAP}>
      {children}
    </Grid>
  )
}

export function ListCardWrapperItem({ children }: ListCardWrapperItemProps) {
  return <Grid size={6}>{children}</Grid>
}
