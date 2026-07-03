import { createClient } from "@supabase/supabase-js";
import { e2eSupabase } from "./e2eMock";

const createSupabaseClient = () =>
  createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export const supabase: SupabaseClient =
  import.meta.env.VITE_E2E_MOCK === "1"
    ? (e2eSupabase as unknown as SupabaseClient)
    : createSupabaseClient();
