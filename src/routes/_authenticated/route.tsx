import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.navigate({
        to: "/auth",
        search: { mode: "signin", redirect: window.location.pathname },
        replace: true,
      });
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!user) return null;
  return <Outlet />;
}
