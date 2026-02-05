import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
console.log("VAPID_PUBLIC_KEY Status:", VAPID_PUBLIC_KEY ? `Present (length: ${VAPID_PUBLIC_KEY.length})` : "Missing");

if (!VAPID_PUBLIC_KEY) {
    console.error("VITE_VAPID_PUBLIC_KEY is not defined. Push subscription will fail.");
}

/**
 * URL Base64 to Uint8Array converter
 */
function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * ユーザーをWeb Push通知に登録する
 */
export async function subscribeToPush(userId: string) {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not supported");
    }
    if (!("PushManager" in window)) {
        throw new Error("Push API not supported");
    }
    if (!VAPID_PUBLIC_KEY) {
        throw new Error("VAPID Public Key not set");
    }

    // Service Worker登録確認
    const registration = await navigator.serviceWorker.ready;

    // 既存のSubscriptionを確認
    let subscription = await registration.pushManager.getSubscription();

    // なければ新規登録
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
    }

    // Supabaseに保存
    if (subscription) {
        const rawSub = JSON.parse(JSON.stringify(subscription));
        const endpoint = rawSub.endpoint;
        const p256dh = rawSub.keys?.p256dh;
        const auth = rawSub.keys?.auth;

        if (endpoint && p256dh && auth) {
            const { error } = await supabase
                .from("push_subscriptions")
                .upsert(
                    {
                        user_id: userId,
                        endpoint,
                        p256dh,
                        auth,
                        user_agent: navigator.userAgent,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "endpoint" }
                );

            if (error) {
                console.error("Failed to save subscription:", error);
                throw error;
            }
            return true;
        }
    }
    return false;
}
