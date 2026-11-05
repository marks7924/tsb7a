import { prisma } from "../src/lib/prisma";
import { normalizePhoneNumber, isValidPhone, convertArabicDigits } from "../src/lib/phone";
import { registerNewMember, linkExistingMember, adminGenerateNewPassword } from "../src/lib/services/accountService";
import { createSaturdaySession, markSaturdayAsOff, markAttendance } from "../src/lib/services/attendanceService";
import { recalculateMemberStats } from "../src/lib/streaks";
import { previewMerge, executeMemberMerge } from "../src/lib/services/mergeService";
import { reviewStreakResetRequest } from "../src/lib/services/resetService";
import { verifyPassword } from "../src/lib/auth";

async function runTestSuite() {
  console.log("=================================================");
  console.log("RUNNING CHURCH TASBEHA CRITICAL BUSINESS RULE TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Phone Normalization & Validation
    // -----------------------------------------------------------------
    console.log(">>> Test Group 1: Phone Normalization & Validation");
    const testCases = [
      { raw: "01012345678", expected: "+201012345678" },
      { raw: "011 9876 5432", expected: "+201198765432" },
      { raw: "00201212345678", expected: "+201212345678" },
      { raw: "201555554444", expected: "+201555554444" },
      { raw: "+201012345678", expected: "+201012345678" },
      { raw: "٠١٠١٢٣٤٥٦٧٨", expected: "+201012345678" }, // Arabic-Indic digits
    ];

    for (const tc of testCases) {
      const norm = normalizePhoneNumber(tc.raw);
      assert(norm === tc.expected, `Normalize '${tc.raw}' -> '${tc.expected}'`);
      assert(isValidPhone(norm), `Valid Egyptian phone: ${norm}`);
    }

    assert(!isValidPhone("01312345678"), "Invalid Egyptian mobile prefix 013 is rejected");
    assert(!isValidPhone("12345"), "Short phone is rejected");

    // -----------------------------------------------------------------
    // TEST 2: Member vs Account & Account Linking Flow
    // -----------------------------------------------------------------
    console.log("\n>>> Test Group 2: Member vs Account & Linking Flow");

    // Create a member in the attendance sheet WITHOUT login account
    const testPhone = "+201088776655";
    await prisma.member.deleteMany({ where: { phone: testPhone } });

    const attendanceMember = await prisma.member.create({
      data: {
        fullName: "عضو تجريبي أول",
        phone: testPhone,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    const hasAccountBefore = await prisma.account.findUnique({
      where: { memberId: attendanceMember.id },
    });
    assert(hasAccountBefore === null, "Member exists in attendance sheet without a login account");

    // Member signs up with their matching phone number -> Links account!
    const linkResult = await linkExistingMember({
      memberId: attendanceMember.id,
      phone: testPhone,
      email: "marco.samir@test.com",
      password: "SecretPassword123",
    });

    assert(linkResult.member.id === attendanceMember.id, "Account linked to existing Member ID");
    assert(linkResult.account.memberId === attendanceMember.id, "Account points to existing Member");

    const memberCount = await prisma.member.count({ where: { phone: testPhone } });
    assert(memberCount === 1, "No duplicate member record created upon registration");

    // -----------------------------------------------------------------
    // TEST 3: Admin Generate New Password
    // -----------------------------------------------------------------
    console.log("\n>>> Test Group 3: Admin Generate New Password");
    const adminMember = await prisma.member.findUnique({ where: { phone: "+201289738362" } });
    const genResult = await adminGenerateNewPassword(
      adminMember!.id,
      "ADMIN",
      "Fr/ Mosa",
      attendanceMember.id
    );

    assert(genResult.success === true, "Password generated successfully");
    assert(typeof genResult.generatedPassword === "string", "Generated password returned securely to admin");
    assert(genResult.generatedPassword.length >= 10, "Generated password meets complexity requirements");

    const updatedAccount = await prisma.account.findUnique({ where: { memberId: attendanceMember.id } });
    assert(updatedAccount!.passwordHash !== genResult.generatedPassword, "Password is NEVER stored in plaintext");
    const isNewPasswordValid = await verifyPassword(genResult.generatedPassword, updatedAccount!.passwordHash);
    assert(isNewPasswordValid === true, "New generated password verifies with bcrypt");

    const isOldPasswordValid = await verifyPassword("SecretPassword123", updatedAccount!.passwordHash);
    assert(isOldPasswordValid === false, "Previous password was invalidated");

    // -----------------------------------------------------------------
    // TEST 4: Saturday Session Constraints & OFF Saturdays
    // -----------------------------------------------------------------
    console.log("\n>>> Test Group 4: Saturday Sessions & OFF Days");
    const testSatDate = new Date("2026-12-05T00:00:00.000Z"); // Dec 5 2026 is a Saturday
    await prisma.saturdaySession.deleteMany({ where: { date: testSatDate } });

    const session1 = await createSaturdaySession({
      date: testSatDate,
      title: "تسبحة سبت تجريبي",
    });
    assert(session1.id !== undefined, "Saturday session created");

    let duplicateSessionRejected = false;
    try {
      await createSaturdaySession({
        date: testSatDate,
        title: "تسبحة مكررة لنفس السبت",
      });
    } catch {
      duplicateSessionRejected = true;
    }
    assert(duplicateSessionRejected, "Enforced at most one session per Saturday");

    // Mark Saturday as OFF
    const offSession = await markSaturdayAsOff({
      sessionId: session1.id,
      reason: "عيد الميلاد المجيد",
    });
    assert(offSession.status === "OFF", "Saturday marked as OFF");
    assert(offSession.offReason === "عيد الميلاد المجيد", "OFF reason recorded");

    // -----------------------------------------------------------------
    // TEST 5: Duplicate Account Merge (Union of Sessions, NOT Sum!)
    // -----------------------------------------------------------------
    console.log("\n>>> Test Group 5: Account Merge (Union of Sessions, NOT Sum!)");

    // Create 3 Saturday sessions for testing
    const testSats = [
      new Date("2026-11-07T00:00:00.000Z"),
      new Date("2026-11-14T00:00:00.000Z"),
      new Date("2026-11-21T00:00:00.000Z"),
    ];

    const testSessions: any[] = [];
    for (const dt of testSats) {
      await prisma.saturdaySession.deleteMany({ where: { date: dt } });
      const s = await createSaturdaySession({ date: dt, title: `Test Sat ${dt.toISOString()}` });
      testSessions.push(s);
    }

    // Create Account A and Account B
    await prisma.member.deleteMany({
      where: { phone: { in: ["+201099001122", "+201099001133"] } },
    });

    const memberA = await prisma.member.create({
      data: {
        fullName: "عضو تجريبي أ",
        phone: "+201099001122",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    const memberB = await prisma.member.create({
      data: {
        fullName: "عضو تجريبي ب",
        phone: "+201099001133",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    // Both attended the SAME 3 Saturday sessions
    for (const s of testSessions) {
      await prisma.attendance.create({
        data: { memberId: memberA.id, sessionId: s.id, status: "PRESENT" },
      });
      await prisma.attendance.create({
        data: { memberId: memberB.id, sessionId: s.id, status: "PRESENT" },
      });
    }

    const preview = await previewMerge(memberA.id, memberB.id);
    assert(preview.totalBeforeSum === 6, "Sum of attendances before merge is 6");
    assert(preview.uniqueSaturdaysUnionCount === 3, "Union of unique Saturday sessions is 3 (NOT 6!)");

    // Execute merge
    await executeMemberMerge({
      survivingMemberId: memberA.id,
      duplicateMemberId: memberB.id,
      adminId: adminMember!.id,
      adminName: "Admin Michael",
      adminRole: "ADMIN",
    });

    const attendancesAfterMerge = await prisma.attendance.findMany({
      where: { memberId: memberA.id, status: "PRESENT" },
    });
    assert(
      attendancesAfterMerge.length === 3,
      `After merge, Member A has exactly 3 attendances (Result: ${attendancesAfterMerge.length}, NOT 6!)`
    );

    const duplicateMemberAfter = await prisma.member.findUnique({ where: { id: memberB.id } });
    assert(duplicateMemberAfter?.status === "MERGED", "Duplicate member marked as MERGED (archived)");

    // -----------------------------------------------------------------
    // TEST 6: Authoritative Streak Engine & Provisional Option B
    // -----------------------------------------------------------------
    console.log("\n>>> Test Group 6: Streak Engine & Provisional Option B");

    // Clean up test sessions for fresh streak test
    await prisma.member.deleteMany({
      where: { phone: "+201077665544" },
    });

    const streakMember = await prisma.member.create({
      data: {
        fullName: "عضو تسلسل تجريبي",
        phone: "+201077665544",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    // Create 6 consecutive Saturdays
    const streakSessions: any[] = [];
    const baseDate = new Date("2026-07-04T00:00:00.000Z"); // July 4, 2026 is Saturday
    for (let i = 0; i < 6; i++) {
      const dt = new Date(baseDate);
      dt.setUTCDate(dt.getUTCDate() + i * 7);
      dt.setUTCHours(0, 0, 0, 0);

      await prisma.saturdaySession.deleteMany({ where: { date: dt } });
      const s = await prisma.saturdaySession.create({
        data: {
          date: dt,
          title: `Streak Session ${i + 1}`,
          status: "COMPLETED",
        },
      });
      streakSessions.push(s);
    }

    // Mark sessions 0, 1, 2, 3 as PRESENT -> Streak = 4 -> 1 Reward
    for (let i = 0; i < 4; i++) {
      await markAttendance({
        memberId: streakMember.id,
        sessionId: streakSessions[i].id,
        status: "PRESENT",
      });
    }

    let stats = await recalculateMemberStats(streakMember.id, 4);
    assert(stats.currentStreak === 4, `Official streak reached 4 (Result: ${stats.currentStreak})`);
    assert(stats.rewardsEarned === 1, `1 Milestone Reward issued at 4 consecutive attendances`);

    // Session 4 marked ABSENT -> Creates pending streak reset request
    await markAttendance({
      memberId: streakMember.id,
      sessionId: streakSessions[4].id,
      status: "ABSENT",
      actorId: adminMember!.id,
    });

    stats = await recalculateMemberStats(streakMember.id, 4);
    assert(stats.currentStreak === 4, "Absence does NOT immediately reset official streak (Preserved at 4)");
    assert(stats.hasPendingReset === true, "Member has pending streak reset request");

    // Member attends session 5 while reset request is pending -> Begins PROVISIONAL STREAK!
    await markAttendance({
      memberId: streakMember.id,
      sessionId: streakSessions[5].id,
      status: "PRESENT",
    });

    stats = await recalculateMemberStats(streakMember.id, 4);
    assert(stats.currentStreak === 4, "Official streak still preserved at 4");
    assert(stats.provisionalStreak === 1, "Post-absence attendance tracks as Provisional Streak = 1");
    assert(stats.rewardsEarned === 1, "No final rewards issued on unresolved provisional progress");

    // Case 6A: Admin approves the reset request -> Provisional streak becomes new official streak!
    const pendingReq = await prisma.streakResetRequest.findFirst({
      where: { memberId: streakMember.id, status: "PENDING" },
    });

    assert(pendingReq !== null, "Found pending streak reset request");

    // Verify that self-approval is blocked as required by rules
    let selfApprovalBlocked = false;
    try {
      await reviewStreakResetRequest({
        requestId: pendingReq!.id,
        decision: "APPROVED",
        reviewerId: adminMember!.id, // Same admin who requested it
        reviewerName: "Admin Michael",
        reviewerRole: "ADMIN",
      });
    } catch (e: any) {
      if (e.message === "CANNOT_APPROVE_SELF_REQUESTED") {
        selfApprovalBlocked = true;
      }
    }
    assert(selfApprovalBlocked, "Moderator/Admin who created the request CANNOT approve their own request");

    // Developer or second admin approves the request
    const devMember = await prisma.member.findUnique({ where: { phone: "+201203345435" } });
    await reviewStreakResetRequest({
      requestId: pendingReq!.id,
      decision: "APPROVED",
      reviewerId: devMember!.id,
      reviewerName: "Mark Samer",
      reviewerRole: "DEVELOPER",
    });

    stats = await recalculateMemberStats(streakMember.id, 4);
    assert(stats.currentStreak === 1, "Approved reset ends old streak; provisional streak becomes official = 1");
    assert(stats.longestStreak === 4, "Longest streak preserved at 4");
    assert(stats.rewardsEarned === 1, "Previously earned milestone reward was NEVER lost!");

    // -----------------------------------------------------------------
    // TEST 7: Role Management Hierarchy & Hidden Developer Role
    // -----------------------------------------------------------------
    console.log("\n>>> Test Group 7: Role Management Hierarchy & Hidden Developer Role");
    const { canManageRole } = await import("../src/lib/auth");

    // Admins can assign Admins and mods
    assert(canManageRole("ADMIN", "MEMBER", "ADMIN") === true, "Admin can assign ADMIN role to Member");
    assert(canManageRole("ADMIN", "MEMBER", "MODERATOR") === true, "Admin can assign MODERATOR role to Member");
    assert(canManageRole("ADMIN", "MODERATOR", "MEMBER") === true, "Admin can demote Moderator to Member");

    // Mods can assign Mods
    assert(canManageRole("MODERATOR", "MEMBER", "MODERATOR") === true, "Moderator can assign MODERATOR role to Member");
    assert(canManageRole("MODERATOR", "MODERATOR", "MEMBER") === true, "Moderator can demote Moderator to Member");
    assert(canManageRole("MODERATOR", "MEMBER", "ADMIN") === false, "Moderator CANNOT assign ADMIN role");
    assert(canManageRole("MODERATOR", "ADMIN", "MODERATOR") === false, "Moderator CANNOT modify Admin");

    // Developer is a hidden role: no one can give or take it
    assert(canManageRole("ADMIN", "DEVELOPER", "ADMIN") === false, "Admin CANNOT modify or take DEVELOPER role");
    assert(canManageRole("MODERATOR", "DEVELOPER", "MODERATOR") === false, "Moderator CANNOT modify or take DEVELOPER role");
    assert(canManageRole("ADMIN", "MEMBER", "DEVELOPER") === false, "Admin CANNOT assign DEVELOPER role");
    assert(canManageRole("MODERATOR", "MEMBER", "DEVELOPER") === false, "Moderator CANNOT assign DEVELOPER role");

    console.log("\n=================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    // Clean up temporary test data so tests never pollute the database
    const testPhones = ["+201088776655", "+201099001122", "+201099001133", "+201077665544"];
    const testMembers = await prisma.member.findMany({ where: { phone: { in: testPhones } } });
    for (const m of testMembers) {
      await prisma.attendance.deleteMany({ where: { memberId: m.id } });
      await prisma.memberStats.deleteMany({ where: { memberId: m.id } });
      await prisma.account.deleteMany({ where: { memberId: m.id } });
      await prisma.memberReward.deleteMany({ where: { memberId: m.id } });
      await prisma.memberAchievement.deleteMany({ where: { memberId: m.id } });
      await prisma.notification.deleteMany({ where: { memberId: m.id } });
      await prisma.streakResetRequest.deleteMany({ where: { memberId: m.id } });
      await prisma.activityLog.deleteMany({ where: { targetId: m.id } });
      await prisma.member.delete({ where: { id: m.id } });
    }
    await prisma.$disconnect();
  }
}

runTestSuite();
