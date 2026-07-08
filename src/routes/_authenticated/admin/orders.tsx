import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { DELIVERY_SLOT_LABEL, ORDER_STATUS_STEPS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const STATUSES = [
  "placed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
type Status = (typeof STATUSES)[number];

function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const q = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(product_name, quantity, price_at_purchase)")
        .order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("order_status", filter as Status);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold md:text-3xl">Orders</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All orders</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {q.isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Loading...</div>
      ) : (q.data ?? []).length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No orders found</p>
      ) : (
        <div className="space-y-3">
          {q.data!.map((o) => {
            const statusIdx = ORDER_STATUS_STEPS.findIndex((s) => s.value === o.order_status);
            return (
              <Card key={o.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm">
                        {new Date(o.created_at).toLocaleString()} · {o.hostel_block} ·{" "}
                        {DELIVERY_SLOT_LABEL[o.delivery_slot]}
                      </p>
                      <p className="mt-1 text-lg font-bold text-primary">
                        ₹{Number(o.total_amount).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={o.order_status === "delivered" ? "default" : "secondary"}>
                        {statusIdx >= 0 ? ORDER_STATUS_STEPS[statusIdx].emoji : ""}{" "}
                        {o.order_status.replace(/_/g, " ")}
                      </Badge>
                      <Select
                        value={o.order_status}
                        onValueChange={(v) => setStatus.mutate({ id: o.id, status: v as Status })}
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      {o.order_items.length} items
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {o.order_items.map((it: any, i: number) => (
                        <li key={i} className="flex justify-between">
                          <span>
                            {it.product_name} × {it.quantity}
                          </span>
                          <span>₹{(Number(it.price_at_purchase) * it.quantity).toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
