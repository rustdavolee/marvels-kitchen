"use client";

import { useState } from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/api";

type AdminOrderItem = {
  item_name: string;
  quantity: number;
  unit_price_ngn: number;
  line_total_ngn: number;
};

type AdminOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  fulfillment: "Pickup" | "Delivery";
  delivery_address?: string | null;
  preferred_swallow?: string | null;
  notes?: string | null;
  status: string;
  subtotal_ngn: number;
  created_at: string;
  items: AdminOrderItem[];
};

const statuses = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export function AdminOrders() {
  const [apiKey, setApiKey] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadOrders(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/orders`, {
        headers: { Accept: "application/json", "x-admin-api-key": apiKey },
        cache: "no-store",
      });
      const data = (await response.json()) as { orders?: AdminOrder[]; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? data.message ?? `Could not load orders (${response.status}).`);
      setOrders(data.orders ?? []);
      setLoaded(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load orders.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-admin-api-key": apiKey,
        },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? data.message ?? `Could not update order (${response.status}).`);
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-forest/10 bg-white">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <Link href="/" className="font-display text-xl font-bold text-forest">Marvel’s Kitchen</Link>
          <Link href="/" className="text-sm font-semibold text-forest underline underline-offset-4">Back to website</Link>
        </div>
      </header>
      <div className="container py-10 sm:py-14">
        <p className="eyebrow">Private staff page</p>
        <h1 className="section-title">Order <em>management.</em></h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Enter the server-side admin key to view saved orders and update their status.
          Orders and customer details are not public. Do not share the admin key.
        </p>

        <form onSubmit={loadOrders} className="mt-8 flex flex-col gap-3 bg-white p-5 shadow-sm sm:flex-row">
          <label className="grid flex-1 gap-2 text-sm font-semibold text-forest">
            Admin API key
            <input
              type="password"
              autoComplete="current-password"
              required
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="min-h-11 border border-forest/15 px-3 font-normal text-ink"
            />
          </label>
          <button type="submit" disabled={busy} className="button button-green self-end disabled:opacity-60">
            {busy ? "Loading…" : loaded ? "Refresh orders" : "Load orders"}
          </button>
        </form>

        {error && <p role="alert" className="mt-5 border border-red-900/15 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
        {loaded && orders.length === 0 && !error && (
          <p className="mt-6 bg-white p-6 text-sm text-muted">No orders have been placed yet.</p>
        )}

        <div className="mt-6 grid gap-5">
          {orders.map((order) => (
            <article key={order.id} className="bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col justify-between gap-4 border-b border-forest/10 pb-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs text-muted">Order reference</p>
                  <h2 className="break-all font-display text-xl font-semibold text-forest">{order.id}</h2>
                  <p className="mt-1 text-xs text-muted">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <label className="grid gap-1 text-xs font-semibold text-forest">
                  Status
                  <select
                    value={order.status}
                    disabled={busy}
                    onChange={(event) => void updateStatus(order.id, event.target.value)}
                    className="min-h-10 border border-forest/15 bg-white px-3 text-sm text-ink"
                  >
                    {!statuses.some(({ value }) => value === order.status) && <option value={order.status}>{order.status}</option>}
                    {statuses.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-5 py-5 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-forest">Customer</h3>
                  <p className="mt-2 text-sm">{order.customer_name}</p>
                  <p className="text-sm">{order.customer_phone}</p>
                  {order.customer_email && <p className="break-all text-sm">{order.customer_email}</p>}
                  <p className="mt-3 text-sm font-semibold">{order.fulfillment}</p>
                  {order.delivery_address && <p className="text-sm text-muted">{order.delivery_address}</p>}
                  {order.preferred_swallow && <p className="mt-2 text-sm"><strong>Complimentary swallow:</strong> {order.preferred_swallow}</p>}
                  {order.notes && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Notes:</strong> {order.notes}</p>}
                </div>
                <div>
                  <h3 className="font-semibold text-forest">Items</h3>
                  <div className="mt-2 grid gap-2">
                    {order.items.map((item, index) => (
                      <div key={`${item.item_name}-${index}`} className="flex justify-between gap-3 border-b border-forest/10 pb-2 text-sm">
                        <span>{item.item_name} × {item.quantity}</span>
                        <strong className="shrink-0">{formatNaira(item.line_total_ngn)}</strong>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3 pt-1 font-bold text-forest">
                      <span>Food subtotal</span><strong>{formatNaira(order.subtotal_ngn)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
