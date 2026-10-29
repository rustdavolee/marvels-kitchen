import { business } from "@/lib/business";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
).replace(/\/+$/, "");

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  amount_ngn: number;
  category: Exclude<import("@/lib/business").MenuCategory, "All">;
  image_url: string;
  image_alt: string;
  includes_complimentary_swallow: boolean;
};

export type MenuResponse = {
  items: MenuItem[];
  business: {
    whatsapp: string;
  };
};

export type OrderRequest = {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  fulfillment: "Pickup" | "Delivery";
  delivery_address?: string;
  preferred_swallow?: string;
  notes?: string;
  items: Array<{ item_id: string; quantity: number }>;
};

export type OrderResponse = {
  order_id: string;
  status: string;
  subtotal_ngn: number;
  delivery_fee_ngn: number | null;
  total_ngn: number | null;
  whatsapp_url: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Could not connect to the Marvel’s Kitchen order service at ${apiBaseUrl}. Start the Rust API and try again.`,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new ApiError(
      body?.error ??
        body?.message ??
        `The order service returned an error (${response.status}). Please try again.`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export const api = {
  getMenu: () => request<MenuResponse>("/api/menu"),
  createOrder: (order: OrderRequest) =>
    request<OrderResponse>("/api/orders", {
      method: "POST",
      body: JSON.stringify(order),
    }),
  createReviewEmail: (name: string, rating: string, message: string) => {
    const subject = encodeURIComponent(`Website review for ${business.name}`);
    const body = encodeURIComponent(
      `Review for ${business.name}\nName: ${name}\nRating: ${rating}\n\n${message}`,
    );
    return `mailto:${business.email}?subject=${subject}&body=${body}`;
  },
};

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
