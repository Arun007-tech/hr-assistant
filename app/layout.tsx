import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppBar } from "@/components/AppBar";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { ChatBubble } from "@/components/ChatBubble";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { QuickAdd } from "@/components/QuickAdd";
import { QuickCaptureProvider } from "@/components/QuickCaptureProvider";
import "./globals.css";

// Applies the saved accent/style before first paint — same flash-prevention
// technique next-themes uses internally for dark/light, just for our two
// extra cosmetic axes it doesn't know about.
const APPEARANCE_SCRIPT = `
(function () {
  try {
    var accent = localStorage.getItem("hr-assistant:accent") || "sky";
    var style = localStorage.getItem("hr-assistant:style") || "charming";
    document.documentElement.setAttribute("data-accent", accent);
    document.documentElement.setAttribute("data-style", style);
  } catch (e) {}
})();
`;

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1420" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppearanceProvider>
            <CommandPaletteProvider>
              <QuickCaptureProvider>
                <AppBar />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
                  {children}
                </main>
              </QuickCaptureProvider>
            </CommandPaletteProvider>
            <ChatBubble />
            <QuickAdd />
          </AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
