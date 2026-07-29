import { createClient } from "npm:@supabase/supabase-js@^2";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function currentTokyoPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthText = String(month).padStart(2, "0");
  const lastDayText = String(lastDay).padStart(2, "0");

  return {
    periodStart: `${year}-${monthText}-01`,
    periodEnd: `${year}-${monthText}-${lastDayText}`,
    dueAt: `${year}-${monthText}-${lastDayText}T23:59:59+09:00`,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const configuredSecret = Deno.env.get("CRON_SECRET");
  const requestSecret = request.headers.get("x-cron-secret");
  if (!configuredSecret || requestSecret !== configuredSecret) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { success: false, error: "Function environment is incomplete" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: definition, error: definitionError } = await supabase
    .from("checkin_definitions")
    .select("id")
    .eq("key", "monthly_behavior_checkin")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (definitionError || !definition) {
    return jsonResponse(
      { success: false, error: "Active check-in definition not found" },
      500,
    );
  }

  const users: Array<{ id: string }> = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }
    users.push(
      ...data.users
        .filter((user) => !user.deleted_at)
        .map((user) => ({ id: user.id })),
    );
    if (data.users.length < perPage) break;
    page += 1;
  }

  const userIds = users.map((user) => user.id);
  const organizationByUser = new Map<string, string>();
  for (let offset = 0; offset < userIds.length; offset += 500) {
    const slice = userIds.slice(offset, offset + 500);
    const { data: memberships, error } = await supabase
      .from("org_students")
      .select("student_user_id, organization_id")
      .in("student_user_id", slice);
    if (!error) {
      for (const membership of memberships ?? []) {
        if (!organizationByUser.has(membership.student_user_id)) {
          organizationByUser.set(
            membership.student_user_id,
            membership.organization_id,
          );
        }
      }
    }
  }

  const period = currentTokyoPeriod();
  let createdOrUpdated = 0;
  for (let offset = 0; offset < users.length; offset += 500) {
    const rows = users.slice(offset, offset + 500).map((user) => ({
      definition_id: definition.id,
      user_id: user.id,
      organization_id: organizationByUser.get(user.id) ?? null,
      period_start: period.periodStart,
      period_end: period.periodEnd,
      due_at: period.dueAt,
    }));
    if (rows.length === 0) continue;

    const { error } = await supabase
      .from("checkin_assignments")
      .upsert(rows, {
        onConflict: "definition_id,user_id,period_start",
        ignoreDuplicates: true,
      });
    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }
    createdOrUpdated += rows.length;
  }

  return jsonResponse({
    success: true,
    periodStart: period.periodStart,
    processedUsers: createdOrUpdated,
  });
});
