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
  MenuBook,
  EditNote,
  Campaign,
  AccountTree,
  BarChart,
  Inbox,
  Send,
  Drafts as DraftsIcon,
  Draw,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Leads', icon: <People />, path: '/leads' },
  { text: 'Products', icon: <Inventory />, path: '/products' },
  { text: 'Classify', icon: <Email />, path: '/classify' },
  { text: 'Templates', icon: <Description />, path: '/templates' },
  { text: 'Guides', icon: <MenuBook />, path: '/guides' },
  { text: 'Compose', icon: <EditNote />, path: '/compose' },
  { text: 'Drafts', icon: <DraftsIcon />, path: '/drafts' },
  { text: 'Inbox', icon: <Inbox />, path: '/inbox' },
  { text: 'Outbox', icon: <Send />, path: '/outbox' },
  { text: 'Campaigns', icon: <Campaign />, path: '/campaigns' },
  { text: 'Sequences', icon: <AccountTree />, path: '/sequences' },
  { text: 'Signatures', icon: <Draw />, path: '/signatures' },
  { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
];

export default function Sidebar({ mobileOpen, handleDrawerToggle }: { mobileOpen?: boolean, handleDrawerToggle?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  const drawerContent = (
    <>
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
    </>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }} // Better open performance on mobile
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            backgroundColor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            backgroundColor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
