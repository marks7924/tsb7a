import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/context/ThemeContext";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tsb7a.vercel.app"),
  title: "ترتيب حضور التسبحة لكنيسة أبي سيفين",
  description: "ترتيب حضور التسبحه لكنيسه ابي سيفين",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ترتيب حضور التسبحة لكنيسة أبي سيفين",
    description: "ترتيب حضور التسبحه لكنيسه ابي سيفين",
    url: "https://tsb7a.vercel.app",
    siteName: "كنيسة الشهيد العظيم أبي سيفين",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ترتيب حضور التسبحه لكنيسه ابي سيفين",
      },
    ],
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ترتيب حضور التسبحة لكنيسة أبي سيفين",
    description: "ترتيب حضور التسبحه لكنيسه ابي سيفين",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${plexArabic.variable} ${inter.variable}`}>
      <body className="min-h-screen font-sans antialiased flex flex-col selection:bg-[#10B981]/30 selection:text-white bg-[#F7F6F1] dark:bg-[#0B0C14] text-[#252922] dark:text-white">
        <ThemeProvider>
          <LanguageProvider initialLanguage="ar">
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
