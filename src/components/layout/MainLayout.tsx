'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '@/components/auth/AuthProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const isLoginPage = pathname === '/login';

  // The proxy checks the server session; this keeps the browser's Firebase sign-in
  // (which Firestore will rely on) in step with it.
  React.useEffect(() => {
    if (!isLoginPage && !loading && !user) void signOut();
  }, [isLoginPage, loading, user, signOut]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (isLoginPage) return <>{children}</>;

  if (loading || !user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar onDrawerToggle={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - 240px)` },
          mt: '64px', // Height of AppBar
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
