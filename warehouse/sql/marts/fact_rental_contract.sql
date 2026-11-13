-- Grain: one row per rental contract (not per contract-day).
select
  contract_id,
  equipment_id,
  cast(start_date as date) as start_date,
  rental_days,
  daily_rate,
  cast(rental_days as decimal(18,2)) * daily_rate as modeled_rental_revenue
from silver_rental_contracts
