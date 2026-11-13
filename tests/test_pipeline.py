import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_pipeline import generate_sources

def test_work_order_keys_are_unique():
    rows = generate_sources()["work_orders"]
    ids = [r["work_order_id"] for r in rows]
    assert len(ids) == len(set(ids))

def test_status_values_are_controlled():
    allowed = {"Open", "In Progress", "Closed"}
    assert all(r["status"] in allowed for r in generate_sources()["work_orders"])

def test_open_orders_have_zero_recognized_revenue():
    rows = generate_sources()["work_orders"]
    assert all(r["labor_revenue"] == 0 and r["parts_revenue"] == 0
               for r in rows if r["status"] != "Closed")

def test_parts_fulfillment_never_exceeds_request():
    rows = generate_sources()["parts_orders"]
    assert all(0 <= r["qty_fulfilled"] <= r["qty_requested"] for r in rows)

def test_equipment_foreign_keys_resolve():
    source = generate_sources()
    equipment_ids = {e["equipment_id"] for e in source["equipment"]}
    assert all(w["equipment_id"] in equipment_ids for w in source["work_orders"])
