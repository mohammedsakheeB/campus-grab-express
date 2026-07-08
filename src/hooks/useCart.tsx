import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type CartRow = {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    product_name: string;
    price: number;
    image_url: string | null;
    stock: number;
    category: string;
  };
};

export function useCart() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CartRow[]> => {
      const { data, error } = await supabase
        .from("cart")
        .select("id, product_id, quantity, product:products(id, product_name, price, image_url, stock, category)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const addItem = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      if (!user) throw new Error("Please sign in");
      const existing = query.data?.find((c) => c.product_id === productId);
      if (existing) {
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart")
          .insert({ user_id: user.id, product_id: productId, quantity });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateQty = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase.from("cart").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart").update({ quantity }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const items = query.data ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, subtotal, count, isLoading: query.isLoading, addItem, updateQty, removeItem };
}
