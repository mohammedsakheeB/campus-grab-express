import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/constants";
import { useMemo, useState } from "react";
import { Heart, Search, ShoppingCart, Truck, Clock, BadgePercent } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type Product = {
  id: string;
  product_name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
};

function HomePage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("default");

  const productsQ = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("product_name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const wishlistQ = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlist").select("product_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.product_id));
    },
  });

  const toggleWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Sign in to save items");
      const has = wishlistQ.data?.has(productId);
      if (has) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let list = productsQ.data ?? [];
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((p) => p.product_name.toLowerCase().includes(s));
    }
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [productsQ.data, category, search, sort]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
          <div className="max-w-2xl">
            <Badge className="mb-3 bg-accent text-accent-foreground hover:bg-accent">
              🎉 New users get 20% off with NEWUSER20
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              Fresh groceries, <span className="text-primary">delivered to your hostel.</span>
            </h1>
            <p className="mt-3 text-muted-foreground md:text-lg">
              Skip the walk to the store. Order snacks, dairy, veggies and essentials — delivered
              in a slot that fits your day.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> Same-day delivery
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Choose your slot
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-primary" /> Student pricing
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Featured</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("all")}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              category === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                category === c.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="mr-1">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Products grid */}
      <section className="mx-auto max-w-7xl px-4 py-6 pb-16">
        {productsQ.isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No products match your search.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {filtered.map((p) => {
              const inWishlist = wishlistQ.data?.has(p.id);
              const out = p.stock <= 0;
              return (
                <Card key={p.id} className="group overflow-hidden py-0 transition hover:shadow-md">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.product_name}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-4xl">🛒</div>
                    )}
                    {user && (
                      <button
                        onClick={() => toggleWishlist.mutate(p.id)}
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow-sm transition hover:bg-background"
                        aria-label="Toggle wishlist"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            inWishlist ? "fill-destructive text-destructive" : "text-foreground"
                          }`}
                        />
                      </button>
                    )}
                    {out && (
                      <Badge variant="destructive" className="absolute left-2 top-2">
                        Out of stock
                      </Badge>
                    )}
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_LABEL[p.category]}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-medium leading-tight">
                      {p.product_name}
                    </h3>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-base font-bold text-primary">
                        ₹{Number(p.price).toFixed(0)}
                      </span>
                      <Button
                        size="sm"
                        disabled={out}
                        onClick={() =>
                          user
                            ? addItem.mutate({ productId: p.id })
                            : (window.location.href = "/auth")
                        }
                        className="h-8 gap-1"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-border bg-muted/40 py-6 text-center text-sm text-muted-foreground">
        Campus Grocery Express · Made for students · <Link to="/auth" className="underline">Sign in</Link>
      </footer>
    </div>
  );
}
