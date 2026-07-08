import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Package, ShoppingBag, Users, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("total_amount, order_status"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("products")
          .select("id, product_name, stock, category")
          .lte("stock", 10)
          .order("stock", { ascending: true }),
      ]);
      const orders = ordersRes.data ?? [];
      const revenue = orders
        .filter((o) => o.order_status !== "cancelled")
        .reduce((s, o) => s + Number(o.total_amount), 0);
      return {
        totalOrders: orders.length,
        revenue,
        customers: customersRes.count ?? 0,
        lowStock: productsRes.data ?? [],
      };
    },
  });

  const cards = [
    {
      label: "Total Orders",
      value: stats.data?.totalOrders ?? "…",
      icon: ShoppingBag,
      color: "text-primary",
    },
    {
      label: "Revenue",
      value: stats.data ? `₹${stats.data.revenue.toFixed(0)}` : "…",
      icon: IndianRupee,
      color: "text-accent",
    },
    {
      label: "Customers",
      value: stats.data?.customers ?? "…",
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Low-stock items",
      value: stats.data?.lowStock.length ?? "…",
      icon: Package,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your grocery operations</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold">{c.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${c.color}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Low-stock alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stats.data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : stats.data.lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">All products well-stocked 🎉</p>
          ) : (
            <div className="space-y-2">
              {stats.data.lowStock.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <span className="font-medium">{p.product_name}</span>
                  <Badge variant={p.stock === 0 ? "destructive" : "secondary"}>
                    {p.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
