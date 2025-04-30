import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Hypixel GTB Platform",
  description:
    "Interactive wordhint training platform for Hypixel Guess The Build players - Practice GTB word hints and track your stats across all game modes. Features hint training, stats dashboard, and mobile-friendly design.",
  openGraph: {
    title: "Hypixel GTB Platform",
    description:
      "Interactive wordhint training platform for Hypixel Guess The Build players - Practice GTB word hints and track your stats across all game modes. Features hint training, stats dashboard, and mobile-friendly design.",
    url: "https://gtb.zmh.me",
    type: "website",
  },
  keywords: [
    "Hypixel",
    "Build Battle",
    "Hint Practice",
    "Stats Dashboard",
    "GTB",
    "SPB",
    "Pro",
    "Teams",
    "Solo",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
