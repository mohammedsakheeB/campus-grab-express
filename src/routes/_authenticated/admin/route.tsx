import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Package, ShoppingBag, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-lg px-4 py-16">
          <Card className="p-6 text-center">
            <h2 className="text-xl font-bold">Admin access only</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You need an admin role to view this page. Ask an admin to grant your account access
              via the <code className="rounded bg-muted px-1">user_roles</code> table.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const nav = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { to: "/admin/customers", label: "Customers", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1">
            {nav.map((n) => {
              const active =
                n.to === "/admin" ? loc.pathname === "/admin" : loc.pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <nav className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {nav.map((n) => {
              const active =
                n.to === "/admin" ? loc.pathname === "/admin" : loc.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
