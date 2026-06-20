'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import InputBase from '@mui/material/InputBase';
import { styled, alpha } from '@mui/material/styles';
import { Search as SearchIcon, Notifications, Settings, Menu as MenuIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Popover, List, ListItem, ListItemText, ListItemAvatar, Avatar, 
  Button, Divider 
} from '@mui/material';
import { 
  Info as InfoIcon, Warning as WarningIcon, CheckCircle as SuccessIcon, Error as ErrorIcon 
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const drawerWidth = 240;

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.05),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.black, 0.08),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '40ch',
    },
  },
}));

export default function TopBar({ onDrawerToggle }: { onDrawerToggle?: () => void }) {
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <SuccessIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search leads, campaigns, templates…"
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            size="large" 
            aria-label={`show ${unreadCount} new notifications`} 
            color="inherit"
            onClick={handleNotificationsClick}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <IconButton size="large" color="inherit" onClick={() => router.push('/settings')}>
            <Settings />
          </IconButton>
        </Box>
      </Toolbar>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleNotificationsClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: { width: 360, maxHeight: 500 }
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={() => markAllAsRead()}>Mark all as read</Button>
          )}
        </Box>
        <Divider />
        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary={<Typography color="text.secondary" align="center">No notifications yet</Typography>} 
              />
            </ListItem>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <ListItem 
                key={notification.id} 
                sx={{ 
                  bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (!notification.isRead) markAsRead(notification.id);
                  if (notification.link) {
                    router.push(notification.link);
                    handleNotificationsClose();
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'transparent' }}>
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: notification.isRead ? 'normal' : 'bold' }}>
                      {notification.title}
                    </Typography>
                  } 
                  secondary={
                    <React.Fragment>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(notification.createdAt)}
                      </Typography>
                    </React.Fragment>
                  } 
                />
              </ListItem>
            ))
          )}
        </List>
      </Popover>
    </AppBar>
  );
}
