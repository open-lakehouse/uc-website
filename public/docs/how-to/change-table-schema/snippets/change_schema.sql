-- Change a managed Delta table's columns and properties, rename it by copying,
-- and change an external table's Delta log. Enter the statements in the
-- spark-sql shell that spark_sql.sh starts.

CREATE SCHEMA IF NOT EXISTS sales;
CREATE TABLE sales.orders (
  order_id    BIGINT,
  customer    STRING,
  amount      DECIMAL(10, 2),
  quantity    INT,
  legacy_code STRING
) USING DELTA;
INSERT INTO sales.orders VALUES
  (1, 'ada', 9.50, 1, 'A'),
  (2, 'grace', 20.00, 2, 'B');

ALTER TABLE sales.orders
  ADD COLUMNS (channel STRING COMMENT 'Where the order was placed');
ALTER TABLE sales.orders ALTER COLUMN amount COMMENT 'Order total in EUR';
COMMENT ON TABLE sales.orders IS 'One row per customer order';

SHOW TBLPROPERTIES sales.orders ('delta.columnMapping.mode');

ALTER TABLE sales.orders DROP COLUMN legacy_code;

ALTER TABLE sales.orders SET TBLPROPERTIES ('delta.enableTypeWidening' = 'true');
ALTER TABLE sales.orders ALTER COLUMN quantity TYPE BIGINT;

ALTER TABLE sales.orders
  SET TBLPROPERTIES ('sales.owner' = 'orders-team', 'sales.tier' = 'gold');
ALTER TABLE sales.orders UNSET TBLPROPERTIES ('sales.tier');
SHOW TBLPROPERTIES sales.orders ('sales.owner');

DESCRIBE HISTORY sales.orders;

CREATE TABLE sales.customer_orders USING DELTA AS SELECT * FROM sales.orders;
DROP TABLE sales.orders;

ALTER TABLE sales.order_events ADD COLUMNS (carrier STRING);
ALTER TABLE sales.order_events ALTER COLUMN status COMMENT 'Latest order status';
COMMENT ON TABLE sales.order_events IS 'One row per order event';
ALTER TABLE sales.order_events SET TBLPROPERTIES ('sales.owner' = 'orders-team');
