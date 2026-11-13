"""Generate deterministic synthetic source data and build Bronze/Silver/Gold layers."""
from __future__ import annotations
import json, random, shutil
from pathlib import Path
from datetime import date, timedelta
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BRONZE, SILVER, GOLD = DATA / "bronze", DATA / "silver", DATA / "gold"
SEED = 58
BRANCHES = ["San Antonio", "Austin", "Dallas", "Fort Worth", "Waco"]
EQUIPMENT_TYPES = ["Excavator", "Wheel Loader", "Dozer", "Motor Grader", "Generator"]

def generate_sources():
    rng = random.Random(SEED)
    equipment = [{"equipment_id":f"EQ-{i:04d}", "branch":rng.choice(BRANCHES),
                  "equipment_type":rng.choice(EQUIPMENT_TYPES),
                  "model":rng.choice(["320 GC","950 GC","D6","140","XQ200"]),
                  "year":rng.randint(2018,2025)} for i in range(1,91)]
    start = date(2025,1,1)
    work = []
    for i in range(1,481):
        opened = start + timedelta(days=rng.randint(0,320))
        status = rng.choices(["Open","In Progress","Closed"], weights=[22,18,60])[0]
        eq = rng.choice(equipment)
        closed = status == "Closed"
        work.append({"work_order_id":f"WO-{i:05d}", "equipment_id":eq["equipment_id"],
          "branch":eq["branch"], "equipment_type":eq["equipment_type"], "status":status,
          "priority":rng.choice(["Critical","High","Normal","Low"]), "opened_date":opened.isoformat(),
          "days_open":rng.randint(1,24) if closed else rng.randint(1,58),
          "labor_revenue":round(rng.uniform(450,6800),2) if closed else 0,
          "parts_revenue":round(rng.uniform(100,4200),2) if closed else 0})
    rentals = [{"contract_id":f"RC-{i:05d}", "equipment_id":rng.choice(equipment)["equipment_id"],
      "start_date":(start+timedelta(days=rng.randint(0,300))).isoformat(),
      "rental_days":rng.randint(2,35), "daily_rate":round(rng.uniform(180,1150),2)}
      for i in range(1,251)]
    parts=[]
    for i in range(1,321):
        requested=rng.randint(1,25)
        parts.append({"parts_order_id":f"PO-{i:05d}", "branch":rng.choice(BRANCHES),
          "qty_requested":requested, "qty_fulfilled":rng.randint(max(0,requested-5),requested),
          "order_date":(start+timedelta(days=rng.randint(0,320))).isoformat()})
    return {"equipment":equipment,"work_orders":work,"rental_contracts":rentals,"parts_orders":parts,
            "branches":[{"branch":b,"region":"Texas"} for b in BRANCHES]}

def write_csv(frame, path):
    path.parent.mkdir(parents=True,exist_ok=True)
    frame.to_csv(path,index=False)

def run():
    for p in (BRONZE,SILVER,GOLD):
        if p.exists(): shutil.rmtree(p)
        p.mkdir(parents=True)
    source=generate_sources()
    for name, records in source.items():
        write_csv(pd.DataFrame(records),BRONZE/f"{name}.csv")

    equipment=pd.DataFrame(source["equipment"])
    work=pd.DataFrame(source["work_orders"])
    rentals=pd.DataFrame(source["rental_contracts"])
    parts=pd.DataFrame(source["parts_orders"])
    work["opened_date"]=pd.to_datetime(work["opened_date"])
    work["days_open"]=pd.to_numeric(work["days_open"],errors="raise").astype(int)
    for col in ["labor_revenue","parts_revenue"]:
        work[col]=pd.to_numeric(work[col],errors="raise").fillna(0).round(2)
    rentals["start_date"]=pd.to_datetime(rentals["start_date"])
    parts["order_date"]=pd.to_datetime(parts["order_date"])
    work=work.merge(equipment[["equipment_id","model","year"]],on="equipment_id",how="left",validate="many_to_one")
    if work["model"].isna().any(): raise ValueError("Unknown equipment_id in work orders")
    write_csv(work,SILVER/"work_orders.csv")
    write_csv(equipment,SILVER/"equipment.csv")
    write_csv(rentals,SILVER/"rental_contracts.csv")
    write_csv(parts,SILVER/"parts_orders.csv")
    write_csv(pd.DataFrame(source["branches"]),SILVER/"branches.csv")

    closed=work[work.status=="Closed"].copy()
    open_work=work[work.status!="Closed"]
    service_revenue=float((closed.labor_revenue+closed.parts_revenue).sum())
    parts_fill=float(parts.qty_fulfilled.sum()/parts.qty_requested.sum())
    rental_days=int(rentals.rental_days.sum())
    fleet_util=min(1.0,rental_days/(len(equipment)*365))
    avg_close=float(closed.days_open.mean())
    fact_work=work.copy()
    fact_work["service_revenue"]=fact_work.labor_revenue+fact_work.parts_revenue
    fact_rental=rentals.copy()
    fact_rental["rental_revenue"]=fact_rental.rental_days*fact_rental.daily_rate
    fact_parts=parts.copy()
    fact_parts["fill_rate"]=fact_parts.qty_fulfilled/fact_parts.qty_requested
    write_csv(fact_work,GOLD/"fact_work_order.csv")
    write_csv(fact_rental,GOLD/"fact_rental_contract.csv")
    write_csv(fact_parts,GOLD/"fact_parts_order.csv")
    write_csv(equipment,GOLD/"dim_equipment.csv")
    write_csv(pd.DataFrame(source["branches"]),GOLD/"dim_branch.csv")
    monthly=work.assign(month=work.opened_date.dt.strftime("%b")).groupby("month").size()
    month_order=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    monthly_rows=[{"month":m,"work_orders":int(monthly.get(m,0))} for m in month_order]
    branch_rows=[]
    for name, group in work.groupby("branch"):
        closed_group=group[group.status=="Closed"]
        branch_rows.append({"branch":name,"revenue":round(float((closed_group.labor_revenue+closed_group.parts_revenue).sum()),2),
                            "backlog":int((group.status!="Closed").sum())})
    kpis={"service_revenue":round(service_revenue,2),"open_backlog":int(len(open_work)),
          "fleet_utilization":round(fleet_util*100,2),"parts_fill_rate":round(parts_fill*100,2),
          "avg_days_to_close":round(avg_close,2)}
    catalog=[
      {"name":"Service revenue","formula":"SUM(labor_revenue + parts_revenue) WHERE status = 'Closed'","description":"Modeled service revenue from closed work orders.","grain":"Work order"},
      {"name":"Open backlog","formula":"COUNT(work_order_id) WHERE status <> 'Closed'","description":"Count of work orders not yet closed.","grain":"Work order"},
      {"name":"Average days to close","formula":"AVG(days_open) WHERE status = 'Closed'","description":"Average elapsed days for closed work orders.","grain":"Work order"},
      {"name":"Fleet utilization","formula":"SUM(rental_days) / (equipment_count × 365)","description":"Synthetic rental days divided by available equipment days.","grain":"Equipment-day approximation"},
      {"name":"Parts fill rate","formula":"SUM(qty_fulfilled) / SUM(qty_requested)","description":"Share of requested parts quantity fulfilled.","grain":"Parts order"}]
    quality=[
      {"name":"Unique work order key","description":"work_order_id must be unique and non-null."},
      {"name":"Valid work order status","description":"status must be Open, In Progress, or Closed."},
      {"name":"Nonnegative revenue","description":"labor_revenue and parts_revenue must be zero or positive."},
      {"name":"Valid parts quantities","description":"0 ≤ qty_fulfilled ≤ qty_requested."},
      {"name":"Revenue reconciliation","description":"Gold service revenue must equal closed work order revenue sum."}]
    snapshot={"branches":BRANCHES,"work_orders":work.to_dict(orient="records"),"kpis":kpis,
              "monthly":monthly_rows,"branch_summary":branch_rows,"metric_catalog":catalog,"quality":quality}
    # JSON-safe timestamps
    snapshot["work_orders"]=[{k:(v.isoformat() if hasattr(v,"isoformat") else v) for k,v in row.items()} for row in snapshot["work_orders"]]
    (ROOT/"public"/"data"/"operations.json").write_text(json.dumps(snapshot,indent=2,default=str))
    print(f"Built {len(work)} work orders, {len(equipment)} equipment assets; service revenue=${service_revenue:,.2f}")

if __name__=="__main__": run()
