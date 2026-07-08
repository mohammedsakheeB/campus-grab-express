import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DELIVERY_SLOT_LABEL, ORDER_STATUS_STEPS } from "@/lib/constants";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const q = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  if (q.isLoading) return <div className="p-10 text-center">Loading...</div>;
  if (!q.data) return <div className="p-10 text-center">Order not found</div>;
  const o = q.data;
  const currentIdx = ORDER_STATUS_STEPS.findIndex((s) => s.value === o.order_status);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/orders" className="text-sm text-muted-foreground hover:underline">
          ← Back to orders
        </Link>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">
          Order #{o.id.slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-sm text-muted-foreground">
          Placed on {new Date(o.created_at).toLocaleString()}
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order status</CardTitle>
          </CardHeader>
          <CardContent>
            {o.order_status === "cancelled" ? (
              <p className="text-destructive font-medium">This order was cancelled.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
                <div
                  className="absolute left-4 top-4 w-0.5 bg-primary transition-all"
                  style={{ height: `${(currentIdx / (ORDER_STATUS_STEPS.length - 1)) * 100}%` }}
                />
                <div className="relative space-y-6">
                  {ORDER_STATUS_STEPS.map((s, i) => {
                    const done = i <= currentIdx;
                    return (
                      <div key={s.value} className="flex items-center gap-4">
                        <div
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-sm">{i + 1}</span>}
                        </div>
                        <div>
                          <p className={`font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                            {s.emoji} {s.label}
                          </p>
                          {i === currentIdx && (
                            <p className="text-xs text-primary">Current status</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{o.hostel_block}</p>
              <p className="text-muted-foreground whitespace-pre-line">{o.delivery_address}</p>
              <p className="mt-2 text-muted-foreground">
                Slot: <span className="text-foreground">{DELIVERY_SLOT_LABEL[o.delivery_slot]}</span>
              </p>
              <p className="text-muted-foreground">
                Payment: <span className="text-foreground uppercase">{o.payment_method}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {o.order_items.map((it: any) => (
                  <div key={it.id} className="flex justify-between">
                    <span className="line-clamp-1">
                      {it.product_name} × {it.quantity}
                    </span>
                    <span>₹{(Number(it.price_at_purchase) * it.quantity).toFixed(0)}</span>
                  </div>
                ))}
                {Number(o.discount_amount) > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Discount ({o.coupon_code})</span>
                    <span>-₹{Number(o.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="mt-2 h-px bg-border" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total paid</span>
                  <span>₹{Number(o.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
