
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.place_order(text,text,public.delivery_slot,public.payment_method,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(text,text,public.delivery_slot,public.payment_method,text) TO authenticated, service_role;
