/**
 * Church Tasbeha Avatar Library
 * Local avatars stored in /public/avatars/
 */

export interface AvatarItem {
  id: string;
  nameAr: string;
  nameEn: string;
  category: "boy" | "girl" | "general";
  filename: string;
  url: string;
}

export const AVATAR_LIBRARY: AvatarItem[] = [
  // Boys
  { id: "boy-1", nameAr: "ولد ١", nameEn: "Boy 1", category: "boy", filename: "Boy (1).png", url: "/avatars/Boy (1).png" },
  { id: "boy-2", nameAr: "ولد ٢", nameEn: "Boy 2", category: "boy", filename: "Boy (2).png", url: "/avatars/Boy (2).png" },
  { id: "boy-3", nameAr: "ولد ٣", nameEn: "Boy 3", category: "boy", filename: "Boy (3).png", url: "/avatars/Boy (3).png" },
  { id: "boy-4", nameAr: "ولد ٤", nameEn: "Boy 4", category: "boy", filename: "Boy (4).png", url: "/avatars/Boy (4).png" },
  { id: "boy-5", nameAr: "ولد ٥", nameEn: "Boy 5", category: "boy", filename: "Boy (5).png", url: "/avatars/Boy (5).png" },
  { id: "boy-6", nameAr: "ولد ٦", nameEn: "Boy 6", category: "boy", filename: "Boy (6).png", url: "/avatars/Boy (6).png" },
  { id: "boy-7", nameAr: "ولد ٧", nameEn: "Boy 7", category: "boy", filename: "boy (7).png", url: "/avatars/boy (7).png" },

  // Girls
  { id: "girl-1", nameAr: "بنت ١", nameEn: "Girl 1", category: "girl", filename: "Girl (1).png", url: "/avatars/Girl (1).png" },
  { id: "girl-2", nameAr: "بنت ٢", nameEn: "Girl 2", category: "girl", filename: "Girl (2).png", url: "/avatars/Girl (2).png" },
  { id: "girl-3", nameAr: "بنت ٣", nameEn: "Girl 3", category: "girl", filename: "Girl (3).png", url: "/avatars/Girl (3).png" },
  { id: "girl-4", nameAr: "بنت ٤", nameEn: "Girl 4", category: "girl", filename: "Girl (4).png", url: "/avatars/Girl (4).png" },
  { id: "girl-5", nameAr: "بنت ٥", nameEn: "Girl 5", category: "girl", filename: "Girl (5).png", url: "/avatars/Girl (5).png" },
  { id: "girl-6", nameAr: "بنت ٦", nameEn: "Girl 6", category: "girl", filename: "Girl (6).png", url: "/avatars/Girl (6).png" },
  { id: "girl-7", nameAr: "بنت ٧", nameEn: "Girl 7", category: "girl", filename: "Girl (7).png", url: "/avatars/Girl (7).png" },

  // General / Church Youths
  { id: "boy-girl-1", nameAr: "مخدوم ١", nameEn: "Youth 1", category: "general", filename: "Boy-girl (1).png", url: "/avatars/Boy-girl (1).png" },
  { id: "boy-girl-2", nameAr: "مخدوم ٢", nameEn: "Youth 2", category: "general", filename: "Boy-girl (2).png", url: "/avatars/Boy-girl (2).png" },
];

export const BOY_AVATARS: AvatarItem[] = AVATAR_LIBRARY.filter((a) => a.category === "boy");
export const GIRL_AVATARS: AvatarItem[] = AVATAR_LIBRARY.filter((a) => a.category === "girl");

export function getRandomAvatarForGender(gender: "MALE" | "FEMALE"): AvatarItem {
  const pool = gender === "MALE" ? BOY_AVATARS : GIRL_AVATARS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function getDeterministicAvatarForGender(memberId?: string | null, gender?: string | null): AvatarItem {
  if (gender === "MALE" || gender === "FEMALE") {
    const pool = gender === "MALE" ? BOY_AVATARS : GIRL_AVATARS;
    if (!memberId) return pool[0];
    let hash = 5381;
    for (let i = 0; i < memberId.length; i++) {
      hash = (hash * 33) ^ memberId.charCodeAt(i);
    }
    const index = Math.abs(hash) % pool.length;
    return pool[index];
  }
  return getDeterministicDefaultAvatar(memberId);
}

/**
 * Deterministically assigns a default avatar to a member using their memberId.
 * Guarantees that the same user always receives the exact same default avatar
 * across all sessions, devices, and page refreshes.
 */
export function getDeterministicDefaultAvatar(memberId?: string | null): AvatarItem {
  if (!memberId) return AVATAR_LIBRARY[0];

  // Stable polynomial string hash (djb2)
  let hash = 5381;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash * 33) ^ memberId.charCodeAt(i);
  }

  const index = Math.abs(hash) % AVATAR_LIBRARY.length;
  return AVATAR_LIBRARY[index];
}

/**
 * Resolves avatar URL following the strict priority:
 * 1. Uploaded profile picture (data URL or external URL)
 * 2. User-selected local avatar (/avatars/...)
 * 3. Automatically assigned default avatar (deterministic by memberId)
 */
export function resolveAvatarUrl(memberId?: string | null, avatarUrl?: string | null): string {
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return avatarUrl.trim();
  }

  if (memberId) {
    return getDeterministicDefaultAvatar(memberId).url;
  }

  return AVATAR_LIBRARY[0].url;
}

/**
 * Check whether an avatarUrl is an uploaded custom file (e.g. data URL or blob)
 */
export function isCustomUploadedAvatar(avatarUrl?: string | null): boolean {
  if (!avatarUrl) return false;
  return avatarUrl.startsWith("data:") || avatarUrl.startsWith("blob:") || avatarUrl.startsWith("http");
}

/**
 * Check whether an avatarUrl is from the predefined local library
 */
export function isLibraryAvatar(avatarUrl?: string | null): boolean {
  if (!avatarUrl) return false;
  return avatarUrl.startsWith("/avatars/");
}

