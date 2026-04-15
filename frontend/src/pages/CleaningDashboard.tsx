// src/pages/CleaningDashboard.jsx

import React, { useEffect, useState } from "react";
import api from "../config/axios";
import toast, { Toaster } from "react-hot-toast";

export default function CleaningDashboard() {
  const [trains, setTrains] = useState([]);
  const [draftRows, setDraftRows] = useState({});
  const [todayRows, setTodayRows] = useState([]);

  const [submittedToday, setSubmittedToday] = useState(false);

  const [locked, setLocked] = useState(false);

  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);

  const [trainId, setTrainId] = useState("");
  const [cleaningDone, setCleaningDone] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    await loadTrains();
    await loadStatus();
    await loadTodayRows();
    await loadPlan();
  };

  // ------------------------------------
  // LOADERS
  // ------------------------------------

  const loadTrains = async () => {
    try {
      const res = await api.get("/cleaning/trains");
      setTrains(res.data || []);
    } catch {
      toast.error("Failed to load trains");
    }
  };

  const loadStatus = async () => {
    try {
      const res = await api.get("/cleaning/status");
      setSubmittedToday(res.data.submitted_today);
    } catch {}

    try {
      const res = await api.get("/planner/is-finalized");
      setLocked(res.data.finalized);
    } catch {}
  };

  const loadTodayRows = async () => {
    try {
      const res = await api.get("/cleaning/today");
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
  // ADD / UPDATE LOCAL ENTRY
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
        cleaning_done: cleaningDone,
      },
    }));

    toast.success("Entry added / updated");

    setTrainId("");
    setCleaningDone(false);
  };

  // ------------------------------------
  // DELETE LOCAL ENTRY
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

      await api.post("/cleaning/submit", Object.values(draftRows));

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
    <Layout>
      <Toaster position="top-right" />

      {!submittedToday && <Warn msg="Today's data not submitted yet." />}

      {locked && <Warn red msg="Today's plan finalized. Submission locked." />}

      {/* ADD ENTRY */}
      <Card title="Add Train Entry">
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
          <div className="grid md:grid-cols-3 gap-5">
            {/* Train */}
            <div>
              <label className="block text-md font-semibold font-medium text-slate-300 mb-3">
                Train ID
              </label>

              <select
                value={trainId}
                onChange={(e) => setTrainId(e.target.value)}
                disabled={locked}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="" className="text-white">
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

            {/* Cleaning */}
            <div>
              <label className="block text-md font-semibold font-medium text-slate-300 mb-3">
                Cleaning Done
              </label>

              <select
                value={cleaningDone ? "YES" : "NO"}
                disabled={locked}
                onChange={(e) => setCleaningDone(e.target.value === "YES")}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option className="text-white">YES</option>

                <option className="text-white">NO</option>
              </select>
            </div>

            {/* Button */}
            <div className="flex items-end">
              <button
                onClick={addRow}
                disabled={locked}
                className="w-full rounded-xl bg-cyan-600 px-6 py-3 font-semibold hover:bg-cyan-700 transition-all duration-200 shadow-lg shadow-cyan-900/30"
              >
                Add / Update
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* LOCAL ENTRIES */}
      <Card title="Pending Local Entries">
        {Object.keys(draftRows).length === 0 ? (
          <Empty text="No pending entries." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Train</th>
                  <th className="py-2 pr-4">Cleaning Done</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {Object.values(draftRows).map((r) => (
                  <tr key={r.train_id} className="border-b border-slate-800">
                    <td className="py-2 pr-4">{r.train_id}</td>

                    <td className="py-2 pr-4">
                      {r.cleaning_done ? "YES" : "NO"}
                    </td>

                    <td className="py-2 pr-4">
                      <button
                        onClick={() => deleteRow(r.train_id)}
                        className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={submitToday}
          disabled={loading || locked || Object.keys(draftRows).length === 0}
          className="px-6 py-3 m-3 font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-700"
        >
          {loading ? "Submitting..." : "Submit Today's Data"}
        </button>
      </Card>

      {/* TODAY DATA */}
      <Card title="Today's Submitted Data">
        {todayRows.length === 0 ? (
          <Empty text="No submitted rows yet." />
        ) : (
          <Table
            headers={["Train", "Cleaning Done", "Updated At"]}
            rows={todayRows.map((r) => [
              r.train_id,
              r.cleaning_done ? "YES" : "NO",
              r.updated_at,
            ])}
          />
        )}
      </Card>

      {/* FINAL PLAN */}
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

/* =======================================
COMMON UI
======================================= */

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
