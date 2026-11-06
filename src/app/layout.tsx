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
  title: "منصة تسبحة الكنيسة | Church Tasbeha Attendance & Rewards",
  description: "نظام إدارة الحضور الأسبوعي والمكافآت لتسبحة الكنيسة القبطية الأرثوذكسية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${plexArabic.variable} ${inter.variable}`}>
      <body className="min-h-screen font-sans antialiased flex flex-col selection:bg-[#10B981]/30 selection:text-white bg-[#0B0C14] text-white">
        <ThemeProvider>
          <LanguageProvider initialLanguage="ar">
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
