import { AdminOrders } from "@/components/admin-orders";

export const metadata = {
  title: "Order administration | Marvel’s Kitchen",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminOrders />;
}
