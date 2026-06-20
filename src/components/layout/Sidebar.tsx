'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import {
  Dashboard,
  People,
  Inventory,
  Email,
  Description,
  EditNote,
  Campaign,
  AccountTree,
  BarChart,
  Inbox,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Leads', icon: <People />, path: '/leads' },
  { text: 'Products', icon: <Inventory />, path: '/products' },
  { text: 'Classify', icon: <Email />, path: '/classify' },
  { text: 'Templates', icon: <Description />, path: '/templates' },
  { text: 'Compose', icon: <EditNote />, path: '/compose' },
  { text: 'Inbox', icon: <Inbox />, path: '/inbox' },
  { text: 'Campaigns', icon: <Campaign />, path: '/campaigns' },
  { text: 'Sequences', icon: <AccountTree />, path: '/sequences' },
  { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.default',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Email color="primary" fontSize="large" />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }} color="primary">
          Outreach AI
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => router.push(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                    '&:hover': {
                      backgroundColor: 'primary.main',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  slotProps={{
                    primary: {
                      sx: {
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.9rem'
                      }
                    }
                  }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
