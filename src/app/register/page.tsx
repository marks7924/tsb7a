"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import {
  UserPlus,
  Phone,
  User,
  KeyRound,
  Mail,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type RegisterStep =
  | "INITIAL_PHONE_CHECK"
  | "CONFIRM_EXISTING_MEMBER"
  | "NOT_EXISTING_BRANCH"
  | "ALT_PHONE_INPUT"
  | "CONTACT_ADMIN"
  | "ENTER_CREDENTIALS";

export default function RegisterPage() {
  const { language, t, dir } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<RegisterStep>("INITIAL_PHONE_CHECK");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [matchingMember, setMatchingMember] = useState<{ id: string; name: string } | null>(null);
  const [isLinkingExisting, setIsLinkingExisting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 1. Initial Phone Verification
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-phone", phone }),
      });

      const data = await res.json();
      if (!data.valid) {
        throw new Error(t("auth.invalidPhone"));
      }

      if (data.accountExists) {
        throw new Error(t("auth.phoneAlreadyLinked"));
      }

      if (data.memberExists) {
        setMatchingMember({ id: data.memberId, name: data.memberName });
        setStep("CONFIRM_EXISTING_MEMBER");
      } else {
        setStep("NOT_EXISTING_BRANCH");
      }
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // 2. Alternative Phone Verification
  const handleCheckAltPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-phone", phone: altPhone }),
      });

      const data = await res.json();
      if (!data.valid) {
        throw new Error(t("auth.invalidPhone"));
      }

      if (data.accountExists) {
        throw new Error(t("auth.phoneAlreadyLinked"));
      }

      if (data.memberExists) {
        setMatchingMember({ id: data.memberId, name: data.memberName });
        setPhone(data.normalizedPhone);
        setStep("CONFIRM_EXISTING_MEMBER");
      } else {
        setStep("CONTACT_ADMIN");
      }
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // 3. Finalize Account Creation or Linking
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(language === "ar" ? "كلمة المرور يجب أن لا تقل عن 6 أحرف" : "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (isLinkingExisting && matchingMember) {
        const res = await fetch("/api/auth/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "link-account",
            memberId: matchingMember.id,
            phone,
            password,
            gender,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      } else {
        const res = await fetch("/api/auth/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register-new",
            fullName,
            phone,
            password,
            gender,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || t("common.error"));
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
              {t("auth.registerTitle")}
            </h2>
            <p className="text-xs text-[#77786F]">
              {language === "ar"
                ? "التحقق من رقم الهاتف لربط حسابك بسجل حضورك وجوائزك السابقة"
                : "Phone verification to preserve historical attendance & rewards"}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FAF0F0] border border-[#8C2929]/20 flex items-center gap-2 text-[#8C2929] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-[#EEF5F1] border border-[#233D30]/20 flex items-center gap-2 text-[#233D30] text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t("auth.linkSuccessMsg")}</span>
            </div>
          )}

          {/* STEP 1: Initial Name & Phone */}
          {step === "INITIAL_PHONE_CHECK" && (
            <form onSubmit={handleCheckPhone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {t("common.name")}
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("auth.fullNamePlaceholder")}
                    className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {t("common.phone")}
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] focus:bg-white focus:outline-hidden"
                  />
                </div>
                <span className="text-[10px] text-[#77786F] mt-1 block">
                  {language === "ar"
                    ? "الرقم المصري المستخدم في كشف الحضور بالكنيسة"
                    : "Egyptian phone number used in church attendance"}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? t("common.loading") : t("common.next")}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>
          )}

          {/* STEP 2: Confirm Existing Member Match */}
          {step === "CONFIRM_EXISTING_MEMBER" && matchingMember && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#FAF5EA] border border-[#B58A3A]/40 space-y-1.5 text-center">
                <span className="inline-block p-1.5 rounded-full bg-[#B58A3A]/10 text-[#B58A3A]">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <p className="text-[11px] text-[#77786F]">{t("auth.linkFoundInfo")}</p>
                <h3 className="text-base font-bold text-[#252922]">
                  « {matchingMember.name} »
                </h3>
                <p className="text-xs font-semibold text-[#B58A3A]">
                  {t("auth.matchConfirmQuestion", { name: matchingMember.name })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkingExisting(true);
                    setFullName(matchingMember.name);
                    setStep("ENTER_CREDENTIALS");
                  }}
                  className="py-2 px-3 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {t("common.yes")}، {language === "ar" ? "أنا هو" : "Yes, that's me"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("CONTACT_ADMIN")}
                  className="py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] hover:bg-[#EFEDE5] text-[#252922] font-semibold text-xs transition-colors"
                >
                  {t("common.no")}، {language === "ar" ? "لست أنا" : "Not me"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Not Existing Branch */}
          {step === "NOT_EXISTING_BRANCH" && (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-lg bg-[#F7F6F1] border border-[#E4E0D5] space-y-1">
                <HelpCircle className="w-6 h-6 text-[#B58A3A] mx-auto" />
                <h3 className="text-xs font-bold text-[#252922]">
                  {t("auth.isNewToChurch")}
                </h3>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkingExisting(false);
                    setStep("ENTER_CREDENTIALS");
                  }}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white font-semibold text-xs transition-colors text-right ltr:text-left"
                >
                  {t("auth.isNewYes")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("ALT_PHONE_INPUT")}
                  className="w-full py-2.5 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] hover:bg-[#EFEDE5] text-[#252922] font-semibold text-xs transition-colors text-right ltr:text-left"
                >
                  {t("auth.isNewNo")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Alt Phone Input */}
          {step === "ALT_PHONE_INPUT" && (
            <form onSubmit={handleCheckAltPhone} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#F7F6F1] border border-[#E4E0D5] text-xs text-[#77786F]">
                {t("auth.altPhonePrompt")}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {t("auth.altPhoneTitle")}
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
                  <input
                    type="tel"
                    required
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="011XXXXXXXX"
                    className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("INITIAL_PHONE_CHECK")}
                  className="w-1/3 py-2 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-xs font-semibold text-[#77786F]"
                >
                  {t("common.back")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-[#233D30] text-white font-bold text-xs"
                >
                  {loading ? t("common.loading") : t("common.confirm")}
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Contact Admin */}
          {step === "CONTACT_ADMIN" && (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-lg bg-[#FAF0F0] border border-[#8C2929]/20 space-y-2">
                <AlertCircle className="w-6 h-6 text-[#8C2929] mx-auto" />
                <h3 className="text-xs font-bold text-[#8C2929]">
                  {t("auth.contactAdminTitle")}
                </h3>
                <p className="text-[11px] text-[#77786F] leading-relaxed">
                  {t("auth.contactAdminMsg")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep("INITIAL_PHONE_CHECK")}
                className="w-full py-2 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-xs font-semibold text-[#252922]"
              >
                {t("common.back")}
              </button>
            </div>
          )}

          {/* STEP 6: Enter Credentials */}
          {step === "ENTER_CREDENTIALS" && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#EEF5F1] border border-[#233D30]/20 text-xs text-[#233D30] font-medium">
                {isLinkingExisting
                  ? `${language === "ar" ? "ربط الحساب بالسجل المعتمد لـ:" : "Linking account to:"} ${fullName}`
                  : language === "ar"
                    ? "إنشاء حساب جديد كعضو تسبحة"
                    : "Creating new member record"}
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1.5">
                  {language === "ar" ? "الجنس / النوع" : "Gender"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("MALE")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${gender === "MALE"
                        ? "bg-[#233D30] text-white border-[#233D30] shadow-xs"
                        : "bg-white text-[#252922] border-[#E4E0D5] hover:bg-[#FAF5EA]"
                      }`}
                  >
                    <span>👦</span>
                    <span>{language === "ar" ? "ولد / شاب (ذكر)" : "Boy / Male"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("FEMALE")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${gender === "FEMALE"
                        ? "bg-[#233D30] text-white border-[#233D30] shadow-xs"
                        : "bg-white text-[#252922] border-[#E4E0D5] hover:bg-[#FAF5EA]"
                      }`}
                  >
                    <span>👧</span>
                    <span>{language === "ar" ? "بنت / شابة (أنثى)" : "Girl / Female"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#77786F] mt-1.5">
                  {language === "ar"
                    ? "سيتم تخصيص صورة رمزية مناسبة لك تلقائياً فور التسجيل، ويمكنك تعديلها لاحقاً."
                    : "A matching avatar will be assigned automatically upon sign up."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {t("common.password")}
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {t("auth.confirmPassword")}
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.confirmPassword")}
                    className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("INITIAL_PHONE_CHECK")}
                  className="w-1/3 py-2 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-xs font-semibold text-[#77786F]"
                >
                  {t("common.back")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{loading ? t("common.loading") : t("common.register")}</span>
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs text-[#77786F] pt-1">
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="font-bold text-[#233D30] hover:underline">
              {t("common.login")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
