import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/hooks/useCart";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, updateQty, removeItem, isLoading } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">Your Cart</h1>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Your cart is empty</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse our fresh groceries to get started.
            </p>
            <Link to="/" className="mt-4 inline-block">
              <Button>Start shopping</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3 md:col-span-2">
              {items.map((it) => (
                <Card key={it.id} className="flex gap-3 p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {it.product.image_url && (
                      <img
                        src={it.product.image_url}
                        alt={it.product.product_name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-medium leading-tight">{it.product.product_name}</h3>
                      <p className="text-sm text-primary font-semibold">
                        ₹{Number(it.product.price).toFixed(0)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-md border border-border">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQty.mutate({ id: it.id, quantity: it.quantity - 1 })
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{it.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={it.quantity >= it.product.stock}
                          onClick={() =>
                            updateQty.mutate({ id: it.id, quantity: it.quantity + 1 })
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem.mutate(it.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="h-fit p-4">
              <h3 className="mb-3 font-semibold">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-primary">FREE</span>
                </div>
                <div className="my-3 h-px bg-border" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
              <Link to="/checkout" className="mt-4 block">
                <Button className="w-full">Proceed to Checkout</Button>
              </Link>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
