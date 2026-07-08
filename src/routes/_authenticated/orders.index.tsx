import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DELIVERY_SLOT_LABEL, ORDER_STATUS_STEPS } from "@/lib/constants";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders/")({
  component: OrdersListPage,
});

function OrdersListPage() {
  const { addItem } = useCart();
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(product_id, product_name, quantity, price_at_purchase)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const reorder = async (items: any[]) => {
    for (const it of items) {
      await addItem.mutateAsync({ productId: it.product_id, quantity: it.quantity });
    }
    toast.success("Items added to cart");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">My Orders</h1>

        {q.isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading...</div>
        ) : (q.data ?? []).length === 0 ? (
          <Card className="p-10 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No orders yet</h2>
            <Link to="/" className="mt-4 inline-block">
              <Button>Start shopping</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {q.data!.map((o: any) => {
              const statusIdx = ORDER_STATUS_STEPS.findIndex((s) => s.value === o.order_status);
              return (
                <Card key={o.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Order #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}
                      </div>
                      <div className="mt-1 text-sm">
                        {o.order_items.length} item{o.order_items.length !== 1 ? "s" : ""} ·{" "}
                        {DELIVERY_SLOT_LABEL[o.delivery_slot]}
                      </div>
                      <div className="mt-1 text-lg font-bold text-primary">
                        ₹{Number(o.total_amount).toFixed(2)}
                      </div>
                    </div>
                    <Badge
                      variant={o.order_status === "delivered" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {statusIdx >= 0 ? ORDER_STATUS_STEPS[statusIdx].emoji : ""}{" "}
                      {o.order_status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link to="/orders/$orderId" params={{ orderId: o.id }}>
                      <Button size="sm" variant="outline">
                        Track order
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => reorder(o.order_items)}>
                      Reorder
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
