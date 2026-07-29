CREATE OR REPLACE FUNCTION save_push_subscription(
  sub_endpoint text,
  sub_p256dh text,
  sub_auth text,
  sub_user_agent text
) RETURNS void AS $$
BEGIN
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
  VALUES (auth.uid(), sub_endpoint, sub_p256dh, sub_auth, sub_user_agent, now())
  ON CONFLICT (endpoint) DO UPDATE
  SET
    user_id = auth.uid(),
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
