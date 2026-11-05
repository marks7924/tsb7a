import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BOY_AVATARS, GIRL_AVATARS } from "../src/lib/avatars";

const prisma = new PrismaClient();

// Helper to pick random avatar from pool
function getRandomAvatar(gender: "M" | "F") {
  const pool = gender === "M" ? BOY_AVATARS : GIRL_AVATARS;
  return pool[Math.floor(Math.random() * pool.length)].url;
}

async function main() {
  console.log("Seeding real church database with all scores = 0 and M/F profile pictures...");

  // 1. System Settings
  const settings = [
    { key: "church_name_ar", value: "كنيسة الشهيد العظيم أبي سيفين" },
    { key: "church_name_en", value: "St. Philopateer Mercurius (Abu Sefein) Church" },
    { key: "timezone", value: "Africa/Cairo" },
    { key: "default_reward_threshold", value: "4" },
    { key: "session_start_time", value: "19:00" },
    { key: "session_end_time", value: "23:00" },
    { key: "qr_expiry_minutes", value: "180" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: { key: s.key, value: s.value },
      update: { value: s.value },
    });
  }

  // 2. Achievements Catalog
  const achievements = [
    {
      key: "FIRST_ATTENDANCE",
      titleEn: "First Step",
      titleAr: "الخطوة الأولى",
      descriptionEn: "Attended your first church Tasbeha session",
      descriptionAr: "حضور أول تسبحة بالكنيسة",
      badgeColor: "#b38938",
      criteriaType: "TOTAL_ATTENDANCE",
      criteriaValue: 1,
    },
    {
      key: "STREAK_4",
      titleEn: "Faithful Pilgrim (4 Weeks)",
      titleAr: "خادم التسبحة (4 أسابيع متتالية)",
      descriptionEn: "Maintained a consecutive 4-week attendance streak",
      descriptionAr: "المواظبة على حضور 4 سبوت متتالية",
      badgeColor: "#26593a",
      criteriaType: "STREAK",
      criteriaValue: 4,
    },
    {
      key: "STREAK_8",
      titleEn: "Pillar of Praise (8 Weeks)",
      titleAr: "عمود التسبيح (8 أسابيع متتالية)",
      descriptionEn: "Maintained a consecutive 8-week attendance streak",
      descriptionAr: "المواظبة على حضور 8 سبوت متتالية",
      badgeColor: "#8c6720",
      criteriaType: "STREAK",
      criteriaValue: 8,
    },
    {
      key: "STREAK_12",
      titleEn: "Choir of Angels (12 Weeks)",
      titleAr: "خورس الملائكة (12 أسبوعاً متتالياً)",
      descriptionEn: "Maintained a consecutive 12-week attendance streak",
      descriptionAr: "المواظبة على حضور 12 أسبوعاً متتالياً",
      badgeColor: "#1b2c20",
      criteriaType: "STREAK",
      criteriaValue: 12,
    },
    {
      key: "ATTENDANCE_10",
      titleEn: "Bronze Devotion (10 Sessions)",
      titleAr: "وسام الوفاء البرونزي (10 سبوت)",
      descriptionEn: "Reached 10 total Tasbeha sessions attended",
      descriptionAr: "إجمالي حضور 10 سبوت في التسبحة",
      badgeColor: "#a3703c",
      criteriaType: "TOTAL_ATTENDANCE",
      criteriaValue: 10,
    },
    {
      key: "ATTENDANCE_25",
      titleEn: "Silver Devotion (25 Sessions)",
      titleAr: "وسام الوفاء الفضي (25 سبتاً)",
      descriptionEn: "Reached 25 total Tasbeha sessions attended",
      descriptionAr: "إجمالي حضور 25 سبتاً في التسبحة",
      badgeColor: "#75838a",
      criteriaType: "TOTAL_ATTENDANCE",
      criteriaValue: 25,
    },
    {
      key: "ATTENDANCE_50",
      titleEn: "Golden Devotion (50 Sessions)",
      titleAr: "وسام الوفاء الذهبي (50 سبتاً)",
      descriptionEn: "Reached 50 total Tasbeha sessions attended",
      descriptionAr: "إجمالي حضور 50 سبتاً في التسبحة",
      badgeColor: "#b38938",
      criteriaType: "TOTAL_ATTENDANCE",
      criteriaValue: 50,
    },
    {
      key: "FIRST_REWARD",
      titleEn: "First Honor",
      titleAr: "التكريم الأول",
      descriptionEn: "Earned your first Tasbeha milestone reward",
      descriptionAr: "استحقاق أول هدية تشجيعية في التسبحة",
      badgeColor: "#25392b",
      criteriaType: "REWARD",
      criteriaValue: 1,
    },
  ];

  for (const a of achievements) {
    await prisma.achievementType.upsert({
      where: { key: a.key },
      create: a,
      update: a,
    });
  }

  // 3. Default Reward Type
  await prisma.rewardType.upsert({
    where: { id: "default_reward_type" },
    create: {
      id: "default_reward_type",
      name: "4-Week Milestone Gift",
      nameAr: "هدية التميز (كل 4 سبوت)",
      description: "Church commemorative gift or spiritual book",
      threshold: 4,
    },
    update: {},
  });

  // 4. Clean out all previous records & reset all scores
  console.log("Cleaning database to reset all scores, attendances, and rewards to 0...");
  await prisma.attendance.deleteMany({});
  await prisma.memberReward.deleteMany({});
  await prisma.memberAchievement.deleteMany({});
  await prisma.streakResetRequest.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.memberStats.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.saturdaySession.deleteMany({});
  await prisma.activityLog.deleteMany({});

  // 5. Members List with exact Gender (M / F)
  const realMembersList: Array<{
    fullName: string;
    rawPhone: string;
    normalizedPhone: string;
    role: "ADMIN" | "MODERATOR" | "DEVELOPER" | "MEMBER";
    gender: "M" | "F";
  }> = [
      { fullName: "Fr/ Mosa", rawPhone: "01289738362", normalizedPhone: "+201289738362", role: "ADMIN", gender: "M" },
      { fullName: "M/ Mina fawzy", rawPhone: "201144610158", normalizedPhone: "+201144610158", role: "ADMIN", gender: "M" },
      { fullName: "M/kerolos Emad", rawPhone: "01211031467", normalizedPhone: "+201211031467", role: "MODERATOR", gender: "M" },
      { fullName: "M/Mina mourise", rawPhone: "01208375881", normalizedPhone: "+201208375881", role: "MODERATOR", gender: "M" },
      { fullName: "M/Remon Hany", rawPhone: "01228152466", normalizedPhone: "+201228152466", role: "MODERATOR", gender: "M" },
      { fullName: "Mark Samer", rawPhone: "01203345435", normalizedPhone: "+201203345435", role: "DEVELOPER", gender: "M" },
      { fullName: "Abanob Tamer", rawPhone: "01277388827", normalizedPhone: "+201277388827", role: "MEMBER", gender: "M" },
      { fullName: "David Gerges", rawPhone: "01282242716", normalizedPhone: "+201282242716", role: "MEMBER", gender: "M" },
      { fullName: "Fady Sameh", rawPhone: "01229620119", normalizedPhone: "+201229620119", role: "MEMBER", gender: "M" },
      { fullName: "Jounir Amir", rawPhone: "01210208032", normalizedPhone: "+201210208032", role: "MEMBER", gender: "F" },
      { fullName: "Joyce Tareq", rawPhone: "01013100396", normalizedPhone: "+201013100396", role: "MEMBER", gender: "F" },
      { fullName: "Mariam Nader", rawPhone: "01220910685", normalizedPhone: "+201220910685", role: "MEMBER", gender: "F" },
      { fullName: "Marina Nader", rawPhone: "01276483093", normalizedPhone: "+201276483093", role: "MEMBER", gender: "F" },
      { fullName: "Micheal Magdy", rawPhone: "01279589477", normalizedPhone: "+201279589477", role: "MEMBER", gender: "M" },
      { fullName: "Bishoy Magdy", rawPhone: "01211702807", normalizedPhone: "+201211702807", role: "MEMBER", gender: "M" },
      { fullName: "Dany George", rawPhone: "01276754340", normalizedPhone: "+201276754340", role: "MEMBER", gender: "M" },
      { fullName: "Felopateer", rawPhone: "01285547148", normalizedPhone: "+201285547148", role: "MEMBER", gender: "M" },
      { fullName: "Mary", rawPhone: "01202219918", normalizedPhone: "+201202219918", role: "MEMBER", gender: "F" },
    ];

  console.log("Creating members with random gender-matched avatars and initial password = phone...");
  for (const m of realMembersList) {
    const randomAvatar = getRandomAvatar(m.gender);
    // User password initially = their phone number (e.g. 01289738362)
    const phonePasswordHash = await bcrypt.hash(m.rawPhone, 10);

    const member = await prisma.member.create({
      data: {
        fullName: m.fullName,
        phone: m.normalizedPhone,
        role: m.role,
        avatarUrl: randomAvatar,
        status: "ACTIVE",
      },
    });

    // Login account with password = phone number
    await prisma.account.create({
      data: {
        memberId: member.id,
        email: m.normalizedPhone,
        passwordHash: phonePasswordHash,
        status: "ACTIVE",
      },
    });

    // ALL SCORES SET TO 0!
    await prisma.memberStats.create({
      data: {
        memberId: member.id,
        currentStreak: 0,
        longestStreak: 0,
        provisionalStreak: 0,
        hasPendingReset: false,
        totalAttendance: 0,
        annualAttendance: 0,
        rewardsEarned: 0,
        rewardsDelivered: 0,
        nextRewardProgress: 0,
      },
    });
  }

  // 6. Active Saturday Session for Today
  const today = new Date();
  const d = new Date(today);
  const dayOfWeek = d.getDay();
  const diff = (dayOfWeek + 1) % 7;
  d.setDate(d.getDate() - diff);
  d.setUTCHours(0, 0, 0, 0);

  await prisma.saturdaySession.create({
    data: {
      date: d,
      title: `تسبحة سبت ${d.toISOString().split("T")[0]}`,
      status: "ACTIVE",
      qrActive: true,
      qrToken: "session_active_qr_token_abu_sefein_2026",
      qrExpiresAt: new Date(Date.now() + 4 * 3600 * 1000),
    },
  });

  console.log("All scores set to 0. Members seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
