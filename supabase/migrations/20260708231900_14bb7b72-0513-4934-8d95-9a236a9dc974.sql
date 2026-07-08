
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  hostel_block text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: self read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: self insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: self update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, hostel_block)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'hostel_block'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PRODUCTS ============
CREATE TYPE public.product_category AS ENUM (
  'fruits_vegetables','dairy','snacks','beverages','household'
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  description text,
  category product_category NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products: public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Products: admin write" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Products: admin update" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Products: admin delete" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ CART ============
CREATE TABLE public.cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart TO authenticated;
GRANT ALL ON public.cart TO service_role;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cart: own rows" ON public.cart FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ORDERS ============
CREATE TYPE public.order_status AS ENUM ('placed','packed','out_for_delivery','delivered','cancelled');
CREATE TYPE public.delivery_slot AS ENUM ('slot_9_12','slot_12_3','slot_3_6');
CREATE TYPE public.payment_method AS ENUM ('cod','upi','card');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  order_status order_status NOT NULL DEFAULT 'placed',
  delivery_slot delivery_slot NOT NULL,
  delivery_address text NOT NULL,
  hostel_block text NOT NULL,
  coupon_code text,
  payment_method payment_method NOT NULL DEFAULT 'cod',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders: own or admin read" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Orders: own insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Orders: admin update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  price_at_purchase numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items: via order" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Order items: insert via own order" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- ============ WISHLIST ============
CREATE TABLE public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wishlist: own" ON public.wishlist FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COUPONS ============
CREATE TABLE public.coupons (
  code text PRIMARY KEY,
  discount_percent int NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coupons: public read" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active);

INSERT INTO public.coupons(code, discount_percent) VALUES ('FEST10', 10), ('NEWUSER20', 20);

-- ============ STOCK DECREMENT RPC ============
CREATE OR REPLACE FUNCTION public.place_order(
  _delivery_address text,
  _hostel_block text,
  _delivery_slot delivery_slot,
  _payment_method payment_method,
  _coupon_code text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _order_id uuid;
  _subtotal numeric(10,2) := 0;
  _discount numeric(10,2) := 0;
  _pct int := 0;
  _item record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock relevant products & validate stock
  FOR _item IN
    SELECT c.product_id, c.quantity, p.price, p.stock, p.product_name
    FROM public.cart c
    JOIN public.products p ON p.id = c.product_id
    WHERE c.user_id = _uid
    FOR UPDATE OF p
  LOOP
    IF _item.stock < _item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', _item.product_name;
    END IF;
    _subtotal := _subtotal + _item.price * _item.quantity;
  END LOOP;

  IF _subtotal = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT discount_percent INTO _pct FROM public.coupons WHERE code = _coupon_code AND is_active;
    IF _pct IS NULL THEN RAISE EXCEPTION 'Invalid coupon'; END IF;
    _discount := round(_subtotal * _pct / 100.0, 2);
  END IF;

  INSERT INTO public.orders(user_id, total_amount, discount_amount, delivery_slot, delivery_address, hostel_block, coupon_code, payment_method)
  VALUES (_uid, _subtotal - _discount, _discount, _delivery_slot, _delivery_address, _hostel_block, NULLIF(_coupon_code,''), _payment_method)
  RETURNING id INTO _order_id;

  INSERT INTO public.order_items(order_id, product_id, product_name, quantity, price_at_purchase)
  SELECT _order_id, c.product_id, p.product_name, c.quantity, p.price
  FROM public.cart c JOIN public.products p ON p.id = c.product_id
  WHERE c.user_id = _uid;

  UPDATE public.products p SET stock = p.stock - c.quantity
  FROM public.cart c WHERE c.user_id = _uid AND c.product_id = p.id;

  DELETE FROM public.cart WHERE user_id = _uid;

  RETURN _order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.place_order(text,text,delivery_slot,payment_method,text) TO authenticated;

-- ============ SEED PRODUCTS ============
INSERT INTO public.products (product_name, description, category, price, stock, image_url) VALUES
('Bananas (1 dozen)', 'Fresh ripe bananas, perfect for a quick snack', 'fruits_vegetables', 60, 50, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600'),
('Apples (1 kg)', 'Crisp red apples', 'fruits_vegetables', 180, 40, 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600'),
('Tomatoes (1 kg)', 'Farm fresh tomatoes', 'fruits_vegetables', 40, 60, 'https://images.unsplash.com/photo-1546470427-f5c8ba6c1c8e?w=600'),
('Onions (1 kg)', 'Everyday onions', 'fruits_vegetables', 35, 80, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600'),
('Potatoes (1 kg)', 'Clean, ready-to-cook potatoes', 'fruits_vegetables', 30, 100, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600'),
('Full Cream Milk (1 L)', 'Fresh dairy milk', 'dairy', 66, 100, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600'),
('Amul Butter (100g)', 'Salted butter', 'dairy', 55, 40, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600'),
('Paneer (200g)', 'Soft fresh paneer', 'dairy', 90, 25, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600'),
('Curd (500g)', 'Thick fresh curd', 'dairy', 45, 50, 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=600'),
('Lays Classic', 'Salted potato chips', 'snacks', 20, 200, 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600'),
('Kurkure Masala', 'Crunchy masala snack', 'snacks', 20, 200, 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=600'),
('Oreo Biscuits', 'Chocolate cream biscuits', 'snacks', 30, 150, 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600'),
('Maggi Noodles (Pack of 4)', 'Instant masala noodles', 'snacks', 60, 120, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600'),
('Coca Cola (1.25L)', 'Chilled beverage', 'beverages', 65, 80, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600'),
('Red Bull (250ml)', 'Energy drink', 'beverages', 125, 50, 'https://images.unsplash.com/photo-1613218521298-b76b1c026a7d?w=600'),
('Tropicana Orange (1L)', 'Fresh orange juice', 'beverages', 130, 40, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600'),
('Nescafe Coffee (50g)', 'Instant classic coffee', 'beverages', 175, 60, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600'),
('Surf Excel (1kg)', 'Detergent powder', 'household', 155, 30, 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600'),
('Dettol Soap', 'Antibacterial soap', 'household', 45, 100, 'https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=600'),
('Colgate Toothpaste', 'Fluoride toothpaste 100g', 'household', 80, 80, 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600'),
('Toilet Paper (Pack of 4)', 'Soft tissue rolls', 'household', 120, 60, 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=600'),
('Harpic Toilet Cleaner', 'Powerful cleaner 500ml', 'household', 95, 45, 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600');
