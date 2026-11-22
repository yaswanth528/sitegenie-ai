// A FAKE Razorpay for tests: the few endpoints lib/razorpay.ts uses (orders, payments, capture), on 127.0.0.1.
// It checks the Basic-auth key pair like the real one (wrong keys -> 401) and keeps orders and payments in memory.
// Nothing here talks to the real Razorpay and no money exists.
import { createServer } from "node:http";

export const FAKE_KEY_ID = "rzp_test_FAKEKEYID000";
export const FAKE_KEY_SECRET = "fake-key-secret-not-real";

export async function startMockRazorpay() {
  const state = { orders: new Map(), payments: new Map(), calls: [], seq: 0 };
  const id = (p) => `${p}_FAKE${String(++state.seq).padStart(6, "0")}`;
  const expected = "Basic " + Buffer.from(`${FAKE_KEY_ID}:${FAKE_KEY_SECRET}`).toString("base64");
  const send = (res, status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      state.calls.push(`${req.method} ${url.pathname}`);
      if (req.headers.authorization !== expected) return send(res, 401, { error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } });
      const body = raw ? JSON.parse(raw) : {};
      let m;
      if (req.method === "POST" && url.pathname === "/v1/orders") {
        const order = { id: id("order"), amount: body.amount, amount_paid: 0, currency: body.currency, status: "created", receipt: body.receipt, notes: body.notes ?? {} };
        state.orders.set(order.id, order);
        return send(res, 200, order);
      }
      if (req.method === "GET" && (m = url.pathname.match(/^\/v1\/orders\/([^/]+)$/))) {
        const o = state.orders.get(decodeURIComponent(m[1]));
        return o ? send(res, 200, o) : send(res, 400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } });
      }
      if (req.method === "GET" && (m = url.pathname.match(/^\/v1\/payments\/([^/]+)$/))) {
        const p = state.payments.get(decodeURIComponent(m[1]));
        return p ? send(res, 200, p) : send(res, 400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } });
      }
      if (req.method === "POST" && (m = url.pathname.match(/^\/v1\/payments\/([^/]+)\/capture$/))) {
        const p = state.payments.get(decodeURIComponent(m[1]));
        if (!p) return send(res, 400, { error: { description: "The id provided does not exist" } });
        if (body.amount !== p.amount) return send(res, 400, { error: { description: "Capture amount must be equal to the amount authorized" } });
        p.status = "captured";
        p.captured = true;
        return send(res, 200, p);
      }
      send(res, 404, { error: { description: "not found" } });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;

  return {
    url,
    state,
    // The customer pays an order in the checkout window: the fake makes the payment (what Razorpay would do).
    pay(orderId, { amount, status = "captured", orderOverride } = {}) {
      const order = state.orders.get(orderId);
      const p = { id: id("pay"), order_id: orderOverride ?? orderId, amount: amount ?? order.amount, currency: "INR", status, captured: status === "captured" };
      state.payments.set(p.id, p);
      if (status === "captured") order.status = "paid";
      return p;
    },
    close: () => new Promise((r) => server.close(r)),
  };
}
