"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/context/ThemeContext";
import { CopticCross } from "./CopticCross";
import { MemberAvatar } from "./MemberAvatar";
import {
  Trophy,
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  QrCode,
  Users,
  RotateCcw,
  GitMerge,
  Award,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  ChevronDown,
  UserCheck,
  Globe,
  Sun,
  Moon,
} from "lucide-react";

export function Navbar() {
  const { language, setLanguage, t, dir } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();
    fetchNotifications();
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAdminDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setUser(data.user);
    } catch { }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch { }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch { }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: "ALL" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isModeratorOrAbove = user && ["MODERATOR", "ADMIN", "DEVELOPER"].includes(user.role);
  const isAdminOrAbove = user && ["ADMIN", "DEVELOPER"].includes(user.role);
  const isDeveloper = user && user.role === "DEVELOPER";

  // Clean member name without any trailing role suffixes
  const cleanDisplayName = user?.fullName
    ? user.fullName
      .replace(/\s*[\(\[].*?[\)\]]\s*$/, "")
      .replace(/\s*-\s*(أمين|خادم|مطور).*$/, "")
      .trim()
    : "";

  const isAdminActive = [
    "/admin",
    "/qr",
    "/developer",
  ].some((prefix) => pathname.startsWith(prefix));

  return (
    <header className="sticky top-0 z-40 bg-[#FAF5EA]/95 dark:bg-[#0B0C14]/90 backdrop-blur-md border-b border-[#E4E0D5] dark:border-[#1E2132]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[68px]">
          {/* Church Identity & Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FAF0F0]/50 dark:bg-[#141726] text-[#B58A3A] dark:text-[#F59E0B] flex items-center justify-center border border-[#B58A3A]/30 dark:border-[#F59E0B]/40 shadow-xs transition-transform group-hover:scale-105 shrink-0">
              <CopticCross className="w-4 h-4 sm:w-5 sm:h-5" color="#B58A3A" />
            </div>
            <div className="flex flex-col min-w-0 max-w-[150px] sm:max-w-[220px] md:max-w-[260px] xl:max-w-none">
              <span className="text-xs sm:text-sm font-bold text-[#252922] dark:text-white tracking-tight leading-tight truncate">
                {language === "en" ? "St. Philopateer (Abu Sefein)" : t("app.churchName")}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#77786F] dark:text-[#94A3B8] font-medium leading-none mt-0.5 truncate">
                {t("app.title")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
            {/* Leaderboard */}
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${pathname === "/"
                ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs border border-[#233D30] dark:border-[#373A56]"
                : "text-[#77786F] hover:text-[#233D30] hover:bg-[#EFEDE5] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#141726]"
                }`}
            >
              <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{t("nav.leaderboard")}</span>
            </Link>

            {/* User Dashboard */}
            {user && (
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${pathname === "/dashboard"
                  ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs border border-[#233D30] dark:border-[#373A56]"
                  : "text-[#77786F] hover:text-[#233D30] hover:bg-[#EFEDE5] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#141726]"
                  }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#10B981]" />
                <span>{t("nav.dashboard")}</span>
              </Link>
            )}

            {/* Attendance Sheet */}
            {isModeratorOrAbove && (
              <Link
                href="/attendance"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${pathname === "/attendance"
                  ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs border border-[#233D30] dark:border-[#373A56]"
                  : "text-[#77786F] hover:text-[#233D30] hover:bg-[#EFEDE5] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#141726]"
                  }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>{language === "en" ? "Attendance" : t("nav.attendanceSheet")}</span>
              </Link>
            )}

            {/* Saturday Sessions */}
            {isModeratorOrAbove && (
              <Link
                href="/sessions"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${pathname === "/sessions"
                  ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs border border-[#233D30] dark:border-[#373A56]"
                  : "text-[#77786F] hover:text-[#233D30] hover:bg-[#EFEDE5] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#141726]"
                  }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>{language === "ar" ? "التسبحة والسبوت" : "Sessions"}</span>
              </Link>
            )}

            {/* Moderator & Admin Unified Dropdown */}
            {isModeratorOrAbove && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${isAdminActive || adminDropdownOpen
                    ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs border border-[#233D30] dark:border-[#373A56]"
                    : "text-[#77786F] hover:text-[#233D30] hover:bg-[#EFEDE5] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#141726]"
                    }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>{language === "ar" ? "الإدارة" : "Management"}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${adminDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {adminDropdownOpen && (
                  <div
                    className={`absolute ${dir === "rtl" ? "left-0" : "right-0"
                      } mt-2 w-64 bg-[#121422] rounded-xl shadow-2xl border border-[#262A42] p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150`}
                  >
                    <div className="px-3 py-2 border-b border-[#262A42] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      {language === "ar" ? "أدوات الخدمة والرقابة" : "Service Tools"}
                    </div>

                    <div className="py-1 space-y-0.5">
                      {/* Scan Member Pass */}
                      <Link
                        href="/qr"
                        onClick={() => setAdminDropdownOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${pathname === "/qr"
                          ? "bg-[#1F243A] text-[#F59E0B]"
                          : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                          }`}
                      >
                        <QrCode className="w-4 h-4 text-[#F59E0B]" />
                        <span>{language === "ar" ? "مسح بطاقة حضور مخدوم (QR)" : "Scan Member QR Pass"}</span>
                      </Link>

                      {/* Members Directory & Roles */}
                      <Link
                        href="/admin/members"
                        onClick={() => setAdminDropdownOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${pathname.startsWith("/admin/members")
                          ? "bg-[#1F243A] text-white"
                          : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                          }`}
                      >
                        <UserCheck className="w-4 h-4 text-[#10B981]" />
                        <span>{t("nav.members")}</span>
                      </Link>

                      {isAdminOrAbove && (
                        <>
                          {/* Streak Resets */}
                          <Link
                            href="/admin/resets"
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${pathname.startsWith("/admin/resets")
                              ? "bg-[#1F243A] text-white"
                              : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                              }`}
                          >
                            <RotateCcw className="w-4 h-4 text-[#F59E0B]" />
                            <span>{t("nav.streakResets")}</span>
                          </Link>

                          {/* Merge Accounts */}
                          <Link
                            href="/admin/merges"
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${pathname.startsWith("/admin/merge")
                              ? "bg-[#1F243A] text-white"
                              : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                              }`}
                          >
                            <GitMerge className="w-4 h-4 text-[#A78BFA]" />
                            <span>{t("nav.mergeAccounts")}</span>
                          </Link>

                          {/* Milestone Rewards */}
                          <Link
                            href="/admin/rewards"
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${pathname.startsWith("/admin/rewards")
                              ? "bg-[#1F243A] text-white"
                              : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                              }`}
                          >
                            <Award className="w-4 h-4 text-[#F59E0B]" />
                            <span>{t("nav.rewards")}</span>
                          </Link>

                          {/* Reports & Audit */}
                          <Link
                            href="/admin/reports"
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${pathname.startsWith("/admin/reports")
                              ? "bg-[#1F243A] text-white"
                              : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                              }`}
                          >
                            <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                            <span>{t("nav.reports")}</span>
                          </Link>

                          {/* Analytics */}
                          <Link
                            href="/admin/analytics"
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${pathname.startsWith("/admin/analytics")
                              ? "bg-[#1F243A] text-white"
                              : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                              }`}
                          >
                            <BarChart3 className="w-4 h-4 text-[#38BDF8]" />
                            <span>{t("nav.analytics")}</span>
                          </Link>

                          {/* Platform Settings (Admin & Developer) */}
                          <Link
                            href="/admin/settings"
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold border-t border-[#262A42] mt-1 transition-colors ${pathname.startsWith("/admin/settings") || pathname.startsWith("/developer")
                              ? "bg-[#1F243A] text-white"
                              : "text-[#CBD5E1] hover:bg-[#181B2E] hover:text-white"
                              }`}
                          >
                            <Settings className="w-4 h-4 text-[#F59E0B]" />
                            <span>{t("nav.settings")}</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Action Tools: Language, Theme, Notifications, User, Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Dark / Light Mode Switcher Icon Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[#E4E0D5] dark:border-[#2B304A] bg-[#F7F6F1] dark:bg-[#161828] hover:bg-[#EFEDE5] dark:hover:bg-[#20243C] text-[#252922] dark:text-white transition-colors cursor-pointer shrink-0 shadow-xs"
              title={theme === "dark" ? (language === "ar" ? "تفعيل الوضع النهاري" : "Switch to Light Mode") : (language === "ar" ? "تفعيل الوضع الليلي" : "Switch to Dark Mode")}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[#F59E0B]" />
              ) : (
                <Moon className="w-4 h-4 text-[#38BDF8]" />
              )}
            </button>

            {/* Language Switcher (Desktop) */}
            <button
              type="button"
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-[#E4E0D5] dark:border-[#2B304A] bg-[#F7F6F1] dark:bg-[#161828] hover:bg-[#EFEDE5] dark:hover:bg-[#20243C] text-[#252922] dark:text-white transition-colors cursor-pointer shrink-0 shadow-xs"
              title="تغيير اللغة / Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="font-mono">{language === "ar" ? "EN" : "عربي"}</span>
            </button>

            {/* Notifications Dropdown */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-1.5 sm:p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#161828] transition-colors relative cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full ring-2 ring-[#0B0C14]" />
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className={`absolute ${dir === "rtl" ? "left-0" : "right-0"
                      } mt-2 w-72 sm:w-88 bg-[#121422] rounded-xl shadow-2xl border border-[#262A42] p-3.5 z-50`}
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#262A42]">
                      <h4 className="font-bold text-xs text-white">
                        {t("nav.notifications")}
                      </h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-[#F59E0B] font-semibold hover:underline"
                        >
                          {language === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-[#262A42]/60 mt-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#94A3B8]">
                          {t("common.noData")}
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={`py-2 px-1 text-xs ${n.isRead ? "opacity-60" : "bg-[#181B2E] rounded-lg font-semibold"
                              }`}
                          >
                            <p className="font-bold text-white">
                              {language === "ar" ? n.titleAr : n.titleEn}
                            </p>
                            <p className="text-[11px] text-[#94A3B8] mt-0.5">
                              {language === "ar" ? n.messageAr : n.messageEn}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop User Session Profile Pill */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2 pl-1 rtl:pl-0 rtl:pr-1 border-s border-[#262A42]">
                <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer" title="لوحة التحكم">
                  <MemberAvatar
                    memberId={user.memberId}
                    avatarUrl={user.avatarUrl}
                    fullName={user.fullName}
                    size="sm"
                  />
                  <div className="hidden md:flex flex-col text-right ltr:text-left">
                    <span className="text-xs font-bold text-white group-hover:text-[#F59E0B] truncate max-w-[130px] leading-tight">
                      {cleanDisplayName}
                    </span>
                    <span className="text-[10px] font-semibold text-[#F59E0B] leading-tight mt-0.5">
                      {t(`roles.${user.role}`)}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-[#FAF0F0]/10 text-[#EF4444] transition-colors cursor-pointer"
                  title={t("common.logout")}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#161828] transition-colors"
                >
                  {t("common.login")}
                </Link>
                <Link
                  href="/register"
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg bg-[#F59E0B] text-[#0B0C14] hover:bg-[#D97706] transition-colors shadow-xs"
                >
                  {t("common.register")}
                </Link>
              </div>
            )}

            {/* Animated Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden relative w-9 h-9 flex flex-col items-center justify-center rounded-xl border border-[#E4E0D5] dark:border-[#2B304A] bg-[#F7F6F1] dark:bg-[#161828] text-[#252922] dark:text-white transition-all cursor-pointer shadow-xs focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <div className="w-4.5 h-3.5 relative flex flex-col justify-between">
                <span
                  className={`h-0.5 w-full bg-current rounded-full transform transition-all duration-300 origin-center ${
                    mobileMenuOpen ? "rotate-45 translate-y-[6px]" : ""
                  }`}
                />
                <span
                  className={`h-0.5 w-full bg-current rounded-full transition-all duration-200 ${
                    mobileMenuOpen ? "opacity-0 scale-x-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`h-0.5 w-full bg-current rounded-full transform transition-all duration-300 origin-center ${
                    mobileMenuOpen ? "-rotate-45 -translate-y-[6px]" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (100% Light Mode & Dark Mode Compatible) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E4E0D5] dark:border-[#1E2132] bg-[#FAF5EA] dark:bg-[#0D0F1A] px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-xl">
          {/* Guest CTAs on Mobile */}
          {!user && (
            <div className="grid grid-cols-2 gap-2 p-1">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-white dark:bg-[#141624] text-[#252922] dark:text-white text-xs font-bold text-center shadow-xs"
              >
                {t("common.login")}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-[#F59E0B] text-[#0B0C14] text-xs font-bold text-center shadow-xs"
              >
                {t("common.register")}
              </Link>
            </div>
          )}

          {/* User Info on Mobile */}
          {user && (
            <div className="p-3 bg-white dark:bg-[#141624] rounded-2xl border border-[#E4E0D5] dark:border-[#262A42] flex items-center justify-between shadow-xs">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <MemberAvatar
                  memberId={user.memberId}
                  avatarUrl={user.avatarUrl}
                  fullName={user.fullName}
                  size="md"
                />
                <div>
                  <span className="font-bold text-xs text-[#252922] dark:text-white block">
                    {cleanDisplayName}
                  </span>
                  <span className="text-[11px] font-semibold text-[#B58A3A] dark:text-[#F59E0B]">
                    {t(`roles.${user.role}`)}
                  </span>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-[#EF4444] hover:underline flex items-center gap-1 font-semibold cursor-pointer p-1.5 rounded-lg hover:bg-[#FAF0F0] dark:hover:bg-[#EF4444]/15"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t("common.logout")}</span>
              </button>
            </div>
          )}

          {/* Primary Nav Links */}
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname === "/"
                  ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs"
                  : "text-[#77786F] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#161828] hover:text-[#252922] dark:hover:text-white"
              }`}
            >
              {t("nav.leaderboard")}
            </Link>

            {user && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs"
                    : "text-[#77786F] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#161828] hover:text-[#252922] dark:hover:text-white"
                }`}
              >
                {t("nav.dashboard")}
              </Link>
            )}

            {isModeratorOrAbove && (
              <>
                <Link
                  href="/attendance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    pathname === "/attendance"
                      ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs"
                      : "text-[#77786F] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#161828] hover:text-[#252922] dark:hover:text-white"
                  }`}
                >
                  {t("nav.attendanceSheet")}
                </Link>

                <Link
                  href="/sessions"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    pathname === "/sessions"
                      ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs"
                      : "text-[#77786F] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#161828] hover:text-[#252922] dark:hover:text-white"
                  }`}
                >
                  {language === "ar" ? "التسبحة والسبوت" : "Sessions & Saturdays"}
                </Link>

                <Link
                  href="/qr"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    pathname === "/qr"
                      ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs"
                      : "text-[#77786F] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#161828] hover:text-[#252922] dark:hover:text-white"
                  }`}
                >
                  {language === "ar" ? "مسح بطاقة حضور مخدوم (QR)" : "Scan Member QR Pass"}
                </Link>

                <Link
                  href="/admin/members"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    pathname.startsWith("/admin/members")
                      ? "bg-[#233D30] text-white dark:bg-[#1E2238] dark:text-white shadow-xs"
                      : "text-[#77786F] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#161828] hover:text-[#252922] dark:hover:text-white"
                  }`}
                >
                  {t("nav.members")}
                </Link>
              </>
            )}

            {isAdminOrAbove && (
              <div className="pt-2 border-t border-[#E4E0D5] dark:border-[#1E2132] space-y-1">
                <span className="text-[10px] font-bold text-[#77786F] dark:text-[#94A3B8] uppercase px-3 block">
                  {language === "ar" ? "الإدارة والرقابة" : "Administration"}
                </span>

                <Link
                  href="/admin/resets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-lg text-xs font-semibold text-[#77786F] dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#161828]"
                >
                  {t("nav.streakResets")}
                </Link>

                <Link
                  href="/admin/merges"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-lg text-xs font-semibold text-[#77786F] dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#161828]"
                >
                  {t("nav.mergeAccounts")}
                </Link>

                <Link
                  href="/admin/rewards"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-lg text-xs font-semibold text-[#77786F] dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#161828]"
                >
                  {t("nav.rewards")}
                </Link>

                <Link
                  href="/admin/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-lg text-xs font-semibold text-[#77786F] dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#161828]"
                >
                  {t("nav.reports")}
                </Link>

                <Link
                  href="/admin/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-lg text-xs font-semibold text-[#77786F] dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#161828]"
                >
                  {t("nav.analytics")}
                </Link>

                <Link
                  href="/admin/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-lg text-xs font-semibold text-[#77786F] dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#161828]"
                >
                  {t("nav.settings")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Footer: Theme & Language Toggle */}
          <div className="pt-3 mt-3 border-t border-[#E4E0D5] dark:border-[#1E2132] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 py-2.5 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#2B304A] bg-white dark:bg-[#161828] text-[#252922] dark:text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4 text-[#F59E0B]" />
                  <span>{language === "ar" ? "الوضع الفاتح" : "Light Mode"}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#38BDF8]" />
                  <span>{language === "ar" ? "الوضع الليلي" : "Dark Mode"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="flex-1 py-2.5 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#2B304A] bg-white dark:bg-[#161828] text-[#252922] dark:text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Globe className="w-4 h-4 text-[#F59E0B]" />
              <span>{language === "ar" ? "English" : "العربية"}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
