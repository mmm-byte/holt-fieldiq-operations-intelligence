-- Grain: one row per parts order.
select
  parts_order_id,
  branch,
  cast(order_date as date) as order_date,
  qty_requested,
  qty_fulfilled,
  case when qty_requested = 0 then null
       else cast(qty_fulfilled as decimal(18,4)) / qty_requested end as fill_rate
from silver_parts_orders
