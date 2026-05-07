function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function onRequestGet() {
  // Minimal stub for demo: UI currently loads seed aggregates from /public/data/*.
  // This endpoint is reserved for server-side aggregation when we add persistence (D1/KV).
  return jsonResponse({ ok: true, message: "Use /data/dashboard.json for demo seed." });
}

