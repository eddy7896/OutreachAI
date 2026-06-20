import type { Metadata } from "next";
import ThemeRegistry from "@/components/layout/ThemeRegistry";
import MainLayout from "@/components/layout/MainLayout";

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
          <MainLayout>
            {children}
          </MainLayout>
        </ThemeRegistry>
      </body>
    </html>
  );
}
