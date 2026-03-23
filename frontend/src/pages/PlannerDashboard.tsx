import React, { useEffect, useState } from 'react';
import api from '../config/axios';

const PlannerDashboard = () => {
  const [summary, setSummary] = useState<any>(null);
  const [planResult, setPlanResult] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState<{ role: string, msg: string }[]>([]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/planner/summary');
      setSummary(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      const res = await api.post('/planner/generate-plan');
      setPlanResult(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoadingPlan(false);
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const userMsg = query;
    setChatLog(prev => [...prev, { role: 'user', msg: userMsg }]);
    setQuery('');
    try {
      const res = await api.post('/planner/assistant', { query: userMsg });
      setChatLog(prev => [...prev, { role: 'ai', msg: res.data.response }]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Readiness Overview</h1>
        
        {/* Readiness Cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-500">Total Trains</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{summary.total_trains}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-l-4 border-green-500">
              <p className="text-sm font-medium text-gray-500">Ready</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{summary.ready_for_induction}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-l-4 border-yellow-500">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{summary.maintenance_pending}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:p-6 flex justify-between items-center border-b">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Induction Plan Generation</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Run the core optimization ML engine.</p>
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={loadingPlan}
              className="bg-metro-600 hover:bg-metro-700 text-white font-bold py-2 px-4 rounded shadow disabled:opacity-50"
            >
              {loadingPlan ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>
          
          {planResult && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50">
              <h4 className="font-medium text-metro-900">Generated Plan: {planResult.plan.plan_id}</h4>
              <p className="text-sm mt-2 text-gray-700 bg-white p-3 border rounded shadow-sm">
                <strong>Explanation: </strong> {planResult.explanation}
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium">Selected Trains:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {planResult.plan.selected_trains.map((tid: string) => (
                    <span key={tid} className="bg-white border rounded px-2 py-1 text-xs font-semibold">{tid}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-1 border-l pl-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-metro-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
          GenAI Assistant
        </h2>
        
        <div className="bg-white h-96 rounded-lg shadow flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatLog.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-10">Ask me why a train was not selected or about risk parameters.</p>
            ) : (
              chatLog.map((c, i) => (
                <div key={i} className={`text-sm p-3 rounded-lg ${c.role === 'user' ? 'bg-metro-100 text-metro-900 ml-auto w-3/4 shadow-sm' : 'bg-gray-100 text-gray-800 mr-auto w-3/4'}`}>
                  {c.msg}
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t">
            <form onSubmit={handleAskAssistant} className="flex">
              <input
                type="text"
                className="flex-1 border rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-metro-500"
                placeholder="Ask assistant..."
                value={query} onChange={e => setQuery(e.target.value)}
              />
              <button type="submit" className="bg-metro-600 text-white px-3 py-2 rounded-r-md text-sm hover:bg-metro-700">Send</button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PlannerDashboard;
