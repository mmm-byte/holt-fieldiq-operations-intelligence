# FIELDIQ — Enterprise Operations Intelligence

**An independent BI engineering demonstration for heavy-equipment dealership operations.**

FIELDIQ demonstrates a small but end-to-end analytics workflow: reproducible synthetic source data, Python transformations, a dimensional warehouse model, quality checks, a semantic metric catalog, and an interactive operations cockpit.

> **Important:** This is an independent portfolio project. It is not affiliated with, endorsed by, or connected to HOLT Group. All operational records and metrics are synthetic and do not represent HOLT data or performance.

## What is included

- **Operations cockpit:** revenue, service backlog, fleet utilization, parts fill rate, branch comparisons, and trend charts.
- **Exploration:** filter synthetic branch and equipment records, inspect service orders, and export filtered rows.
- **Metric definitions:** one place to understand metric formulas, grain, and caveats.
- **Python pipeline:** deterministic source generation and Bronze → Silver → Gold transformations.
- **Warehouse SQL:** staging views, dimensional model, facts, dimensions, and analytical marts.
- **Quality checks:** Python tests and SQL assertions for keys, nulls, reconciliation, and valid ranges.
- **Power BI starter:** DAX measures, model specification, and RLS design notes.
- **AI analyst demo:** rule-based natural-language question routing to approved metrics; it does not call an LLM or execute arbitrary SQL.

## Quick start

### 1. Run the web application

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### 2. Rebuild the synthetic data

Requires Python 3.10+.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/build_pipeline.py
pytest -q
```

The pipeline writes reproducible files to `data/` (ignored by Git) and refreshes the small web-demo snapshot at `public/data/operations.json`.

The web app includes a committed demo snapshot, so it can run without Python or a database.

## Data architecture

```text
Seeded synthetic source generator
  ├── equipment.csv
  ├── branches.csv
  ├── work_orders.csv
  ├── rental_contracts.csv
  └── parts_orders.csv
          |
          v
Bronze: immutable source extracts
          |
          v
Silver: standardized, typed, validated entities
          |
          v
Gold: dimensional facts + aggregate KPI snapshot
          |
          +---- SQL warehouse model (warehouse/sql)
          +---- Power BI semantic starter (powerbi)
          +---- Web application (public/data/operations.json)
```

### Declared grain

| Model | Grain |
|---|---|
| `fact_work_order` | One service work order |
| `fact_rental_day` | One rental contract per calendar day |
| `fact_parts_order` | One parts order |
| `dim_branch` | One branch |
| `dim_equipment` | One equipment asset |
| `dim_date` | One calendar date |

Revenue in this demo is a synthetic, modeled amount. Service revenue is summed from closed work orders; rental revenue is summed from contract-day allocations. These should not be interpreted as audited accounting figures.

## Metric definitions

- **Service revenue:** sum of `labor_revenue + parts_revenue` for closed work orders.
- **Open backlog:** count of work orders whose status is not `Closed`.
- **Average days to close:** average `days_open` for closed work orders.
- **Fleet utilization:** rental-active equipment days divided by available equipment days.
- **Parts fill rate:** quantity fulfilled divided by quantity requested.
- **Rental revenue:** sum of daily rental revenue allocated across contract days.

All percentages are calculated from underlying numerators and denominators, not by averaging branch percentages.

## Power BI

`powerbi/model-spec.md` describes the intended star schema and relationship directions. `powerbi/measures.dax` contains reusable measure definitions. `powerbi/rls-pattern.md` documents a branch-scoped RLS pattern.

These are starter artifacts, not a deployed Power BI semantic model. To implement RLS, publish to a Power BI workspace, create the role, and bind the identity mapping to your organization's identity provider. The web application itself does not enforce enterprise identity or row-level security.

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework preset: **Next.js**. Build command: `npm run build`; install command: `npm install`.
4. No environment variables are required for the demo.
5. Deploy and verify the production URL.

The app is a front-end demo and uses the committed synthetic JSON snapshot. The Python pipeline is run locally or in a separate scheduled compute environment; Vercel does not run the pipeline automatically.

## Quality and limitations

Run `pytest -q` after rebuilding the pipeline. The tests check row counts, unique identifiers, accepted status values, nonnegative measures, and revenue reconciliation.

The demo does not connect to ERP, CRM, rental management, service management, Power BI, Microsoft Fabric, or any HOLT platform. It does not claim real-time data, production security, or predictive AI. The AI Analyst uses transparent deterministic intent matching against approved metrics and returns a calculated result from the demo snapshot.

## Suggested interview walkthrough

1. Explain the business question: where are service backlog and fleet utilization changing?
2. Show the pipeline and declared grain before showing the dashboard.
3. Trace one KPI from source fields → transformation → Gold model → UI.
4. Show quality tests and explain what each catches.
5. Explain how the same star schema and DAX measures could be implemented in Power BI/Fabric in a real tenant.
