import { useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material'
import { TbArrowLeft, TbDotsVertical } from 'react-icons/tb'

export type AppHeaderMenuItem = {
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

type AppHeaderProps = {
  title: string
  backTo?: string
  onBack?: () => void
  menuItems?: AppHeaderMenuItem[]
}

const SIDE_SLOT = 40

export default function AppHeader({
  title,
  backTo,
  onBack,
  menuItems,
}: AppHeaderProps) {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)

  const showBack = onBack !== undefined || backTo !== undefined
  const handleBack = () => {
    if (onBack) onBack()
    else if (backTo) navigate(backTo)
    else navigate(-1)
  }

  const openMenu = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const closeMenu = () => setAnchorEl(null)

  const hasMenu = Boolean(menuItems && menuItems.length > 0)

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={1}
      sx={{
        top: 0,
        bgcolor: 'background.paper',
        borderTop: 0,
        borderLeft: 0,
        borderRight: 0,
        borderBottom: 1,
        borderColor: 'divider',
        pt: 'env(safe-area-inset-top)',
        pl: 'env(safe-area-inset-left)',
        pr: 'env(safe-area-inset-right)',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {showBack ? (
          <IconButton edge="start" onClick={handleBack} aria-label="Back">
            <TbArrowLeft size={18} />
          </IconButton>
        ) : (
          <Box sx={{ width: SIDE_SLOT }} />
        )}

        <Typography
          variant="h6"
          component="h1"
          noWrap
          sx={{ flex: 1, textAlign: 'center', fontWeight: 900 }}
        >
          {title}
        </Typography>

        {hasMenu ? (
          <>
            <IconButton edge="end" onClick={openMenu} aria-label="More options">
              <TbDotsVertical size={18} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
              {menuItems!.map((item) => (
                <MenuItem
                  key={item.label}
                  disabled={item.disabled}
                  onClick={() => {
                    closeMenu()
                    item.onClick()
                  }}
                  sx={item.danger ? { color: 'error.main' } : undefined}
                >
                  {item.icon ? (
                    <ListItemIcon sx={item.danger ? { color: 'error.main' } : undefined}>
                      {item.icon}
                    </ListItemIcon>
                  ) : null}
                  <ListItemText>{item.label}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : (
          <Box sx={{ width: SIDE_SLOT }} />
        )}
      </Toolbar>
    </AppBar>
  )
}
