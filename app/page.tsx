"use client";

import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import data from "../public/data/operations.json";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, BrainCircuit,
  Boxes, BriefcaseBusiness, ChevronDown, CircleHelp, ClipboardList,
  Download, Gauge, Layers3, Search, ShieldCheck, Wrench
} from "lucide-react";

type WorkOrder = {
  work_order_id: string; branch: string; equipment_type: string;
  status: string; priority: string; days_open: number;
  labor_revenue: number; parts_revenue: number; opened_date: string;
};

const money = (n: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0
}).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

export default function Home() {
  const [section, setSection] = useState("Overview");
  const [branch, setBranch] = useState("All branches");
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<any>(null);
  const [period, setPeriod] = useState("Last 90 days");

  const rows = data.work_orders as WorkOrder[];
  const filtered = useMemo(() => rows.filter(r =>
    (branch === "All branches" || r.branch === branch) &&
    [r.work_order_id, r.equipment_type, r.status, r.priority, r.branch]
      .join(" ").toLowerCase().includes(query.toLowerCase())
  ), [rows, branch, query]);

  const summary = useMemo(() => {
    const selected = rows.filter(r => branch === "All branches" || r.branch === branch);
    const closed = selected.filter(r => r.status === "Closed");
    const open = selected.filter(r => r.status !== "Closed");
    const serviceRevenue = closed.reduce((s, r) => s + r.labor_revenue + r.parts_revenue, 0);
    const avgClose = closed.length ? closed.reduce((s, r) => s + r.days_open, 0) / closed.length : 0;
    const branchAgg = Object.entries(selected.reduce((acc: any, r) => {
      acc[r.branch] ??= { branch: r.branch, revenue: 0, backlog: 0 };
      if (r.status === "Closed") acc[r.branch].revenue += r.labor_revenue + r.parts_revenue;
      else acc[r.branch].backlog++;
      return acc;
    }, {})).map(([, v]: any) => v).sort((a: any,b: any) => b.revenue-a.revenue);
    return { selected, closed, open, serviceRevenue, avgClose, branchAgg };
  }, [rows, branch]);

  const ask = () => {
    const q = question.toLowerCase();
    let result;
    if (q.includes("backlog") || q.includes("open work")) {
      result = { title: "Open service backlog", value: summary.open.length.toLocaleString(),
        explanation: "Count of work orders whose status is not Closed, using the current branch filter.",
        metric: "Open backlog" };
    } else if (q.includes("revenue") || q.includes("sales")) {
      result = { title: "Closed service revenue", value: money(summary.serviceRevenue),
        explanation: "Sum of labor_revenue + parts_revenue for Closed work orders in the selected branch scope.",
        metric: "Service revenue" };
    } else if (q.includes("close") || q.includes("cycle") || q.includes("days")) {
      result = { title: "Average days to close", value: `${summary.avgClose.toFixed(1)} days`,
        explanation: "Average days_open for Closed work orders in the selected branch scope.",
        metric: "Average days to close" };
    } else if (q.includes("utilization") || q.includes("fleet")) {
      result = { title: "Fleet utilization", value: pct(data.kpis.fleet_utilization),
        explanation: "Rental-active equipment days divided by available equipment days in the synthetic rental dataset. This KPI is dataset-wide.",
        metric: "Fleet utilization" };
    } else if (q.includes("parts") || q.includes("fill rate")) {
      result = { title: "Parts fill rate", value: pct(data.kpis.parts_fill_rate),
        explanation: "Quantity fulfilled divided by quantity requested in the synthetic parts-order dataset. This KPI is dataset-wide.",
        metric: "Parts fill rate" };
    } else {
      result = { title: "I couldn't map that question to an approved metric", value: "Try: backlog, service revenue, average days to close, fleet utilization, or parts fill rate.",
        explanation: "This demo uses deterministic metric routing; it does not call an LLM or generate arbitrary SQL.",
        metric: "Not matched" };
    }
    setAnswer(result);
  };

  const exportRows = () => {
    const header = ["work_order_id","branch","equipment_type","status","priority","days_open","labor_revenue","parts_revenue"];
    const csv = [header.join(","), ...filtered.map(r => header.map(k => JSON.stringify((r as any)[k] ?? "")).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "fieldiq-work-orders.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const nav = [
    ["Overview", Gauge], ["Operations Explorer", Search], ["Semantic Model", Layers3],
    ["Data Quality", ShieldCheck], ["AI Analyst", BrainCircuit], ["Architecture", Boxes]
  ] as const;

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">F</div><div><b>FIELDIQ</b><small>OPERATIONS INTELLIGENCE</small></div></div>
      <div className="workspace"><span className="dot"/> DEMO ENVIRONMENT <ChevronDown size={14}/></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([label, Icon]) => <button key={label} className={`nav-item ${section===label?"active":""}`} onClick={()=>setSection(label)}><Icon size={17}/>{label}</button>)}
      <div className="sidebar-bottom"><div className="status"><span className="green-dot"/> Synthetic data loaded</div><small>FIELDIQ v1.0 · Independent demo</small></div>
    </aside>

    <section className="main">
      <header className="topbar">
        <div><div className="eyebrow">OPERATIONS / ANALYTICS</div><h1>{section}</h1></div>
        <div className="top-actions"><span className="date-chip">◷ &nbsp; {period}</span><select value={branch} onChange={e=>setBranch(e.target.value)} aria-label="Filter branch"><option>All branches</option>{data.branches.map((b:string)=><option key={b}>{b}</option>)}</select><div className="avatar">MK</div></div>
      </header>

      <div className="notice"><span>DEMONSTRATION DATA</span> All records and KPIs are synthetic. This independent project is not affiliated with HOLT Group or connected to its systems.</div>

      {section === "Overview" && <div className="content">
        <div className="section-heading"><div><h2>Performance snapshot</h2><p>Service, rental and parts operations · {branch}</p></div><div className="live-tag"><span/> MODEL REFRESHED</div></div>
        <div className="kpis">
          <Kpi label="Closed service revenue" value={money(summary.serviceRevenue)} sub={`${summary.closed.length} closed work orders`} icon={<BriefcaseBusiness/>} trend="Synthetic measure"/>
          <Kpi label="Open service backlog" value={summary.open.length.toLocaleString()} sub="Work orders not yet closed" icon={<ClipboardList/>} trend="Operational queue"/>
          <Kpi label="Fleet utilization" value={pct(data.kpis.fleet_utilization)} sub="Rental-active / available days" icon={<Gauge/>} trend="Dataset-wide"/>
          <Kpi label="Parts fill rate" value={pct(data.kpis.parts_fill_rate)} sub="Fulfilled / requested quantity" icon={<Boxes/>} trend="Dataset-wide"/>
        </div>
        <div className="grid-two">
          <div className="panel"><div className="panel-head"><div><h3>Service revenue by branch</h3><p>Closed work orders · USD</p></div><BarChart3 size={18}/></div>
            <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.branchAgg}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf2"/><XAxis dataKey="branch" tick={{fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>`$${Math.round(v/1000)}k`} tick={{fontSize:11}} axisLine={false} tickLine={false}/><Tooltip formatter={(v:any)=>money(v)}/><Bar dataKey="revenue" fill="#e3ad24" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
          </div>
          <div className="panel"><div className="panel-head"><div><h3>Service queue composition</h3><p>Current filtered work orders</p></div><Wrench size={18}/></div>
            <div className="queue-list"><Queue label="Open work orders" value={summary.open.length} total={summary.selected.length} color="yellow"/><Queue label="Closed work orders" value={summary.closed.length} total={summary.selected.length} color="green"/><div className="queue-foot"><span>Average days to close</span><b>{summary.avgClose.toFixed(1)} days</b></div></div>
          </div>
        </div>
        <div className="grid-two">
          <div className="panel"><div className="panel-head"><div><h3>Work order trend</h3><p>Monthly opened work orders</p></div><Activity size={18}/></div>
            <div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf2"/><XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/><Tooltip/><Line type="monotone" dataKey="work_orders" stroke="#24374b" strokeWidth={3} dot={{r:3,fill:"#e3ad24"}}/></LineChart></ResponsiveContainer></div>
          </div>
          <div className="panel"><div className="panel-head"><div><h3>Branch service scorecard</h3><p>Revenue and open queue</p></div><CircleHelp size={18}/></div>
            <div className="table-wrap"><table><thead><tr><th>BRANCH</th><th>REVENUE</th><th>OPEN</th></tr></thead><tbody>{summary.branchAgg.map((b:any)=><tr key={b.branch}><td>{b.branch}</td><td>{money(b.revenue)}</td><td><span className="count-pill">{b.backlog}</span></td></tr>)}</tbody></table></div>
          </div>
        </div>
      </div>}

      {section === "Operations Explorer" && <div className="content">
        <div className="section-heading"><div><h2>Service work order explorer</h2><p>Inspect synthetic operational records and export the current view.</p></div><button className="primary-btn" onClick={exportRows}><Download size={15}/> Export CSV</button></div>
        <div className="panel">
          <div className="explorer-tools"><div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ID, branch, equipment, status..."/></div><span>{filtered.length} records</span></div>
          <div className="table-wrap"><table><thead><tr><th>WORK ORDER</th><th>BRANCH</th><th>EQUIPMENT</th><th>STATUS</th><th>PRIORITY</th><th>DAYS OPEN</th><th>REVENUE</th></tr></thead><tbody>{filtered.slice(0,100).map(r=><tr key={r.work_order_id}><td className="mono">{r.work_order_id}</td><td>{r.branch}</td><td>{r.equipment_type}</td><td><span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}</span></td><td>{r.priority}</td><td>{r.days_open}</td><td>{money(r.labor_revenue+r.parts_revenue)}</td></tr>)}</tbody></table></div>
          <div className="table-note">Showing up to 100 rows. Export CSV to download all filtered rows.</div>
        </div>
      </div>}

      {section === "Semantic Model" && <div className="content">
        <div className="section-heading"><div><h2>Business semantic layer</h2><p>Shared definitions, declared grain and model relationships.</p></div><span className="pill">STAR SCHEMA DESIGN</span></div>
        <div className="grid-two">
          <div className="panel"><h3>Core fact tables</h3><ModelRow name="fact_work_order" grain="One row per service work order" fields="labor_revenue · parts_revenue · days_open · status"/><ModelRow name="fact_rental_day" grain="One row per rental contract per day" fields="rental_revenue · active_flag · equipment_key"/><ModelRow name="fact_parts_order" grain="One row per parts order" fields="qty_requested · qty_fulfilled · order_date"/></div>
          <div className="panel"><h3>Conformed dimensions</h3><ModelRow name="dim_branch" grain="One row per branch" fields="branch_key · branch_name · region"/><ModelRow name="dim_equipment" grain="One row per asset" fields="equipment_key · equipment_type · model"/><ModelRow name="dim_date" grain="One row per calendar date" fields="date_key · month · quarter · year"/></div>
        </div>
        <div className="panel"><h3>Approved metric catalog</h3><div className="metric-grid">{data.metric_catalog.map((m:any)=><div className="metric-card" key={m.name}><b>{m.name}</b><code>{m.formula}</code><p>{m.description}</p><small>GRAIN: {m.grain}</small></div>)}</div></div>
      </div>}

      {section === "Data Quality" && <div className="content">
        <div className="section-heading"><div><h2>Data quality controls</h2><p>Validation checks executed by the reproducible Python pipeline.</p></div><span className="quality-badge"><ShieldCheck size={15}/> {data.quality.length} CHECKS DEFINED</span></div>
        <div className="panel"><div className="quality-list">{data.quality.map((q:any)=><div className="quality-row" key={q.name}><div className="check-icon"><ShieldCheck size={17}/></div><div><b>{q.name}</b><p>{q.description}</p></div><span className="pass">PASS IN SNAPSHOT</span></div>)}</div></div>
        <div className="callout"><b>Engineering note</b><p>The dashboard displays the latest committed synthetic snapshot. Re-run <code>python scripts/build_pipeline.py</code> and <code>pytest -q</code> to regenerate and validate the pipeline outputs. This page is not a live monitoring endpoint.</p></div>
      </div>}

      {section === "AI Analyst" && <div className="content">
        <div className="section-heading"><div><h2>Operations metric analyst</h2><p>Ask a question against the approved semantic metric catalog.</p></div><span className="pill">RULE-BASED DEMO</span></div>
        <div className="analyst-layout"><div className="panel analyst-main"><div className="analyst-icon"><BrainCircuit size={24}/></div><h3>Ask FIELDIQ</h3><p>Try a supported question. The response is computed from this synthetic dataset and includes its metric definition.</p><div className="prompt-row"><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder="e.g. How many open work orders do we have?"/><button onClick={ask}>Analyze</button></div><div className="suggestions">{["Show service backlog","What is service revenue?","Average days to close","What is fleet utilization?","What is parts fill rate?"].map(s=><button key={s} onClick={()=>setQuestion(s)}>{s}</button>)}</div>
          {answer && <div className="answer"><small>METRIC RESPONSE · {answer.metric}</small><h2>{answer.value}</h2><b>{answer.title}</b><p>{answer.explanation}</p></div>}
        </div><div className="panel"><h3>How this demo works</h3><ol className="steps"><li>Question text is matched to a small approved metric set.</li><li>Metric formula is evaluated against the current synthetic snapshot.</li><li>Result and calculation scope are returned transparently.</li></ol><div className="callout compact">No LLM API, arbitrary SQL generation, or external data access is configured.</div></div></div>
      </div>}

      {section === "Architecture" && <div className="content">
        <div className="section-heading"><div><h2>Data platform architecture</h2><p>Reproducible path from generated source records to business-facing metrics.</p></div><span className="pill">MEDALLION PATTERN</span></div>
        <div className="pipeline">{[["01","SOURCE GENERATION","Seeded Python generator creates equipment, branch, service, rental and parts records."],["02","BRONZE","Raw CSV extracts are preserved as source snapshots."],["03","SILVER","Types, standard labels, keys and validation rules are applied."],["04","GOLD","Fact and dimension outputs plus KPI aggregate snapshot are produced."],["05","CONSUMPTION","Next.js cockpit, SQL model assets and Power BI starter measures."]].map((s,i)=><div className="pipeline-step" key={s[0]}><div className="step-num">{s[0]}</div><div><b>{s[1]}</b><p>{s[2]}</p></div>{i<4&&<div className="step-line"/>}</div>)}</div>
        <div className="grid-two"><div className="panel"><h3>Engineering stack</h3><div className="stack-tags">{["Python","Pandas","SQL","Next.js","React","TypeScript","Recharts","Pytest","Power BI / DAX"].map(s=><span key={s}>{s}</span>)}</div></div><div className="panel"><h3>Production extension points</h3><ul className="plain-list"><li>Replace synthetic generator with governed ERP / service / rental extracts.</li><li>Orchestrate transformations with Fabric, Airflow or a scheduler.</li><li>Materialize warehouse models in a managed SQL platform.</li><li>Publish a certified Power BI semantic model and configure tenant RLS.</li></ul></div></div>
      </div>}

      <footer>FIELDIQ · INDEPENDENT BI ENGINEERING DEMONSTRATION <span>DATA: SYNTHETIC · NOT HOLT SYSTEMS</span></footer>
    </section>
  </main>;
}

function Kpi({label,value,sub,icon,trend}:any){return <div className="kpi"><div className="kpi-top"><span>{label}</span><div className="kpi-icon">{icon}</div></div><strong>{value}</strong><p>{sub}</p><small>{trend}</small></div>}
function Queue({label,value,total,color}:any){const width=total?value/total*100:0;return <div className="queue-item"><div><span>{label}</span><b>{value}</b></div><div className="track"><div className={color} style={{width:`${width}%`}}/></div></div>}
function ModelRow({name,grain,fields}:any){return <div className="model-row"><div><b>{name}</b><small>{grain}</small><code>{fields}</code></div><span className="table-tag">TABLE</span></div>}
