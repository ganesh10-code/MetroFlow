// src/pages/FitnessDashboard.jsx

import React, { useEffect, useState } from "react";
import api from "../config/axios";
import toast, { Toaster } from "react-hot-toast";

export default function FitnessDashboard() {
  const [trains, setTrains] = useState([]);
  const [draftRows, setDraftRows] = useState({});
  const [todayRows, setTodayRows] = useState([]);

  const [submittedToday, setSubmittedToday] = useState(false);

  const [locked, setLocked] = useState(false);

  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);

  const [trainId, setTrainId] = useState("");
  const [status, setStatus] = useState("FIT");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    await loadTrains();
    await loadStatus();
    await loadTodayRows();
    await loadPlan();
  };

  const loadTrains = async () => {
    try {
      const res = await api.get("/fitness/trains");

      setTrains(res.data || []);
    } catch {
      toast.error("Failed to load trains");
    }
  };

  const loadStatus = async () => {
    try {
      const res = await api.get("/fitness/status");

      setSubmittedToday(res.data.submitted_today);
    } catch {}

    try {
      const res = await api.get("/planner/is-finalized");

      setLocked(res.data.finalized);
    } catch {}
  };

  const loadTodayRows = async () => {
    try {
      const res = await api.get("/fitness/today");

      setTodayRows(res.data || []);
    } catch {}
  };

  const loadPlan = async () => {
    try {
      const res = await api.get("/planner/final-plan");

      setPlan(res.data || []);
    } catch {}
  };

  // ------------------------------------
  // ADD / UPDATE
  // ------------------------------------

  const addRow = () => {
    if (!trainId) {
      toast.error("Select Train");
      return;
    }

    setDraftRows((prev) => ({
      ...prev,
      [trainId]: {
        train_id: trainId,
        compliance_status: status,
      },
    }));

    toast.success("Entry added / updated");

    setTrainId("");
    setStatus("FIT");
  };

  // ------------------------------------
  // DELETE
  // ------------------------------------

  const deleteRow = (id) => {
    const temp = { ...draftRows };
    delete temp[id];
    setDraftRows(temp);

    toast.success("Entry removed");
  };

  // ------------------------------------
  // SUBMIT
  // ------------------------------------

  const submitToday = async () => {
    try {
      setLoading(true);

      await api.post("/fitness/submit", Object.values(draftRows));

      setDraftRows({});

      toast.success("Today's data submitted");

      await loadStatus();
      await loadTodayRows();
      await loadPlan();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Fitness Department">
      <Toaster position="top-right" />

      {!submittedToday && <Warn msg="Today's data not submitted yet." />}

      {locked && <Warn red msg="Today's plan finalized. Submission locked." />}

      {/* ADD ENTRY */}
      <Card title="Add Train Entry">
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
          <div className="grid md:grid-cols-3 gap-5">
            {/* Train */}
            <div>
              <label className="block text-md font-medium font-semibold text-slate-300 mb-3">
                Train ID
              </label>

              <select
                value={trainId}
                onChange={(e) => setTrainId(e.target.value)}
                disabled={locked}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              >
                <option value="" className="bg-white text-black">
                  Select Train
                </option>

                {trains.map((t) => (
                  <option
                    key={t.train_id}
                    value={t.train_id}
                    className="text-white"
                  >
                    {t.train_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-md font-semibold font-medium text-slate-300 mb-3">
                Compliance Status
              </label>

              <select
                value={status}
                disabled={locked}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              >
                <option className="text-white">FIT</option>

                <option className="text-white">UNSAFE</option>
              </select>
            </div>

            {/* Button */}
            <div className="flex items-end">
              <button
                onClick={addRow}
                disabled={locked}
                className="w-full rounded-xl bg-cyan-600 px-6 py-3 font-semibold hover:bg-cyan-700 transition-all"
              >
                Add / Update
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* LOCAL */}
      <Card title="Pending Local Entries">
        {Object.keys(draftRows).length === 0 ? (
          <Empty text="No pending entries." />
        ) : (
          <Table
            headers={["Train", "Status", "Action"]}
            rows={Object.values(draftRows).map((r) => [
              r.train_id,
              r.compliance_status,
              <button
                onClick={() => deleteRow(r.train_id)}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>,
            ])}
          />
        )}

        <button
          onClick={submitToday}
          disabled={loading || locked || Object.keys(draftRows).length === 0}
          className="px-6 py-3 m-3 font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-700"
        >
          {loading ? "Submitting..." : "Submit Today's Data"}
        </button>
      </Card>

      {/* TODAY */}
      <Card title="Today's Submitted Data">
        {todayRows.length === 0 ? (
          <Empty text="No submitted rows yet." />
        ) : (
          <Table
            headers={["Train", "Status", "Updated At"]}
            rows={todayRows.map((r) => [
              r.train_id,
              r.compliance_status,
              r.updated_at,
            ])}
          />
        )}
      </Card>

      {/* PLAN */}
      <Card title="Finalized Plan">
        {plan.length === 0 ? (
          <Empty text="No finalized plan available." />
        ) : (
          <Table
            headers={["Train", "Decision"]}
            rows={plan.map((p) => [p.train_id, p.decision])}
          />
        )}
      </Card>
    </Layout>
  );
}

/* ===================================== */

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">{children}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Warn({ msg, red }) {
  return (
    <div
      className={`rounded-xl p-4 font-semibold ${
        red ? "bg-red-600" : "bg-yellow-500 text-black"
      }`}
    >
      {msg}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-slate-400">{text}</p>;
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left">
        <thead className="border-b border-slate-700 text-slate-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="py-2 pr-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-800">
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
