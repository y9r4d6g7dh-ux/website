import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EasyLife", template: "%s · EasyLife" },
  description: "A calm, local-first daily planner. Less chaos. More life.",
  applicationName: "EasyLife",
  appleWebApp: { capable: true, title: "EasyLife", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#101113" },
    { media: "(prefers-color-scheme: light)", color: "#101113" },
  ],
};

// Applies the saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem("easylife-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
