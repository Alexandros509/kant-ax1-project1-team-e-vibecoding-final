-- Optional Supabase access boundary, after the ERD13 baseline on a NEW project.
-- Supabase owns auth.users and auth.uid(); this file creates/replaces neither.
-- Apply deliberately with a server/admin connection; it is not executed by the local app.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','categories','products','product_variants','product_images','favorites','recent_product_views','carts','cart_items','orders','order_items','payments','payment_transactions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon,authenticated',t);
 END LOOP;
END $$;
GRANT SELECT ON categories,products,product_variants,product_images TO anon,authenticated;
GRANT SELECT ON profiles,favorites,recent_product_views,carts,cart_items,orders,order_items,payments,payment_transactions TO authenticated;
GRANT UPDATE(display_name) ON profiles TO authenticated;
GRANT INSERT,DELETE ON favorites TO authenticated;
CREATE POLICY active_categories ON categories FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY active_products ON products FOR SELECT TO anon,authenticated USING(status='active' AND EXISTS(SELECT 1 FROM categories c LEFT JOIN categories p ON p.id=c.parent_id WHERE c.id=products.category_id AND c.is_active AND (c.parent_id IS NULL OR p.is_active)));
CREATE POLICY active_variants ON product_variants FOR SELECT TO anon,authenticated USING(is_active AND EXISTS(SELECT 1 FROM products p WHERE p.id=product_variants.product_id));
CREATE POLICY active_images ON product_images FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM products p WHERE p.id=product_images.product_id));
CREATE POLICY own_profile_read ON profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY own_profile_update ON profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE POLICY own_favorites ON favorites FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY own_recent_views ON recent_product_views FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY own_cart ON carts FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY own_cart_items ON cart_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM carts c WHERE c.id=cart_items.cart_id AND c.user_id=auth.uid()));
CREATE POLICY own_orders ON orders FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY own_order_items ON order_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM orders o WHERE o.id=order_items.order_id AND o.user_id=auth.uid()));
CREATE POLICY own_payments ON payments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM orders o WHERE o.id=payments.order_id AND o.user_id=auth.uid()));
CREATE POLICY own_payment_transactions ON payment_transactions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.id=payment_transactions.payment_id AND o.user_id=auth.uid()));
-- Member/cart/order/payment/recent-view writes go through authenticated, validated server code.
-- Connecting this local demo to Supabase Auth/Postgres requires an explicit adapter; keys alone do not do it.
