import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const q = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id"),
      ]);
      const counts = new Map<string, number>();
      (ordersRes.data ?? []).forEach((o: any) =>
        counts.set(o.user_id, (counts.get(o.user_id) ?? 0) + 1),
      );
      return (profilesRes.data ?? []).map((p: any) => ({
        ...p,
        order_count: counts.get(p.id) ?? 0,
      }));
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold md:text-3xl">Customers</h1>
      {q.isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-2">
          {q.data?.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{c.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{c.email}</p>
                  {c.hostel_block && (
                    <p className="text-xs text-muted-foreground">Hostel: {c.hostel_block}</p>
                  )}
                </div>
                <Badge variant="secondary">
                  {c.order_count} order{c.order_count !== 1 ? "s" : ""}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
