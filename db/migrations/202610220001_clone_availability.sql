-- Optional, targeted patch for an existing ERD13 fixture DB with the same DEMO option IDs.
-- No member/cart/order/payment rows or table definitions are modified.
-- The clone gives a boolean; 0/100000 are local test-stock markers, not merchant stock counts.
BEGIN;
UPDATE product_variants SET stock_quantity=0,updated_at=now() WHERE id=83 AND product_id=24 AND sku='DEMO-024-1' AND size_label='2' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=100000,updated_at=now() WHERE id=325 AND product_id=100 AND sku='DEMO-100-0' AND size_label='1' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=100000,updated_at=now() WHERE id=477 AND product_id=148 AND sku='DEMO-148-0' AND size_label='1' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=0,updated_at=now() WHERE id=803 AND product_id=229 AND sku='DEMO-229-2' AND size_label='3' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=100000,updated_at=now() WHERE id=816 AND product_id=232 AND sku='DEMO-232-3' AND size_label='4' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=0,updated_at=now() WHERE id=820 AND product_id=233 AND sku='DEMO-233-3' AND size_label='4' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=100000,updated_at=now() WHERE id=1065 AND product_id=308 AND sku='DEMO-308-0' AND size_label='1' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=0,updated_at=now() WHERE id=1083 AND product_id=312 AND sku='DEMO-312-2' AND size_label='3' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=0,updated_at=now() WHERE id=1210 AND product_id=344 AND sku='DEMO-344-2' AND size_label='3' AND stock_quantity IN (0,100000);
UPDATE product_variants SET stock_quantity=100000,updated_at=now() WHERE id=1239 AND product_id=352 AND sku='DEMO-352-2' AND size_label='3' AND stock_quantity IN (0,100000);
COMMIT;
