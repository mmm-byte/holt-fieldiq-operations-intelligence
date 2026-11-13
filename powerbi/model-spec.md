# Power BI model specification

## Tables and grain

| Table | Type | Grain | Key |
|---|---|---|---|
| dim_branch | Dimension | One row per branch | branch_key |
| dim_equipment | Dimension | One row per equipment asset | equipment_key |
| dim_date | Dimension | One row per calendar date | date_key |
| fact_work_order | Fact | One row per work order | work_order_id |
| fact_parts_order | Fact | One row per parts order | parts_order_id |
| fact_rental_contract | Fact | One row per rental contract | contract_id |

## Relationships

- `dim_branch[branch_key]` 1 → * `fact_work_order[branch_key]`
- `dim_equipment[equipment_key]` 1 → * `fact_work_order[equipment_key]`
- `dim_equipment[equipment_key]` 1 → * `fact_rental_contract[equipment_key]`
- `dim_date[date_key]` 1 → * each fact's applicable date key after adding integer date keys.
- `dim_branch` can relate to parts orders after adding a conformed branch key in the warehouse.

Use single-direction filtering from dimensions to facts. Avoid fact-to-fact relationships.

## Important caveats

The SQL files are warehouse-oriented starter SQL and may require dialect and source relation adjustments. The DAX is a starter measure library, not a published semantic model. Fleet utilization uses a simplified denominator and should be refined with effective-dated fleet availability and downtime before operational use.
