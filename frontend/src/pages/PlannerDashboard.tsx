import React, { useEffect, useMemo, useState } from "react";
import api from "../config/axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function PlannerDashboard() {
  const [summary, setSummary] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [planRows, setPlanRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);

  const [message, setMessage] = useState("");

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSimulate, setLoadingSimulate] = useState(false);
  const [loadingFinalize, setLoadingFinalize] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const [loadingDeptKey, setLoadingDeptKey] = useState("");

  const [scenario, setScenario] = useState("TRAIN_FAILURE");
  const [selectedTrain, setSelectedTrain] = useState("");
  const [selectedDecision, setSelectedDecision] = useState("RUN");

  const [planStatus, setPlanStatus] = useState("");
  const [planExplanation, setPlanExplanation] = useState("");
  const [simulationExplanation, setSimulationExplanation] = useState("");
  const [finalExplanation, setFinalExplanation] = useState("");
  const [compareExplanation, setCompareExplanation] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [compareModal, setCompareModal] = useState(false);
  const [compareData, setCompareData] = useState(null);

  const [deptModal, setDeptModal] = useState(false);
  const [deptRows, setDeptRows] = useState([]);
  const [deptTitle, setDeptTitle] = useState("");

  useEffect(() => {
    loadSummary();
    loadCurrentPlan();
    const role = localStorage.getItem("role") || "";
    setUserRole(role.toUpperCase());
  }, []);

  const departments = [
    { key: "operations_control_room", label: "Operations Control Room" },
    { key: "maintenance_logs", label: "Maintenance" },
    { key: "cleaning_logs", label: "Cleaning" },
    { key: "fitness_logs", label: "Fitness" },
    { key: "branding_logs", label: "Branding" },
    { key: "mileage_logs", label: "Mileage" },
  ];

  const scenarios = [
    "TRAIN_FAILURE",
    "PEAK_HOUR",
    "WEATHER",
    "CLEANING_DELAY",
    "SIGNALLING_FAILURE",
    "STAFF_SHORTAGE",
    "VIP_BRANDING_DAY",
    "MULTIPLE_BREAKDOWN",
  ];

  const toast = (txt) => {
    setMessage(txt);
    setTimeout(() => setMessage(""), 3200);
  };

  const openModal = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get("/planner/summary");
      setSummary(res.data);
    } catch (err) {
      toast("Failed loading summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadCurrentPlan = async () => {
    try {
      const res = await api.get("/planner/current-plan");

      if (res.data.exists) {
        setPlanStatus(res.data.status || "");
        setPlanRows(res.data.details || []);
        setOriginalRows(res.data.details || []);
      }
    } catch (err) {
      console.log("No current plan");
    }
  };

  const loadDept = async (deptKey, label) => {
    try {
      setLoadingDeptKey(deptKey);

      const res = await api.get(`/planner/department-data/${deptKey}`);

      setDeptRows(res.data.rows || []);
      setDeptTitle(label);
      setDeptModal(true);
    } catch {
      toast("Failed loading department data");
    } finally {
      setLoadingDeptKey("");
    }
  };

  const generatePlan = async () => {
    try {
      setLoadingGenerate(true);

      const res = await api.post("/planner/generate-plan");

      setPlanRows(res.data.details || []);
      setOriginalRows(res.data.details || []);
      setPlanExplanation(res.data.ai_summary || "");
      setSimulationExplanation("");
      setFinalExplanation("");
      setCompareExplanation("");

      toast("Plan generated successfully");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Plan generation failed";
      toast(msg);
    } finally {
      setLoadingGenerate(false);
    }
  };

  const simulatePlan = async () => {
    try {
      setLoadingSimulate(true);

      const res = await api.post("/planner/what-if", {
        scenario,
        train_id: selectedTrain || null,
      });

      setPlanRows(res.data.details || []);
      setSimulationExplanation(res.data.ai_summary || "");

      toast("Scenario simulated");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Simulation failed";
      toast(msg);
    } finally {
      setLoadingSimulate(false);
    }
  };

  const applyOverride = () => {
    if (!selectedTrain) {
      toast("Select a train first");
      return;
    }

    const updated = planRows.map((row) =>
      row.train_id === selectedTrain
        ? {
            ...row,
            decision: selectedDecision,
            override_flag: true,
          }
        : row,
    );

    setPlanRows(updated);
    toast("Manual override applied");
  };

  const finalizePlan = async () => {
    try {
      setLoadingFinalize(true);

      const res = await api.post("/planner/finalize", {
        original_rows: originalRows,
        final_rows: planRows,
      });

      setFinalExplanation(res.data.ai_summary || "");

      // refresh cards immediately
      await loadSummary();
      await loadCurrentPlan();

      toast("Plan finalized");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Finalize failed";

      toast(msg);
    } finally {
      setLoadingFinalize(false);
    }
  };
  const comparePlans = async () => {
    try {
      setLoadingCompare(true);

      const res = await api.post("/planner/compare", {
        original_rows: originalRows,
        final_rows: planRows,
      });

      setCompareExplanation(res.data.ai_summary || "");
      setCompareData(res.data);
      setCompareModal(true);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Compare failed";
      toast(msg);
    } finally {
      setLoadingCompare(false);
    }
  };

  const counts = useMemo(() => {
    const run = planRows.filter((x) => x.decision === "RUN").length;

    const standby = planRows.filter((x) => x.decision === "STANDBY").length;

    const maint = planRows.filter((x) => x.decision === "MAINTENANCE").length;

    return { run, standby, maint };
  }, [planRows]);

  const isPlannerLocked = userRole === "PLANNER" && planStatus === "FINALIZED";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-6">
      {message && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[80] bg-cyan-600 px-6 py-3 rounded-xl shadow-2xl font-semibold">
          {message}
        </div>
      )}

      {/* TEXT MODAL */}
      {modalOpen && (
        <ModalShell title={modalTitle} onClose={() => setModalOpen(false)}>
          <pre className="whitespace-pre-wrap text-slate-300 leading-7 font-sans">
            {modalContent}
          </pre>
        </ModalShell>
      )}

      {compareModal && compareData && (
        <ModalShell
          title="Visual Plan Comparison"
          onClose={() => setCompareModal(false)}
        >
          <CompareDashboard data={compareData} />
        </ModalShell>
      )}

      {/* DEPARTMENT MODAL */}
      {deptModal && (
        <ModalShell title={deptTitle} onClose={() => setDeptModal(false)}>
          {deptRows.length > 0 ? (
            <DataTable rows={deptRows} />
          ) : (
            <p className="text-slate-400">No records found.</p>
          )}
        </ModalShell>
      )}

      {/* SUMMARY */}
      <Section title="Fleet Readiness Overview">
        {loadingSummary ? (
          <p>Loading...</p>
        ) : summary ? (
          <div className="grid md:grid-cols-4 gap-4">
            <MiniCard title="Total Trains" value={summary.total_trains} />
            <MiniCard title="Ready" value={summary.ready_for_induction} />
            <MiniCard title="Pending" value={summary.maintenance_pending} />
            <MiniCard
              title="Departments"
              value={summary.departments_received?.length || 0}
            />
          </div>
        ) : (
          <p>No data</p>
        )}
      </Section>

      {/* DEPARTMENTS */}

      <Section title="Department Live Data Status">
        <div className="grid md:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const received = (summary?.departments_received || []).map((x) =>
              String(x).toLowerCase().trim(),
            );

            const complete = (summary?.departments_complete || []).map((x) =>
              String(x).toLowerCase().trim(),
            );

            const currentKey = String(dept.key).toLowerCase().trim();

            const isReceived = received.includes(currentKey);
            const isComplete = complete.includes(currentKey);

            let btnClass = "";

            // -----------------------------------
            // COLOR RULES
            // Green  = complete data available
            // Orange = partial / missing exists
            // Red    = no data today
            // -----------------------------------
            if (isComplete) {
              btnClass = "bg-emerald-600 hover:bg-emerald-700";
            } else if (isReceived && !isComplete) {
              btnClass = "bg-orange-500 hover:bg-orange-600";
            } else {
              btnClass = "bg-red-600 hover:bg-red-700";
            }

            return (
              <button
                key={dept.key}
                onClick={() => loadDept(dept.key, dept.label)}
                className={`px-4 py-3 rounded-xl font-semibold shadow-lg transition ${btnClass}`}
              >
                {loadingDeptKey === dept.key ? "Loading..." : dept.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* GENERATE */}
      <Section title="Generate Plan">
        <p className="text-slate-400 mb-4">
          Plan is generated using daily data from all departments . The AI model
          considers various factors to assign a decision (RUN / STANDBY /
          MAINTENANCE) to each train, along with risk and priority scores.
        </p>

        <button
          onClick={generatePlan}
          disabled={loadingGenerate || isPlannerLocked}
          className={`px-6 py-3 rounded-xl ${
            isPlannerLocked
              ? "bg-slate-600 cursor-not-allowed"
              : "bg-cyan-600 hover:bg-cyan-700"
          }`}
        >
          {loadingGenerate
            ? "Generating..."
            : isPlannerLocked
              ? "Locked After Finalization"
              : "Generate AI Plan"}
        </button>

        {isPlannerLocked && (
          <p className="mt-3 text-red-300 text-sm">
            Today's plan is finalized. Only ADMIN can regenerate.
          </p>
        )}

        {planRows.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() =>
                openModal(
                  "Plan Explanation",
                  planExplanation || "AI explanation not available.",
                )
              }
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              View Initial Plan Explanation
            </button>
          </div>
        )}
      </Section>
      <div className="flex">
        Current Plan Status:&nbsp;
        {planStatus && (
          <p
            className={
              planStatus === "GENERATED"
                ? "mb-3 text-amber-300 font-semibold"
                : "mb-3 text-emerald-500 font-semibold"
            }
          >
            {planStatus}
          </p>
        )}
      </div>

      {/* PLAN TABLE */}
      {planRows.length > 0 && (
        <Section title="Generated Fleet Plan">
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            <MiniCard title="RUN" value={counts.run} />
            <MiniCard title="STANDBY" value={counts.standby} />
            <MiniCard title="MAINTENANCE" value={counts.maint} />
          </div>

          <PlanTable rows={planRows} />
        </Section>
      )}

      {/* WHAT IF */}
      {planRows.length > 0 && (
        <Section title="What-if Simulation">
          <div className="grid md:grid-cols-3 gap-4">
            <select
              className="inputBox"
              value={selectedTrain}
              onChange={(e) => setSelectedTrain(e.target.value)}
            >
              <option value="">Select Train (Optional)</option>

              {planRows.map((r) => (
                <option
                  key={r.train_id}
                  value={r.train_id}
                  className="text-black"
                >
                  {r.train_id}
                </option>
              ))}
            </select>

            <select
              className="inputBox"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {scenarios.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={simulatePlan}
              disabled={loadingSimulate}
              className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600"
            >
              {loadingSimulate ? "Simulating..." : "Run Simulation"}
            </button>
          </div>

          {simulationExplanation && (
            <div className="mt-4">
              <button
                onClick={() =>
                  openModal("Simulation Explanation", simulationExplanation)
                }
                className="px-4 py-2 rounded-xl bg-indigo-600"
              >
                View Explanation
              </button>
            </div>
          )}
        </Section>
      )}

      {/* OVERRIDE */}
      {planRows.length > 0 && (
        <Section title="Manual Override">
          <div className="grid md:grid-cols-3 gap-4">
            <select
              className="inputBox"
              value={selectedTrain}
              onChange={(e) => setSelectedTrain(e.target.value)}
            >
              <option value="">Select Train</option>

              {planRows.map((r) => (
                <option
                  key={r.train_id}
                  value={r.train_id}
                  className="text-black"
                >
                  {r.train_id}
                </option>
              ))}
            </select>

            <select
              className="inputBox"
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
            >
              <option value="RUN" className="text-black">
                RUN
              </option>
              <option value="STANDBY" className="text-black">
                STANDBY
              </option>
              <option value="MAINTENANCE" className="text-black">
                MAINTENANCE
              </option>
            </select>

            <button
              onClick={applyOverride}
              className="px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700"
            >
              Apply Override
            </button>
          </div>
        </Section>
      )}

      {/* COMPARE */}
      {planRows.length > 0 && (
        <Section title="Performance Comparison">
          <button
            onClick={comparePlans}
            disabled={loadingCompare}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700"
          >
            {loadingCompare ? "Comparing..." : "View Comparison"}
          </button>

          {compareExplanation && (
            <div className="mt-4">
              <button
                onClick={() =>
                  openModal("Comparison Explanation", compareExplanation)
                }
                className="px-4 py-2 rounded-xl bg-indigo-600"
              >
                View AI Summary
              </button>
            </div>
          )}
        </Section>
      )}

      {/* FINALIZE */}
      {planRows.length > 0 && (
        <Section title="Finalize Plan">
          <button
            onClick={finalizePlan}
            disabled={loadingFinalize}
            className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 font-bold"
          >
            {loadingFinalize ? "Finalizing..." : "Finalize Plan"}
          </button>

          {finalExplanation && (
            <div className="mt-4">
              <button
                onClick={() =>
                  openModal("Finalize Explanation", finalExplanation)
                }
                className="px-4 py-2 rounded-xl bg-indigo-600"
              >
                View Explanation
              </button>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <h2 className="text-xl font-bold text-cyan-300 mb-5">{title}</h2>
      {children}
    </div>
  );
}

function MiniCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function Badge({ type }) {
  const styles = {
    RUN: "bg-green-600/20 text-green-400 border-green-500/30",
    STANDBY: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    MAINTENANCE: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold border ${
        styles[type] || "bg-slate-600 text-white"
      }`}
    >
      {type}
    </span>
  );
}

function PlanTable({ rows }) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-800">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-slate-800">
          <tr>
            <th className="p-3 text-left">Train</th>
            <th className="text-left">Decision</th>
            <th className="text-left">Risk</th>
            <th className="text-left">Priority</th>
            <th className="text-left">Override</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.train_id}-${i}`}
              className="border-t border-slate-800 hover:bg-slate-900"
            >
              <td className="p-3">{row.train_id}</td>

              <td>
                <Badge type={row.decision} />
              </td>

              <td>{Number(row.risk_score || 0).toFixed(2)}</td>

              <td>{Number(row.priority_score || 0).toFixed(2)}</td>

              <td>{row.override_flag ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[88vh] rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-cyan-400">{title}</h2>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function DataTable({ rows }) {
  const headers = Object.keys(rows[0] || {});

  return (
    <div className="overflow-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-slate-800">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-3 text-left border-b border-slate-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-800 hover:bg-slate-800"
            >
              {headers.map((h) => (
                <td key={h} className="p-3 whitespace-nowrap">
                  {String(row[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareDashboard({ data }) {
  const chartData = [
    {
      name: "RUN",
      Generated: data.generated_run,
      Final: data.final_run,
    },
    {
      name: "STANDBY",
      Generated: data.generated_standby,
      Final: data.final_standby,
    },
    {
      name: "MAINT",
      Generated: data.generated_maintenance,
      Final: data.final_maintenance,
    },
  ];

  const riskBetter = data.risk_delta < 0;

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid md:grid-cols-4 gap-4">
        <MiniCard title="Risk Change" value={`${data.risk_delta_pct}%`} />

        <MiniCard title="Overrides" value={data.override_changes} />

        <MiniCard
          title="RUN Delta"
          value={data.final_run - data.generated_run}
        />

        <MiniCard
          title="Safety"
          value={riskBetter ? "Improved" : "Higher Risk"}
        />
      </div>

      {/* BAR CHART */}
      <div className="h-80 bg-white/5 rounded-2xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Generated" />
            <Bar dataKey="Final" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RISK */}
      <div className="grid md:grid-cols-2 gap-4">
        <MiniCard title="Generated Risk" value={data.avg_risk_generated} />
        <MiniCard title="Final Risk" value={data.avg_risk_final} />
      </div>

      {/* CHANGED TRAINS */}
      <div className="rounded-2xl bg-white/5 p-4">
        <h3 className="font-bold text-cyan-300 mb-3">Changed Trains</h3>

        <div className="flex flex-wrap gap-2">
          {(data.changed_trains || []).length > 0 ? (
            data.changed_trains.map((x) => (
              <span key={x} className="px-3 py-1 rounded-full bg-purple-600">
                {x}
              </span>
            ))
          ) : (
            <p className="text-slate-400">No train changes</p>
          )}
        </div>
      </div>

      {/* AI SUMMARY */}
      <div className="rounded-2xl bg-white/5 p-4">
        <h3 className="font-bold text-cyan-300 mb-3">AI Executive Summary</h3>

        <p className="whitespace-pre-wrap text-slate-300 leading-7">
          {data.ai_summary}
        </p>
      </div>
    </div>
  );
}
