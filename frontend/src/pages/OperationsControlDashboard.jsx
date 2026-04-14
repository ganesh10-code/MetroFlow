import React, { useEffect, useState } from "react";
import api from "../config/axios";

export default function OperationsControlDashboard() {
  const [runCount, setRunCount] = useState(18);
  const [standbyCount, setStandbyCount] = useState(4);
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState(null);

  const loadCurrent = async () => {
    try {
      const res = await api.get("/operations/current-counts");
      setCurrent(res.data);
      setRunCount(res.data.run_count);
      setStandbyCount(res.data.standby_count);
    } catch {}
  };

  useEffect(() => {
    loadCurrent();
  }, []);

  const saveCounts = async () => {
    try {
      await api.post("/operations/set-counts", {
        run_count: Number(runCount),
        standby_count: Number(standbyCount),
      });

      setMessage("Counts updated successfully.");

      loadCurrent();
    } catch {
      setMessage("Failed to update counts.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-emerald-600 to-cyan-700 rounded-2xl p-6">
          <h1 className="text-3xl font-bold">Operations Control Room</h1>
          <p className="text-emerald-100 mt-1">
            Set daily RUN / STANDBY counts
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-2 text-sm text-slate-400">
                Run Count
              </label>

              <input
                type="number"
                value={runCount}
                onChange={(e) => setRunCount(e.target.value)}
                className="w-full bg-slate-800 rounded-xl p-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-slate-400">
                Standby Count
              </label>

              <input
                type="number"
                value={standbyCount}
                onChange={(e) => setStandbyCount(e.target.value)}
                className="w-full bg-slate-800 rounded-xl p-3"
              />
            </div>
          </div>

          <button
            onClick={saveCounts}
            className="bg-emerald-600 px-6 py-3 rounded-xl font-semibold"
          >
            Save Counts
          </button>
        </div>

        {current && (
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold mb-4">
              Current Operational Counts
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <Stat title="RUN" value={current.run_count} />

              <Stat title="STANDBY" value={current.standby_count} />
            </div>

            <p className="mt-4 text-slate-400 text-sm">
              Source: {current.source}
            </p>
          </div>
        )}

        {message && (
          <div className="bg-slate-900 rounded-xl p-4">{message}</div>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
