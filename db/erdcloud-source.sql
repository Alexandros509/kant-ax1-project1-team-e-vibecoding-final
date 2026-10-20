CREATE TABLE "product_relations" (
	"relation_type"	VARCHAR(100)		NOT NULL,
	"source_color_id"	CHAR(36)		NOT NULL,
	"target_color_id"	CHAR(36)		NOT NULL,
	"sort_order"	INT		NOT NULL
);

CREATE TABLE "product_images" (
	"id"	CHAR(36)		NOT NULL,
	"product_color_id"	CHAR(36)		NOT NULL,
	"url"	VARCHAR(255)		NOT NULL,
	"role"	VARCHAR(100)		NOT NULL,
	"alt"	VARCHAR(100)		NULL,
	"sort_order"	INT		NOT NULL
);

CREATE TABLE "orders" (
	"id"	CHAR(36)		NOT NULL,
	"customer_id"	CHAR(36)		NULL,
	"order_number"	VARCHAR(100)		NOT NULL,
	"status"	VARCHAR(100)		NOT NULL,
	"currency"	VARCHAR(100)		NOT NULL,
	"total_amount"	BIGINT		NOT NULL,
	"shipping_snapshot"	JSON		NOT NULL,
	"placed_at"	DATETIME		NOT NULL,
	"email"	VARCHAR(255)		NOT NULL,
	"phone"	VARCHAR(100)		NOT NULL,
	"subtotal_amount"	BIGINT		NOT NULL,
	"discount_amount"	BIGINT		NOT NULL,
	"shipping_amount"	BIGINT		NOT NULL,
	"tax_amount"	BIGINT		NOT NULL,
	"checkout_key"	VARCHAR(100)		NOT NULL
);

CREATE TABLE "brands" (
	"id"	CHAR(36)		NOT NULL,
	"code"	VARCHAR(100)		NOT NULL,
	"name"	VARCHAR(100)		NOT NULL
);

CREATE TABLE "inventory_reservations" (
	"id"	CHAR(36)		NOT NULL,
	"order_item_id"	CHAR(36)		NOT NULL,
	"variant_id"	CHAR(36)		NOT NULL,
	"quantity"	INT		NOT NULL,
	"status"	VARCHAR(100)		NOT NULL,
	"expires_at"	DATETIME		NOT NULL
);

CREATE TABLE "products" (
	"id"	CHAR(36)		NOT NULL,
	"brand_id"	CHAR(36)		NOT NULL,
	"style_code"	VARCHAR(100)		NOT NULL,
	"name"	VARCHAR(100)		NOT NULL,
	"description"	TEXT		NULL,
	"status"	VARCHAR(100)		NOT NULL,
	"care"	TEXT		NULL,
	"tags"	JSON		NULL
);

CREATE TABLE "shipments" (
	"id"	CHAR(36)		NOT NULL,
	"order_id"	CHAR(36)		NOT NULL,
	"carrier"	VARCHAR(100)		NOT NULL,
	"tracking_number"	VARCHAR(100)		NULL,
	"status"	VARCHAR(100)		NOT NULL,
	"shipped_at"	DATETIME		NULL,
	"delivered_at"	DATETIME		NULL
);

CREATE TABLE "refunds" (
	"id"	CHAR(36)		NOT NULL,
	"payment_id"	CHAR(36)		NOT NULL,
	"provider_refund_id"	VARCHAR(100)		NULL,
	"idempotency_key"	VARCHAR(100)		NOT NULL,
	"amount"	BIGINT		NOT NULL,
	"status"	VARCHAR(100)		NOT NULL,
	"refunded_at"	DATETIME		NULL,
	"currency"	VARCHAR(100)		NOT NULL,
	"reason"	TEXT		NULL
);

CREATE TABLE "order_items" (
	"id"	CHAR(36)		NOT NULL,
	"order_id"	CHAR(36)		NOT NULL,
	"variant_id"	CHAR(36)		NOT NULL,
	"product_snapshot"	JSON		NOT NULL,
	"unit_price"	BIGINT		NOT NULL,
	"quantity"	INT		NOT NULL,
	"discount_amount"	BIGINT		NOT NULL
);

CREATE TABLE "carts" (
	"id"	CHAR(36)		NOT NULL,
	"customer_id"	CHAR(36)		NULL,
	"guest_token_hash"	VARCHAR(100)		NULL,
	"status"	VARCHAR(100)		NOT NULL,
	"expires_at"	DATETIME		NOT NULL
);

CREATE TABLE "categories" (
	"id"	CHAR(36)		NOT NULL,
	"parent_id"	CHAR(36)		NULL,
	"slug"	VARCHAR(255)		NOT NULL,
	"name"	VARCHAR(100)		NOT NULL,
	"sort_order"	INT		NOT NULL
);

CREATE TABLE "shipment_items" (
	"shipment_id"	CHAR(36)		NOT NULL,
	"order_item_id"	CHAR(36)		NOT NULL,
	"quantity"	INT		NOT NULL
);

CREATE TABLE "stores" (
	"id"	CHAR(36)		NOT NULL,
	"brand_id"	CHAR(36)		NOT NULL,
	"name"	VARCHAR(100)		NOT NULL,
	"address"	TEXT		NOT NULL,
	"image_url"	VARCHAR(255)		NOT NULL,
	"map_url"	VARCHAR(255)		NOT NULL,
	"opening_hours"	TEXT		NULL,
	"is_active"	BOOLEAN		NOT NULL
);

CREATE TABLE "pages" (
	"id"	CHAR(36)		NOT NULL,
	"slug"	VARCHAR(255)		NOT NULL,
	"locale"	VARCHAR(100)		NOT NULL,
	"title"	VARCHAR(100)		NOT NULL,
	"body"	TEXT		NOT NULL,
	"published_at"	DATETIME		NULL
);

CREATE TABLE "product_variants" (
	"id"	CHAR(36)		NOT NULL,
	"product_color_id"	CHAR(36)		NOT NULL,
	"sku"	VARCHAR(100)		NOT NULL,
	"size"	VARCHAR(100)		NOT NULL,
	"price"	BIGINT		NOT NULL,
	"currency"	VARCHAR(100)		NOT NULL,
	"is_active"	BOOLEAN		NOT NULL
);

CREATE TABLE "product_categories" (
	"product_id"	CHAR(36)		NOT NULL,
	"category_id"	CHAR(36)		NOT NULL
);

CREATE TABLE "archive_images" (
	"id"	CHAR(36)		NOT NULL,
	"archive_id"	CHAR(36)		NOT NULL,
	"url"	VARCHAR(255)		NOT NULL,
	"alt"	VARCHAR(100)		NULL,
	"sort_order"	INT		NOT NULL
);

CREATE TABLE "payments" (
	"id"	CHAR(36)		NOT NULL,
	"order_id"	CHAR(36)		NOT NULL,
	"provider"	VARCHAR(100)		NOT NULL,
	"provider_payment_id"	VARCHAR(100)		NULL,
	"idempotency_key"	VARCHAR(100)		NOT NULL,
	"amount"	BIGINT		NOT NULL,
	"status"	VARCHAR(100)		NOT NULL,
	"paid_at"	DATETIME		NULL,
	"currency"	VARCHAR(100)		NOT NULL
);

CREATE TABLE "customers" (
	"id"	CHAR(36)		NOT NULL,
	"auth_subject"	VARCHAR(255)		NOT NULL,
	"email"	VARCHAR(255)		NOT NULL,
	"name"	VARCHAR(100)		NOT NULL,
	"phone"	VARCHAR(100)		NOT NULL,
	"created_at"	DATETIME		NOT NULL
);

CREATE TABLE "collections" (
	"id"	CHAR(36)		NOT NULL,
	"brand_id"	CHAR(36)		NOT NULL,
	"handle"	VARCHAR(255)		NOT NULL,
	"title"	VARCHAR(100)		NOT NULL,
	"season"	VARCHAR(100)		NOT NULL,
	"status"	VARCHAR(100)		NOT NULL
);

CREATE TABLE "cart_items" (
	"cart_id"	CHAR(36)		NOT NULL,
	"variant_id"	CHAR(36)		NOT NULL,
	"quantity"	INT		NOT NULL
);

CREATE TABLE "collection_products" (
	"collection_id"	CHAR(36)		NOT NULL,
	"product_color_id"	CHAR(36)		NOT NULL,
	"sort_order"	INT		NOT NULL
);

CREATE TABLE "addresses" (
	"id"	CHAR(36)		NOT NULL,
	"customer_id"	CHAR(36)		NOT NULL,
	"recipient"	VARCHAR(100)		NOT NULL,
	"phone"	VARCHAR(100)		NOT NULL,
	"postal_code"	VARCHAR(100)		NOT NULL,
	"address"	TEXT		NOT NULL,
	"is_default"	BOOLEAN	DEFAULT BOOLEAN	NOT NULL
);

CREATE TABLE "archives" (
	"id"	CHAR(36)		NOT NULL,
	"brand_id"	CHAR(36)		NOT NULL,
	"collection_id"	CHAR(36)		NULL,
	"slug"	VARCHAR(255)		NOT NULL,
	"title"	VARCHAR(100)		NOT NULL,
	"season"	VARCHAR(100)		NOT NULL,
	"published_at"	DATETIME		NULL
);

CREATE TABLE "inventories" (
	"variant_id"	CHAR(36)		NOT NULL,
	"on_hand"	INT		NOT NULL,
	"reserved"	INT		NOT NULL,
	"updated_at"	DATETIME		NOT NULL
);

CREATE TABLE "product_colors" (
	"id"	CHAR(36)		NOT NULL,
	"product_id"	CHAR(36)		NOT NULL,
	"handle"	VARCHAR(255)		NOT NULL,
	"color_name"	VARCHAR(100)		NOT NULL,
	"color_hex"	VARCHAR(100)		NULL,
	"technical"	TEXT		NULL,
	"size_guide"	TEXT		NULL,
	"sort_order"	INT		NOT NULL
);

ALTER TABLE "product_relations" ADD CONSTRAINT "PK_PRODUCT_RELATIONS" PRIMARY KEY (
	"relation_type",
	"source_color_id",
	"target_color_id"
);

ALTER TABLE "product_images" ADD CONSTRAINT "PK_PRODUCT_IMAGES" PRIMARY KEY (
	"id"
);

ALTER TABLE "orders" ADD CONSTRAINT "PK_ORDERS" PRIMARY KEY (
	"id"
);

ALTER TABLE "brands" ADD CONSTRAINT "PK_BRANDS" PRIMARY KEY (
	"id"
);

ALTER TABLE "inventory_reservations" ADD CONSTRAINT "PK_INVENTORY_RESERVATIONS" PRIMARY KEY (
	"id"
);

ALTER TABLE "products" ADD CONSTRAINT "PK_PRODUCTS" PRIMARY KEY (
	"id"
);

ALTER TABLE "shipments" ADD CONSTRAINT "PK_SHIPMENTS" PRIMARY KEY (
	"id"
);

ALTER TABLE "refunds" ADD CONSTRAINT "PK_REFUNDS" PRIMARY KEY (
	"id"
);

ALTER TABLE "order_items" ADD CONSTRAINT "PK_ORDER_ITEMS" PRIMARY KEY (
	"id"
);

ALTER TABLE "carts" ADD CONSTRAINT "PK_CARTS" PRIMARY KEY (
	"id"
);

ALTER TABLE "categories" ADD CONSTRAINT "PK_CATEGORIES" PRIMARY KEY (
	"id"
);

ALTER TABLE "shipment_items" ADD CONSTRAINT "PK_SHIPMENT_ITEMS" PRIMARY KEY (
	"shipment_id",
	"order_item_id"
);

ALTER TABLE "stores" ADD CONSTRAINT "PK_STORES" PRIMARY KEY (
	"id"
);

ALTER TABLE "pages" ADD CONSTRAINT "PK_PAGES" PRIMARY KEY (
	"id"
);

ALTER TABLE "product_variants" ADD CONSTRAINT "PK_PRODUCT_VARIANTS" PRIMARY KEY (
	"id"
);

ALTER TABLE "product_categories" ADD CONSTRAINT "PK_PRODUCT_CATEGORIES" PRIMARY KEY (
	"product_id",
	"category_id"
);

ALTER TABLE "archive_images" ADD CONSTRAINT "PK_ARCHIVE_IMAGES" PRIMARY KEY (
	"id"
);

ALTER TABLE "payments" ADD CONSTRAINT "PK_PAYMENTS" PRIMARY KEY (
	"id"
);

ALTER TABLE "customers" ADD CONSTRAINT "PK_CUSTOMERS" PRIMARY KEY (
	"id"
);

ALTER TABLE "collections" ADD CONSTRAINT "PK_COLLECTIONS" PRIMARY KEY (
	"id"
);

ALTER TABLE "cart_items" ADD CONSTRAINT "PK_CART_ITEMS" PRIMARY KEY (
	"cart_id",
	"variant_id"
);

ALTER TABLE "collection_products" ADD CONSTRAINT "PK_COLLECTION_PRODUCTS" PRIMARY KEY (
	"collection_id",
	"product_color_id"
);

ALTER TABLE "addresses" ADD CONSTRAINT "PK_ADDRESSES" PRIMARY KEY (
	"id"
);

ALTER TABLE "archives" ADD CONSTRAINT "PK_ARCHIVES" PRIMARY KEY (
	"id"
);

ALTER TABLE "inventories" ADD CONSTRAINT "PK_INVENTORIES" PRIMARY KEY (
	"variant_id"
);

ALTER TABLE "product_colors" ADD CONSTRAINT "PK_PRODUCT_COLORS" PRIMARY KEY (
	"id"
);

ALTER TABLE "product_relations" ADD CONSTRAINT "FK_product_colors_TO_product_relations_1" FOREIGN KEY (
	"source_color_id"
)
REFERENCES "product_colors" (
	"id"
);

ALTER TABLE "product_relations" ADD CONSTRAINT "FK_product_colors_TO_product_relations_2" FOREIGN KEY (
	"target_color_id"
)
REFERENCES "product_colors" (
	"id"
);

ALTER TABLE "product_images" ADD CONSTRAINT "FK_product_colors_TO_product_images_1" FOREIGN KEY (
	"product_color_id"
)
REFERENCES "product_colors" (
	"id"
);

ALTER TABLE "orders" ADD CONSTRAINT "FK_customers_TO_orders_1" FOREIGN KEY (
	"customer_id"
)
REFERENCES "customers" (
	"id"
);

ALTER TABLE "inventory_reservations" ADD CONSTRAINT "FK_order_items_TO_inventory_reservations_1" FOREIGN KEY (
	"order_item_id"
)
REFERENCES "order_items" (
	"id"
);

ALTER TABLE "inventory_reservations" ADD CONSTRAINT "FK_inventories_TO_inventory_reservations_1" FOREIGN KEY (
	"variant_id"
)
REFERENCES "inventories" (
	"variant_id"
);

ALTER TABLE "products" ADD CONSTRAINT "FK_brands_TO_products_1" FOREIGN KEY (
	"brand_id"
)
REFERENCES "brands" (
	"id"
);

ALTER TABLE "shipments" ADD CONSTRAINT "FK_orders_TO_shipments_1" FOREIGN KEY (
	"order_id"
)
REFERENCES "orders" (
	"id"
);

ALTER TABLE "refunds" ADD CONSTRAINT "FK_payments_TO_refunds_1" FOREIGN KEY (
	"payment_id"
)
REFERENCES "payments" (
	"id"
);

ALTER TABLE "order_items" ADD CONSTRAINT "FK_orders_TO_order_items_1" FOREIGN KEY (
	"order_id"
)
REFERENCES "orders" (
	"id"
);

ALTER TABLE "order_items" ADD CONSTRAINT "FK_product_variants_TO_order_items_1" FOREIGN KEY (
	"variant_id"
)
REFERENCES "product_variants" (
	"id"
);

ALTER TABLE "carts" ADD CONSTRAINT "FK_customers_TO_carts_1" FOREIGN KEY (
	"customer_id"
)
REFERENCES "customers" (
	"id"
);

ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_TO_categories_1" FOREIGN KEY (
	"parent_id"
)
REFERENCES "categories" (
	"id"
);

ALTER TABLE "shipment_items" ADD CONSTRAINT "FK_shipments_TO_shipment_items_1" FOREIGN KEY (
	"shipment_id"
)
REFERENCES "shipments" (
	"id"
);

ALTER TABLE "shipment_items" ADD CONSTRAINT "FK_order_items_TO_shipment_items_1" FOREIGN KEY (
	"order_item_id"
)
REFERENCES "order_items" (
	"id"
);

ALTER TABLE "stores" ADD CONSTRAINT "FK_brands_TO_stores_1" FOREIGN KEY (
	"brand_id"
)
REFERENCES "brands" (
	"id"
);

ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_colors_TO_product_variants_1" FOREIGN KEY (
	"product_color_id"
)
REFERENCES "product_colors" (
	"id"
);

ALTER TABLE "product_categories" ADD CONSTRAINT "FK_products_TO_product_categories_1" FOREIGN KEY (
	"product_id"
)
REFERENCES "products" (
	"id"
);

ALTER TABLE "product_categories" ADD CONSTRAINT "FK_categories_TO_product_categories_1" FOREIGN KEY (
	"category_id"
)
REFERENCES "categories" (
	"id"
);

ALTER TABLE "archive_images" ADD CONSTRAINT "FK_archives_TO_archive_images_1" FOREIGN KEY (
	"archive_id"
)
REFERENCES "archives" (
	"id"
);

ALTER TABLE "payments" ADD CONSTRAINT "FK_orders_TO_payments_1" FOREIGN KEY (
	"order_id"
)
REFERENCES "orders" (
	"id"
);

ALTER TABLE "collections" ADD CONSTRAINT "FK_brands_TO_collections_1" FOREIGN KEY (
	"brand_id"
)
REFERENCES "brands" (
	"id"
);

ALTER TABLE "cart_items" ADD CONSTRAINT "FK_carts_TO_cart_items_1" FOREIGN KEY (
	"cart_id"
)
REFERENCES "carts" (
	"id"
);

ALTER TABLE "cart_items" ADD CONSTRAINT "FK_product_variants_TO_cart_items_1" FOREIGN KEY (
	"variant_id"
)
REFERENCES "product_variants" (
	"id"
);

ALTER TABLE "collection_products" ADD CONSTRAINT "FK_collections_TO_collection_products_1" FOREIGN KEY (
	"collection_id"
)
REFERENCES "collections" (
	"id"
);

ALTER TABLE "collection_products" ADD CONSTRAINT "FK_product_colors_TO_collection_products_1" FOREIGN KEY (
	"product_color_id"
)
REFERENCES "product_colors" (
	"id"
);

ALTER TABLE "addresses" ADD CONSTRAINT "FK_customers_TO_addresses_1" FOREIGN KEY (
	"customer_id"
)
REFERENCES "customers" (
	"id"
);

ALTER TABLE "archives" ADD CONSTRAINT "FK_brands_TO_archives_1" FOREIGN KEY (
	"brand_id"
)
REFERENCES "brands" (
	"id"
);

ALTER TABLE "archives" ADD CONSTRAINT "FK_collections_TO_archives_1" FOREIGN KEY (
	"collection_id"
)
REFERENCES "collections" (
	"id"
);

ALTER TABLE "inventories" ADD CONSTRAINT "FK_product_variants_TO_inventories_1" FOREIGN KEY (
	"variant_id"
)
REFERENCES "product_variants" (
	"id"
);

ALTER TABLE "product_colors" ADD CONSTRAINT "FK_products_TO_product_colors_1" FOREIGN KEY (
	"product_id"
)
REFERENCES "products" (
	"id"
);

