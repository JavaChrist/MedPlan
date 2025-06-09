import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NotificationManager from "@/components/NotificationManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedPlan - Gestion intelligente des traitements",
  description: "Application PWA pour suivre et planifier efficacement vos traitements médicamenteux quotidiens",
  manifest: "/manifest.json",
  keywords: ["médicaments", "traitements", "rappels", "santé", "PWA"],
  authors: [{ name: "MedPlan Team" }],
  creator: "MedPlan",
  publisher: "MedPlan",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MedPlan",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen`}
      >
        <NotificationManager className="fixed top-4 left-4 right-4 z-50" />
        {children}
      </body>
    </html>
  );
}
