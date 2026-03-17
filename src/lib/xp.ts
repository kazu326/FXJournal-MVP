import { supabase } from "./supabase";

// DB の xp_action_type ENUM と一致させる
export type XpActionType =
  | "LOGIN"
  | "DAILY_LESSON_SKIP"
  | "TRADE_PRE"
  | "TRADE_POST"
  | "WEEKLY_LECTURE_NOTE"
  | "SLIDE_COMPLETE";

export interface XpUpdateResult {
  level: number;
  currentXp: number;
  loginStreak: number;
}

export async function updateXpAndStreak(
  action: XpActionType
): Promise<XpUpdateResult | null> {
  try {
    const { data, error } = await supabase.rpc("update_xp_and_streak", {
      p_action: action,
    });

    if (error) {
      console.error("XP/Streak update error:", error);
      return null;
    }

    // RPC は TABLE型（配列）を返す
    const result = data?.[0] || data;
    if (!result) return null;

    return {
      level: result.level,
      currentXp: result.current_xp,
      loginStreak: result.login_streak,
    };
  } catch (err) {
    console.error("Unexpected error during XP update:", err);
    return null;
  }
}
