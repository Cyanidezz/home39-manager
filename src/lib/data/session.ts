import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Server-component helper: returns the Supabase client and signed-in user, or redirects. */
export async function requireUser(redirectTo = "/login") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(redirectTo);

  return { supabase, user };
}
