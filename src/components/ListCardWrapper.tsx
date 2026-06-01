import { Stack } from '@mui/material'
import type { ReactNode } from 'react'

type ListCardWrapperProps = {
  children: ReactNode
}

type ListCardWrapperItemProps = {
  children: ReactNode
}

export default function ListCardWrapper({ children }: ListCardWrapperProps) {
  return <Stack spacing={1.25}>{children}</Stack>
}

export function ListCardWrapperItem({ children }: ListCardWrapperItemProps) {
  return children
}
