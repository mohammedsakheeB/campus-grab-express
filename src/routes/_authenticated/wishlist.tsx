import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["wishlist-full", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("id, product_id, product:products(id, product_name, price, image_url, stock)");
      if (error) throw error;
      return data as any[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("wishlist").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">Wishlist</h1>
        {q.isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading...</div>
        ) : (q.data ?? []).length === 0 ? (
          <Card className="p-10 text-center">
            <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No saved items</h2>
            <p className="text-sm text-muted-foreground">
              Tap the heart on any product to save it here.
            </p>
            <Link to="/" className="mt-4 inline-block">
              <Button>Browse products</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {q.data!.map((w: any) => (
              <Card key={w.id} className="flex gap-3 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {w.product?.image_url && (
                    <img src={w.product.image_url} className="h-full w-full object-cover" alt="" />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-medium">{w.product?.product_name}</h3>
                    <p className="text-sm font-semibold text-primary">
                      ₹{Number(w.product?.price ?? 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => addItem.mutate({ productId: w.product_id })}
                      disabled={!w.product || w.product.stock <= 0}
                      className="gap-1"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(w.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
