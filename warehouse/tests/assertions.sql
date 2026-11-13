-- Execute as validation queries in your warehouse; each query should return zero rows.
-- 1. Duplicate work order business keys
select work_order_id from silver_work_orders
group by work_order_id having count(*) > 1;

-- 2. Invalid status values
select * from silver_work_orders
where status not in ('Open', 'In Progress', 'Closed');

-- 3. Negative recognized revenue
select * from silver_work_orders
where labor_revenue < 0 or parts_revenue < 0;

-- 4. Parts fulfillment exceeds requested quantity
select * from silver_parts_orders
where qty_fulfilled < 0 or qty_fulfilled > qty_requested;

-- 5. Orphan equipment references
select w.* from silver_work_orders w
left join silver_equipment e on w.equipment_id = e.equipment_id
where e.equipment_id is null;
