import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppBar } from "@/components/AppBar";
import { ChatBubble } from "@/components/ChatBubble";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HR Assistant",
  description: "JD analysis, Boolean search strings, candidate scoring, and screening prep",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "HR Assistant",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf9f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <CommandPaletteProvider>
          <AppBar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </CommandPaletteProvider>
        <ChatBubble />
      </body>
    </html>
  );
}
