"use server";

import { supabaseServerClient } from "@/supabase/supabaseServer";
import { cookies } from "next/headers";

export async function signOut(userId: string) {
  const supabase = await supabaseServerClient();

  try {
    // Update user's is_away status to true
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_away: true })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user status:", updateError);
      throw updateError;
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      throw error;
    }

    // Clear all cookies
    (
      await // Clear all cookies
      cookies()
    ).delete("sb-access-token");
    (await cookies()).delete("sb-refresh-token");

    return { success: true };
  } catch (error) {
    console.error("Signout process failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
