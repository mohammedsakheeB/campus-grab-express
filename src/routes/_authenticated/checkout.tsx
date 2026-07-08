import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { DELIVERY_SLOTS } from "@/lib/constants";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [address, setAddress] = useState("");
  const [hostel, setHostel] = useState("");
  const [slot, setSlot] = useState("slot_9_12");
  const [payment, setPayment] = useState("cod");
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("hostel_block")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.hostel_block) setHostel(data.hostel_block);
      });
  }, [user]);

  useEffect(() => {
    if (!items.length) {
      nav({ to: "/cart", replace: true });
    }
  }, [items.length, nav]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    const { data } = await supabase
      .from("coupons")
      .select("discount_percent")
      .eq("code", coupon.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (!data) {
      setCouponDiscount(0);
      toast.error("Invalid coupon code");
      return;
    }
    const disc = Math.round(subtotal * data.discount_percent) / 100;
    setCouponDiscount(disc);
    toast.success(`${data.discount_percent}% off applied!`);
  };

  const total = Math.max(0, subtotal - couponDiscount);

  const placeOrder = async () => {
    if (!address.trim()) return toast.error("Enter your delivery address");
    if (!hostel.trim()) return toast.error("Enter your hostel/block");
    setPlacing(true);
    const { data, error } = await supabase.rpc("place_order", {
      _delivery_address: address,
      _hostel_block: hostel,
      _delivery_slot: slot as "slot_9_12" | "slot_12_3" | "slot_3_6",
      _payment_method: payment as "cod" | "upi" | "card",
      _coupon_code: couponDiscount > 0 ? coupon.trim().toUpperCase() : "",
    });
    setPlacing(false);
    if (error) return toast.error(error.message);
    toast.success("Order placed successfully!");
    nav({ to: "/orders/$orderId", params: { orderId: data as string } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">Checkout</h1>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hostel">Hostel / Block *</Label>
                  <Input
                    id="hostel"
                    placeholder="e.g. Block B, Room 214"
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr">Full delivery address *</Label>
                  <Textarea
                    id="addr"
                    placeholder="Landmarks, room number, contact info..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Slot</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={slot} onValueChange={setSlot} className="grid gap-2">
                  {DELIVERY_SLOTS.map((s) => (
                    <Label
                      key={s.value}
                      htmlFor={s.value}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem id={s.value} value={s.value} />
                      <span className="font-medium">{s.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={payment} onValueChange={setPayment} className="grid gap-2">
                  {[
                    { v: "cod", l: "💵 Cash on Delivery" },
                    { v: "upi", l: "📱 UPI (simulated)" },
                    { v: "card", l: "💳 Card (simulated)" },
                  ].map((p) => (
                    <Label
                      key={p.v}
                      htmlFor={`pm-${p.v}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem id={`pm-${p.v}`} value={p.v} />
                      <span className="font-medium">{p.l}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span className="line-clamp-1 text-muted-foreground">
                      {it.product.product_name} × {it.quantity}
                    </span>
                    <span>₹{(Number(it.product.price) * it.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-2">
                <Label htmlFor="coupon" className="text-xs">
                  Coupon (try FEST10 or NEWUSER20)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Enter code"
                    className="h-9"
                  />
                  <Button size="sm" variant="outline" onClick={applyCoupon}>
                    Apply
                  </Button>
                </div>
                {couponDiscount > 0 && (
                  <p className="flex items-center gap-1 text-xs text-primary">
                    <BadgeCheck className="h-3 w-3" /> Coupon applied
                  </p>
                )}
              </div>

              <div className="h-px bg-border" />

              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Discount</span>
                  <span>-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-primary">FREE</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>

              <Button className="w-full" size="lg" onClick={placeOrder} disabled={placing}>
                {placing ? "Placing order..." : `Place Order · ₹${total.toFixed(0)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
