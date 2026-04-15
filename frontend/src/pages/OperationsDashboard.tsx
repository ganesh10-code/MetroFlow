// src/pages/OperationsDashboard.tsx

import React, { useEffect, useState } from "react";
import api from "../config/axios";
import toast, { Toaster } from "react-hot-toast";

export default function OperationsDashboard() {
  const [runCount, setRunCount] = useState(18);
  const [standbyCount, setStandbyCount] = useState(4);
  const [maintenanceCount, setMaintenanceCount] = useState(3);

  const [todayCounts, setTodayCounts] = useState<any>(null);

  const [trains, setTrains] = useState<any[]>([]);
  const [draftRows, setDraftRows] = useState<any>({});
  const [todayMileage, setTodayMileage] = useState<any[]>([]);

  const [maintenanceTrains, setMaintenanceTrains] = useState<string[]>([]);

  const [trainId, setTrainId] = useState("");
  const [mileage, setMileage] = useState("");

  const [submittedToday, setSubmittedToday] = useState(false);
  const [locked, setLocked] = useState(false);

  const [plan, setPlan] = useState<any[]>([]);

  const [loadingCounts, setLoadingCounts] = useState(false);
  const [loadingMileage, setLoadingMileage] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    await loadTrains();
    await loadStatus();
    await loadCounts();
    await loadMileage();
    await loadPlan();
    await loadMaintenanceTrains();
  };

  // ------------------------------------
  // LOADERS
  // ------------------------------------

  const loadTrains = async () => {
    try {
      const res = await api.get("/operations/trains");
      setTrains(res.data || []);
    } catch {
      toast.error("Failed to load trains");
    }
  };

  const loadStatus = async () => {
    try {
      const res = await api.get("/operations/status");
      setSubmittedToday(res.data.submitted_today);
    } catch {}

    try {
      const res = await api.get("/planner/is-finalized");
      setLocked(res.data.finalized);
    } catch {}
  };

  const loadCounts = async () => {
    try {
      const res = await api.get("/operations/current-counts");

      if (res.data.source === "today") {
        setTodayCounts(res.data);
      } else {
        setTodayCounts(null);
      }

      setRunCount(res.data.run_count);
      setStandbyCount(res.data.standby_count);
      setMaintenanceCount(res.data.maintenance_count);
    } catch {}
  };

  const loadMileage = async () => {
    try {
      const res = await api.get("/operations/mileage/today");
      setTodayMileage(res.data || []);
    } catch {}
  };

  const loadPlan = async () => {
    try {
      const res = await api.get("/planner/final-plan");
      setPlan(res.data || []);

      await loadMaintenanceTrains();
    } catch {}
  };

  const loadMaintenanceTrains = async () => {
    try {
      const res = await api.get("/planner/maintenance-trains");

      const cleaned = (res.data || []).map((x: string) =>
        String(x).trim().toUpperCase(),
      );

      setMaintenanceTrains(cleaned);
    } catch {}
  };

  // ------------------------------------
  // HELPERS
  // ------------------------------------

  const isMaintenanceTrain = (id: string) =>
    maintenanceTrains.includes(String(id).trim().toUpperCase());

  // ------------------------------------
  // COUNTS SUBMIT
  // ------------------------------------

  const submitCounts = async () => {
    try {
      setLoadingCounts(true);

      await api.post("/operations/submit", {
        run_count: Number(runCount),
        standby_count: Number(standbyCount),
        maintenance_count: Number(maintenanceCount),
      });

      toast.success("Today's counts submitted");

      await loadStatus();
      await loadCounts();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Submission failed");
    } finally {
      setLoadingCounts(false);
    }
  };

  // ------------------------------------
  // LOCAL MILEAGE
  // ------------------------------------

  const addRow = () => {
    if (!trainId) {
      toast.error("Select Train");
      return;
    }

    if (isMaintenanceTrain(trainId)) {
      toast.error("Maintenance trains cannot add mileage");
      return;
    }

    setDraftRows((prev: any) => ({
      ...prev,
      [trainId]: {
        train_id: trainId,
        mileage_today: Number(mileage || 0),
      },
    }));

    toast.success("Mileage added / updated");

    setTrainId("");
    setMileage("");
  };

  const deleteRow = (id: string) => {
    const temp = { ...draftRows };
    delete temp[id];
    setDraftRows(temp);

    toast.success("Entry removed");
  };

  // ------------------------------------
  // SUBMIT MILEAGE
  // ------------------------------------

  const submitMileage = async () => {
    try {
      setLoadingMileage(true);

      await api.post("/operations/mileage/submit", Object.values(draftRows));

      setDraftRows({});

      toast.success("Today's mileage submitted");

      await loadMileage();
      await loadPlan();
      await loadMaintenanceTrains();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Submission failed");
    } finally {
      setLoadingMileage(false);
    }
  };

  return (
    <Layout>
      <Toaster position="top-right" />

      {!submittedToday && <Warn msg="Today's data not submitted yet." />}

      {locked && <Warn red msg="Today's plan finalized. Submission locked." />}

      {/* COUNTS ENTRY */}
      <Card title="Daily Operational Counts">
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
          <div className="grid md:grid-cols-4 gap-5">
            <Field
              label="Run Count"
              value={runCount}
              onChange={(e: any) => setRunCount(e.target.value)}
            />

            <Field
              label="Standby Count"
              value={standbyCount}
              onChange={(e: any) => setStandbyCount(e.target.value)}
            />

            <Field
              label="Maintenance Count"
              value={maintenanceCount}
              onChange={(e: any) => setMaintenanceCount(e.target.value)}
            />

            <div className="flex items-end">
              <button
                onClick={submitCounts}
                disabled={locked}
                className="w-full rounded-xl bg-cyan-600 px-6 py-3 font-semibold hover:bg-cyan-700"
              >
                {loadingCounts ? "Submitting..." : "Submit Counts"}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* TODAY COUNTS */}
      <Card title="Today's Submitted Counts">
        {!todayCounts ? (
          <Empty text="No counts submitted today." />
        ) : (
          <Table
            headers={["Run", "Standby", "Maintenance", "Updated At"]}
            rows={[
              [
                todayCounts.run_count,
                todayCounts.standby_count,
                todayCounts.maintenance_count,
                todayCounts.updated_at,
              ],
            ]}
          />
        )}
      </Card>

      {/* ADD ENTRY */}
      <Card title="Train Mileage Input">
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="block text-md font-semibold text-slate-300 mb-3">
                Train ID
              </label>

              <select
                value={trainId}
                onChange={(e) => setTrainId(e.target.value)}
                disabled={locked}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              >
                <option value="">Select Train</option>

                {trains.map((t) => {
                  const disabled = isMaintenanceTrain(t.train_id);

                  return (
                    <option
                      key={t.train_id}
                      value={t.train_id}
                      disabled={disabled}
                      className="text-white"
                    >
                      {disabled ? `${t.train_id} (MAINTENANCE)` : t.train_id}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-md font-semibold text-slate-300 mb-3">
                Mileage Today
              </label>

              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                disabled={locked}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={addRow}
                disabled={locked}
                className="w-full rounded-xl bg-cyan-600 px-6 py-3 font-semibold hover:bg-cyan-700"
              >
                Add / Update
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* LOCAL */}
      <Card title="Pending Mileage Entries">
        {Object.keys(draftRows).length === 0 ? (
          <Empty text="No pending mileage rows." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Train</th>
                  <th className="py-2 pr-4">Mileage</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {Object.values(draftRows).map((r: any) => (
                  <tr key={r.train_id} className="border-b border-slate-800">
                    <td className="py-2 pr-4">{r.train_id}</td>
                    <td className="py-2 pr-4">{r.mileage_today}</td>

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
          onClick={submitMileage}
          disabled={
            loadingMileage || locked || Object.keys(draftRows).length === 0
          }
          className="px-6 py-3 m-3 font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-700"
        >
          {loadingMileage ? "Submitting..." : "Submit Today's Mileage"}
        </button>
      </Card>

      {/* TODAY SAVED */}
      <Card title="Today's Submitted Mileage">
        {todayMileage.length === 0 && maintenanceTrains.length === 0 ? (
          <Empty text="No mileage submitted yet." />
        ) : (
          <Table
            headers={["Train", "Mileage", "Updated At"]}
            rows={[
              ...todayMileage.map((r: any) => [
                r.train_id,
                r.mileage_today,
                r.updated_at,
              ]),

              ...maintenanceTrains
                .filter(
                  (id) => !todayMileage.find((x: any) => x.train_id === id),
                )
                .map((id) => [id, 0, "Auto (Maintenance)"]),
            ]}
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
            rows={plan.map((p: any) => [p.train_id, p.decision])}
          />
        )}
      </Card>
    </Layout>
  );
}

/* ====================================== */

function Layout({ children }: any) {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">{children}</div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Warn({ msg, red }: any) {
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

function Empty({ text }: any) {
  return <p className="text-slate-400">{text}</p>;
}

function Field({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-md font-semibold text-slate-300 mb-3">
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
      />
    </div>
  );
}

function Table({ headers, rows }: any) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left">
        <thead className="border-b border-slate-700 text-slate-400">
          <tr>
            {headers.map((h: string) => (
              <th key={h} className="py-2 pr-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r: any[], i: number) => (
            <tr key={i} className="border-b border-slate-800">
              {r.map((c: any, j: number) => (
                <td key={j} className="py-2 pr-4">
                  {String(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
