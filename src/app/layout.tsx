import type { Metadata } from "next";
import ThemeRegistry from "@/components/layout/ThemeRegistry";
import MainLayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "Email Outreach & Intent Classification",
  description: "Internal B2B sales outreach and intent classification platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
