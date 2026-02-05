import { createClient } from 'npm:@supabase/supabase-js@^2'
import webpush from 'npm:web-push@^3.6'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    console.log("=== Function invoked ===", req.method, req.url)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("=== Parsing request body ===")
        const { type, id, title, body, userIds } = await req.json()
        console.log("=== Received payload ===", { type, id, title, body, userIds })

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        )

        const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@fxjournal.com"
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")

        if (vapidPublicKey && vapidPrivateKey) {
            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
        } else {
            console.warn("VAPID keys missing!")
        }

        if (!type || !id || !body) {
            throw new Error("Missing required fields: type, id, body")
        }

        const url = `/messages/${type}/${id}`

        const notificationPayload = JSON.stringify({
            title: title || "FX Journal MVP",
            body,
            data: { url, type, id },
            icon: "/pwa-192x192.png",
        })

        console.log("=== Fetching subscriptions ===")
        let query = supabase.from("push_subscriptions").select("*")
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            query = query.in("user_id", userIds)
        }

        const { data: subscriptions, error: dbError } = await query

        if (dbError) throw new Error(`DB Error: ${dbError.message}`)

        console.log("=== Subscriptions found ===", subscriptions?.length ?? 0)

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ success: true, sentCount: 0, message: "No subscriptions found" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        console.log("=== Sending notifications ===")
        const results = await Promise.allSettled(
            subscriptions.map(async (sub: any) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                }
                try {
                    await webpush.sendNotification(pushSubscription, notificationPayload)
                    console.log("=== Sent to ===", sub.id)
                    return { status: "fulfilled", id: sub.id }
                } catch (err: any) {
                    console.error("=== Send error ===", err.statusCode, err.body)
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await supabase.from("push_subscriptions").delete().eq("id", sub.id)
                    }
                    throw err
                }
            })
        )

        const successCount = results.filter((r) => r.status === "fulfilled").length
        const failureCount = results.filter((r) => r.status === "rejected").length

        console.log("=== Result ===", { successCount, failureCount })

        return new Response(
            JSON.stringify({ success: true, sentCount: successCount, failureCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error: any) {
        console.error("=== Function error ===", error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
