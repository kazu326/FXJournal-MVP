import { createClient } from "npm:@supabase/supabase-js@^2";
import webpush from "npm:web-push@^3.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type NotificationType = "announcements" | "support" | "monthly_feedback";

type NotificationTarget = {
  title: string;
  body: string;
  url: string;
  userIds: string[] | null;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorization = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        { success: false, error: "Function environment is incomplete" },
        500,
      );
    }
    if (!authorization.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const requestBody = (await req.json()) as {
      type?: NotificationType;
      id?: string;
    };
    const { type, id } = requestBody;
    if (
      !type ||
      !id ||
      !["announcements", "support", "monthly_feedback"].includes(type)
    ) {
      return jsonResponse(
        { success: false, error: "Invalid notification target" },
        400,
      );
    }

    const [{ data: platformAdmin }, { data: profile }] = await Promise.all([
      serviceClient
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      serviceClient
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const isGlobalStaff =
      Boolean(platformAdmin?.user_id) ||
      ["admin", "platform_admin", "teacher"].includes(profile?.role ?? "");

    let target: NotificationTarget;

    if (type === "announcements") {
      if (!isGlobalStaff) {
        return jsonResponse({ success: false, error: "Forbidden" }, 403);
      }
      const { data: announcement, error } = await serviceClient
        .from("announcements")
        .select("id, title, body, published_at")
        .eq("id", id)
        .not("published_at", "is", null)
        .single();
      if (error || !announcement) {
        return jsonResponse(
          { success: false, error: "Published announcement not found" },
          404,
        );
      }
      target = {
        title: announcement.title,
        body: announcement.body,
        url: `/messages/announcements/${announcement.id}`,
        userIds: null,
      };
    } else if (type === "monthly_feedback") {
      const { data: feedback, error } = await serviceClient
        .from("monthly_feedback")
        .select("id, user_id, summary, status")
        .eq("id", id)
        .eq("status", "published")
        .single();
      if (error || !feedback) {
        return jsonResponse(
          { success: false, error: "Published feedback not found" },
          404,
        );
      }

      if (!isGlobalStaff) {
        const { data: studentMembership } = await serviceClient
          .from("org_students")
          .select("organization_id")
          .eq("student_user_id", feedback.user_id)
          .maybeSingle();
        const { data: staffMembership } = await serviceClient
          .from("org_staff")
          .select("staff_user_id")
          .eq("staff_user_id", user.id)
          .eq("organization_id", studentMembership?.organization_id ?? "")
          .maybeSingle();
        if (!staffMembership) {
          return jsonResponse({ success: false, error: "Forbidden" }, 403);
        }
      }

      target = {
        title: "今月のフィードバック",
        body: feedback.summary,
        url: `/messages?feedback=${feedback.id}`,
        userIds: [feedback.user_id],
      };
    } else {
      const { data: message, error: messageError } = await serviceClient
        .from("support_messages")
        .select("id, thread_id, sender_user_id, sender_kind, body")
        .eq("id", id)
        .single();
      if (messageError || !message || message.sender_user_id !== user.id) {
        return jsonResponse(
          { success: false, error: "Support message not found" },
          404,
        );
      }

      const { data: thread, error: threadError } = await serviceClient
        .from("support_threads")
        .select("id, member_user_id, organization_id")
        .eq("id", message.thread_id)
        .single();
      if (threadError || !thread) {
        return jsonResponse(
          { success: false, error: "Support thread not found" },
          404,
        );
      }

      let recipientIds: string[] = [];
      if (message.sender_kind === "member") {
        if (thread.member_user_id !== user.id) {
          return jsonResponse({ success: false, error: "Forbidden" }, 403);
        }
        if (thread.organization_id) {
          const [{ data: staffRows }, { data: organization }] =
            await Promise.all([
              serviceClient
                .from("org_staff")
                .select("staff_user_id")
                .eq("organization_id", thread.organization_id),
              serviceClient
                .from("organizations")
                .select("owner_user_id")
                .eq("id", thread.organization_id)
                .maybeSingle(),
            ]);
          recipientIds = [
            ...(staffRows ?? []).map((row) => row.staff_user_id),
            ...(organization?.owner_user_id
              ? [organization.owner_user_id]
              : []),
          ];
        }
      } else {
        if (!isGlobalStaff) {
          const { data: staffMembership } = await serviceClient
            .from("org_staff")
            .select("staff_user_id")
            .eq("staff_user_id", user.id)
            .eq("organization_id", thread.organization_id ?? "")
            .maybeSingle();
          if (!staffMembership) {
            return jsonResponse({ success: false, error: "Forbidden" }, 403);
          }
        }
        recipientIds = [thread.member_user_id];
      }

      target = {
        title: "習慣サポート",
        body: message.body,
        url: `/messages?support=${thread.id}`,
        userIds: Array.from(new Set(recipientIds)),
      };
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublicKey || !vapidPrivateKey) {
      return jsonResponse(
        { success: false, error: "VAPID keys are missing" },
        500,
      );
    }
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@fxjournal.com",
      vapidPublicKey,
      vapidPrivateKey,
    );

    let subscriptionQuery = serviceClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (target.userIds) {
      if (target.userIds.length === 0) {
        return jsonResponse({ success: true, sentCount: 0, failureCount: 0 });
      }
      subscriptionQuery = subscriptionQuery.in("user_id", target.userIds);
    }

    const { data: subscriptions, error: subscriptionError } =
      await subscriptionQuery;
    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    const notificationPayload = JSON.stringify({
      title: target.title,
      body:
        target.body.length > 160
          ? `${target.body.slice(0, 157)}...`
          : target.body,
      data: { url: target.url, type, id },
      icon: "/pwa-192x192.png",
    });

    const results = await Promise.allSettled(
      (subscriptions ?? []).map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            notificationPayload,
          );
        } catch (error: unknown) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? Number(error.statusCode)
              : null;
          if (statusCode === 404 || statusCode === 410) {
            await serviceClient
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
          }
          throw error;
        }
      }),
    );

    return jsonResponse({
      success: true,
      sentCount: results.filter((result) => result.status === "fulfilled")
        .length,
      failureCount: results.filter((result) => result.status === "rejected")
        .length,
    });
  } catch (error) {
    console.error("push-notification failed", error);
    return jsonResponse(
      { success: false, error: errorMessage(error) },
      500,
    );
  }
});
