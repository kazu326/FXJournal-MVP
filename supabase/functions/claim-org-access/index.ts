import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ClaimResult = {
  ok: boolean;
  created_org?: boolean;
  staff_added?: boolean;
  pending_owner?: boolean;
  pending_staff?: boolean;
  message?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // JWT検証（auth.getUser()で検証）
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const actorUserId = userRes.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // public.users から discord_id を取得
  const { data: me, error: meErr } = await admin
    .from("users")
    .select("id, discord_id")
    .eq("id", actorUserId)
    .maybeSingle();

  if (meErr || !me?.discord_id) {
    const res: ClaimResult = { ok: false, message: "public.users.discord_id not found for this user" };
    return json(res, 400);
  }

  const myDiscordId = String(me.discord_id);

  // ----- 1) Owner claim: pending_org_owners -> organizations -----
  let createdOrg = false;

  const { data: pendingOwner } = await admin
    .from("pending_org_owners")
    .select("discord_user_id, org_name, claimed_at")
    .eq("discord_user_id", myDiscordId)
    .maybeSingle();

  if (pendingOwner && !pendingOwner.claimed_at) {
    // 既にorganizationsがあるか（冪等）
    const { data: existingOrg } = await admin
      .from("organizations")
      .select("id")
      .eq("owner_user_id", actorUserId)
      .maybeSingle();

    if (!existingOrg) {
      const { error: orgErr } = await admin
        .from("organizations")
        .insert({ owner_user_id: actorUserId, name: pendingOwner.org_name });

      if (orgErr) {
        const res: ClaimResult = { ok: false, message: "Failed to create organization" };
        return json(res, 500);
      }
      createdOrg = true;
    }

    await admin
      .from("pending_org_owners")
      .update({ claimed_at: new Date().toISOString() })
      .eq("discord_user_id", myDiscordId);
  }

  // ----- 2) Staff claim: pending_org_staff -> org_staff -----
  let staffAdded = false;

  const { data: pendingStaff } = await admin
    .from("pending_org_staff")
    .select("discord_user_id, owner_discord_id, role, claimed_at")
    .eq("discord_user_id", myDiscordId)
    .maybeSingle();

  if (pendingStaff && !pendingStaff.claimed_at) {
    // owner_discord_id -> owner_user_uuid を引く（ownerがまだログインしてない場合は存在しない）
    const { data: ownerUser } = await admin
      .from("users")
      .select("id")
      .eq("discord_id", pendingStaff.owner_discord_id)
      .maybeSingle();

    if (!ownerUser) {
      const res: ClaimResult = {
        ok: true,
        pending_staff: true,
        message: "Owner has not logged in yet (cannot resolve organization). Try later.",
      };
      return json(res);
    }

    // owner_user_uuid -> organizations.id
    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("owner_user_id", ownerUser.id)
      .maybeSingle();

    if (!org) {
      const res: ClaimResult = {
        ok: true,
        pending_staff: true,
        message: "Organization not created yet. Owner must claim first.",
      };
      return json(res);
    }

    // org_staff upsert（冪等）
    const { error: staffErr } = await admin
      .from("org_staff")
      .upsert(
        { organization_id: org.id, staff_user_id: actorUserId, role: pendingStaff.role },
        { onConflict: "organization_id,staff_user_id" },
      );

    if (staffErr) {
      const res: ClaimResult = { ok: false, message: "Failed to add org_staff" };
      return json(res, 500);
    }

    staffAdded = true;

    await admin
      .from("pending_org_staff")
      .update({ claimed_at: new Date().toISOString() })
      .eq("discord_user_id", myDiscordId);
  }

  const res: ClaimResult = {
    ok: true,
    created_org: createdOrg,
    staff_added: staffAdded,
    pending_owner: !!pendingOwner && !pendingOwner?.claimed_at,
    pending_staff: !!pendingStaff && !pendingStaff?.claimed_at,
  };
  return json(res);
});
