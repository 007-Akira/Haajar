import { createClient } from "npm:@supabase/supabase-js@2";

interface ClaimedDelivery {
  delivery_id: string;
  expo_push_token: string;
  notification_title: string;
  notification_body: string;
  notification_route: string;
}

const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const allowedRoutes = [
  new RegExp(`^/events/${uuid}/attendance/general/${uuid}$`),
  new RegExp(`^/events/${uuid}/groups/${uuid}/roll-calls/${uuid}$`),
  new RegExp(`^/events/${uuid}/groups/${uuid}/join-requests$`),
];

function isAllowedInternalRoute(route: string): boolean {
  return allowedRoutes.some((pattern) => pattern.test(route));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }
  const workerSecret = Deno.env.get("PUSH_WORKER_SECRET");
  if (
    !workerSecret ||
    request.headers.get("x-haajar-worker-secret") !== workerSecret
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey)
    return new Response("Server configuration unavailable", { status: 500 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("claim_push_deliveries", {
    batch_size: 100,
  });
  if (error)
    return Response.json(
      { processed: 0, status: "claim_failed" },
      { status: 500 },
    );

  let sent = 0;
  let failed = 0;
  for (const delivery of (data ?? []) as ClaimedDelivery[]) {
    if (!isAllowedInternalRoute(delivery.notification_route)) {
      failed++;
      await supabase.rpc("complete_push_delivery", {
        target_delivery_id: delivery.delivery_id,
        delivery_status: "failed",
        provider_ticket: null,
        error_code: "INVALID_NOTIFICATION_ROUTE",
      });
      continue;
    }
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: delivery.expo_push_token,
          title: delivery.notification_title,
          body: delivery.notification_body,
          data: { route: delivery.notification_route },
          sound: "default",
          channelId: "attendance",
        }),
      });
      const result = (await response.json()) as {
        data?: { status?: string; id?: string; details?: { error?: string } };
      };
      const ticket = result.data;
      const invalidToken = ticket?.details?.error === "DeviceNotRegistered";
      const status =
        response.ok && ticket?.status === "ok"
          ? "sent"
          : invalidToken
            ? "invalid_token"
            : "failed";
      await supabase.rpc("complete_push_delivery", {
        target_delivery_id: delivery.delivery_id,
        delivery_status: status,
        provider_ticket: ticket?.id ?? null,
        error_code:
          ticket?.details?.error ??
          (response.ok ? null : `HTTP_${response.status}`),
      });
      status === "sent" ? sent++ : failed++;
    } catch {
      failed++;
      await supabase.rpc("complete_push_delivery", {
        target_delivery_id: delivery.delivery_id,
        delivery_status: "failed",
        provider_ticket: null,
        error_code: "NETWORK_ERROR",
      });
    }
  }

  return Response.json({ processed: sent + failed, sent, failed });
});
