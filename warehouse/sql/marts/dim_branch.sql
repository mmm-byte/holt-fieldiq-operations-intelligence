select
  row_number() over (order by branch) as branch_key,
  branch as branch_name,
  'Texas' as region
from (select distinct branch from silver_branches) b
