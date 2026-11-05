"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import { LogIn, KeyRound, Phone, AlertCircle, CheckSquare, Square } from "lucide-react";

export default function LoginPage() {
  const { language, t } = useLanguage();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tsb7a_remembered_phone");
      if (saved) {
        setPhone(saved);
      }
    } catch { }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: phone, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "INVALID_CREDENTIALS");
      }

      // Remember me handling
      try {
        if (rememberMe) {
          localStorage.setItem("tsb7a_remembered_phone", phone.trim());
        } else {
          localStorage.removeItem("tsb7a_remembered_phone");
        }
      } catch { }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      if (err.message === "INVALID_CREDENTIALS") {
        setError(language === "ar" ? "رقم الموبايل أو كلمة المرور غير صحيحة" : "Invalid phone number or password");
      } else if (err.message === "ACCOUNT_INACTIVE") {
        setError(language === "ar" ? "هذا الحساب غير نشط أو تم دمجه" : "Account is inactive or merged");
      } else {
        setError(err.message || t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1] text-[#252922]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E4E0D5] shadow-sm p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#233D30] text-[#B58A3A] mx-auto flex items-center justify-center border border-[#B58A3A]/40 shadow-xs">
              <CopticCross className="w-6 h-6" color="#B58A3A" />
            </div>
            <h2 className="text-xl font-bold text-[#233D30]">
              {t("auth.welcomeBack")}
            </h2>
            <p className="text-xs text-[#77786F]">
              {t("auth.enterCredentials")}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FAF0F0] border border-[#8C2929]/30 flex items-center gap-2 text-[#8C2929] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#252922] mb-1">
                {language === "ar" ? "رقم الموبايل (أو اسم المستخدم)" : "Phone Number (or Username)"}
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01289738362"
                  className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-xl border border-[#E4E0D5] bg-white text-[#252922] placeholder-[#A8A7A1] focus:border-[#233D30] focus:outline-hidden font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#252922]">
                  {t("common.password")}
                </label>
                <span className="text-[10px] text-[#B58A3A] font-semibold">
                  {language === "ar" ? "مؤقتاً: كلمة المرور = رقم الموبايل" : "Password = Phone number"}
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-xl border border-[#E4E0D5] bg-white text-[#252922] placeholder-[#A8A7A1] focus:border-[#233D30] focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#77786F]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-[#233D30] cursor-pointer"
                />
                <span className="font-medium">
                  {language === "ar" ? "تذكرني على هذا الجهاز" : "Remember me"}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#233D30] hover:bg-[#192D24] text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-[#B58A3A]" />
              <span>{loading ? t("common.loading") : t("auth.loginButton")}</span>
            </button>
          </form>

          <div className="text-center text-xs text-[#77786F] pt-2 border-t border-[#E4E0D5]">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="font-bold text-[#B58A3A] hover:underline">
              {t("common.register")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
