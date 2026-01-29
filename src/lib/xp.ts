import { supabase } from "./supabase";

export type XpActionType =
  | "LOGIN"
  | "DAILY_LESSON_SKIP"
  | "TRADE_PRE"
  | "TRADE_POST"
  | "WEEKLY_LECTURE_NOTE";

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

    // The RPC returns a table/array of rows
    const result = data?.[0] || data;
    if (!result) return null;

    return {
      level: result.new_level,
      currentXp: result.new_current_xp,
      loginStreak: result.new_login_streak,
    };
  } catch (err) {
    console.error("Unexpected error during XP update:", err);
    return null;
  }
}
