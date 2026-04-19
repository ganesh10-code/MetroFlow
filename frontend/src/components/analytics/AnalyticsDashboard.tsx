import React, { useState, useEffect } from 'react';
import { RefreshCw, BarChart3, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../config/axios';
import ChatPanel from './ChatPanel';
import RiskPanel from './RiskPanel';
import LiveEventsPanel from './LiveEventsPanel';

interface Metrics {
  total_trains: number;
  running_trains: number;
  standby_trains: number;
  maintenance_trains: number;
  high_risk_trains: number;
  today_submissions: number;
  maintenance_backlog: number;
  fitness_non_compliant: number;
  timestamp: string;
}

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendsData {
  maintenance_trend: TrendPoint[];
  cleaning_trend: TrendPoint[];
  fitness_trend: TrendPoint[];
  risk_trend: TrendPoint[];
}

interface KafkaEvent {
  timestamp: string;
  department: string;
  event_type: string;
  train_id?: string;
  details: string;
  records_count?: number;
  user_id?: number | null;
}

interface RiskTrain {
  train_id: string;
  urgency_level: string;
  penalty_risk_level: string;
  compliance_status?: string;
  open_job_priority?: string;
  km_since_maintenance: number;
}

// Department Trend Card Component
const DepartmentTrendCard: React.FC<{
  data: TrendPoint[];
  title: string;
  description: string;
  color: string;
}> = ({ data, title, description, color }) => {
  if (!data || data.length === 0) return null;

  const values = data.map(p => p.value);
  const maxVal = Math.max(...values, 1);
  const current = values[values.length - 1] ?? 0;
  const previous = values[values.length - 2] ?? 0;
  const delta = current - previous;
  const trend = delta >= 0 ? '↑' : '↓';

  const colorMap: Record<string, string> = {
    orange: '#f97316',
    purple: '#a855f7',
    blue: '#3b82f6',
    cyan: '#06b6d4',
  };

  const bgColorMap: Record<string, string> = {
    orange: 'from-orange-500/5 to-orange-600/5',
    purple: 'from-purple-500/5 to-purple-600/5',
    blue: 'from-blue-500/5 to-blue-600/5',
    cyan: 'from-cyan-500/5 to-cyan-600/5',
  };

  const borderColorMap: Record<string, string> = {
    orange: 'border-orange-400/40',
    purple: 'border-purple-400/40',
    blue: 'border-blue-400/40',
    cyan: 'border-cyan-400/40',
  };

  const barColor = colorMap[color] || '#3b82f6';

  return (
    <div className={`bg-gradient-to-br ${bgColorMap[color]} border ${borderColorMap[color]} rounded-lg p-4`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h5 className="font-semibold text-white text-sm">{title}</h5>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: barColor }}>{current.toFixed(0)}</div>
          <div className={`text-xs mt-1 ${delta >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {trend} {Math.abs(delta).toFixed(1)} vs yesterday
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-12 flex items-end gap-1 mb-3">
        {data.map((point, idx) => {
          const height = Math.max(4, (point.value / maxVal) * 100);
          return (
            <div
              key={`${point.date}-${idx}`}
              className="flex-1 rounded-t transition-all hover:opacity-100"
              style={{
                height: `${height}%`,
                backgroundColor: barColor,
                opacity: idx === data.length - 1 ? 0.95 : 0.4,
              }}
              title={`${point.date}: ${point.value.toFixed(0)}`}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>Min: {Math.min(...values).toFixed(0)}</span>
        <span>Max: {maxVal.toFixed(0)}</span>
      </div>
    </div>
  );
};

export const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [events, setEvents] = useState<KafkaEvent[]>([]);
  const [riskTrains, setRiskTrains] = useState<RiskTrain[]>([]);

  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRisks, setLoadingRisks] = useState(true);

  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load all data
  const fetchAllData = async () => {
    try {
      setError('');
      const [metricsRes, trendsRes, eventsRes, risksRes] = await Promise.allSettled([
        api.get('/admin/analytics/summary'),
        api.get('/admin/analytics/trends'),
        api.get('/admin/analytics/kafka-live'),
        api.get('/admin/analytics/risks/high-risk-trains'),
      ]);

      let failedCalls = 0;

      if (metricsRes.status === 'fulfilled') {
        console.log('[Analytics] summary:', metricsRes.value.data);
        setMetrics(metricsRes.value.data);
      } else {
        failedCalls += 1;
        console.error('[Analytics] summary failed:', metricsRes.reason);
      }

      if (trendsRes.status === 'fulfilled') {
        console.log('[Analytics] trends:', trendsRes.value.data);
        setTrends(trendsRes.value.data);
      } else {
        failedCalls += 1;
        console.error('[Analytics] trends failed:', trendsRes.reason);
      }

      if (eventsRes.status === 'fulfilled') {
        console.log('[Analytics] kafka-live:', eventsRes.value.data);
        const nextEvents = Array.isArray(eventsRes.value.data?.events) ? eventsRes.value.data.events : [];
        setEvents(nextEvents);
      } else {
        failedCalls += 1;
        console.error('[Analytics] kafka-live failed:', eventsRes.reason);
      }

      if (risksRes.status === 'fulfilled') {
        setRiskTrains(Array.isArray(risksRes.value.data) ? risksRes.value.data : []);
      } else {
        failedCalls += 1;
        console.error('[Analytics] risks failed:', risksRes.reason);
      }

      if (failedCalls > 0) {
        setError(`Some analytics sections failed to refresh (${failedCalls}/4). Live data may still be updating.`);
      }
    } catch (err) {
      console.error('Data fetch error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoadingMetrics(false);
      setLoadingTrends(false);
      setLoadingEvents(false);
      setLoadingRisks(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    if (autoRefresh) {
      const interval = setInterval(fetchAllData, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-cyan-400" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-white">Kafka Real-Time Streaming Analytics</h2>
            <p className="text-xs text-gray-400">Live department events, fleet status, and operational intelligence powered by Apache Kafka</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Data Indicator */}
          <div className="flex items-center gap-2 text-xs px-3 py-1 rounded-full border">
            {events.length > 0 ? (
              <>
                <Wifi className="text-green-400 animate-pulse" size={14} />
                <span className="text-green-400">Live Data</span>
              </>
            ) : (
              <>
                <WifiOff className="text-gray-500" size={14} />
                <span className="text-gray-400">No Incoming Data</span>
              </>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 rounded-lg text-cyan-400 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-400 rounded-lg p-4 text-red-300 flex items-center gap-2"
        >
          <AlertTriangle size={18} />
          {error}
        </motion.div>
      )}

      {/* Fleet Overview Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />
          <h3 className="text-lg font-bold text-white">Fleet Overview</h3>
          <p className="text-xs text-gray-400 ml-auto">Real-time operational snapshot</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Fleet */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-400/30 rounded-xl p-5 hover:border-blue-400/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">🚆</span>
              <span className="text-xs font-mono text-gray-400">FLEET</span>
            </div>
            <div className="text-2xl font-bold text-blue-300">{metrics?.total_trains ?? '—'}</div>
            <p className="text-xs text-gray-400 mt-2">Total trains in fleet</p>
            <p className="text-xs text-gray-500 mt-1">Complete inventory count</p>
          </motion.div>

          {/* Currently Running */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500/15 to-green-600/5 border border-green-400/30 rounded-xl p-5 hover:border-green-400/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">🟢</span>
              <span className="text-xs font-mono text-gray-400">ACTIVE</span>
            </div>
            <div className="text-2xl font-bold text-green-300">{metrics?.running_trains ?? '—'}</div>
            <p className="text-xs text-gray-400 mt-2">Trains in active operation</p>
            <p className="text-xs text-gray-500 mt-1">On-route and running services</p>
          </motion.div>

          {/* Maintenance Pending */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-400/30 rounded-xl p-5 hover:border-orange-400/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">⚙️</span>
              <span className="text-xs font-mono text-gray-400">BACKLOG</span>
            </div>
            <div className="text-2xl font-bold text-orange-300">{metrics?.maintenance_backlog ?? '—'}</div>
            <p className="text-xs text-gray-400 mt-2">Work orders pending</p>
            <p className="text-xs text-gray-500 mt-1">Unfinished maintenance tasks</p>
          </motion.div>

          {/* High Risk Trains */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-500/15 to-red-600/5 border border-red-400/30 rounded-xl p-5 hover:border-red-400/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">⚠️</span>
              <span className="text-xs font-mono text-gray-400">CRITICAL</span>
            </div>
            <div className="text-2xl font-bold text-red-300">{metrics?.high_risk_trains ?? '—'}</div>
            <p className="text-xs text-gray-400 mt-2">Require immediate attention</p>
            <p className="text-xs text-gray-500 mt-1">Urgent compliance issues</p>
          </motion.div>
        </div>
      </motion.div>

      {/* AI Chat Panel - Premium Positioning */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-500 rounded-full" />
          <h3 className="text-lg font-bold text-white">AI-Powered Insights</h3>
          <p className="text-xs text-gray-400 ml-auto">Context-aware analytics assistant</p>
        </div>
        <ChatPanel />
      </motion.div>

      {/* Department-wise Trends Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />
          <h3 className="text-lg font-bold text-white">Department Trends (7-Day)</h3>
          <p className="text-xs text-gray-400 ml-auto">Track daily changes by department</p>
        </div>

        {trends ? (
          <div className="space-y-6">
            {/* Maintenance Department */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-400/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔧</span>
                <div>
                  <h4 className="font-bold text-white">Maintenance Department</h4>
                  <p className="text-xs text-gray-400">Work orders & maintenance backlog</p>
                </div>
              </div>
              {trends.maintenance_trend && trends.maintenance_trend.length > 0 ? (
                <DepartmentTrendCard
                  data={trends.maintenance_trend}
                  title="Pending Work Orders"
                  description="Total maintenance tasks waiting to be completed"
                  color="orange"
                />
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">No maintenance trend data</div>
              )}
            </motion.div>

            {/* Fitness Department */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-400/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✓</span>
                <div>
                  <h4 className="font-bold text-white">Fitness Certification</h4>
                  <p className="text-xs text-gray-400">Compliance & certificate validity</p>
                </div>
              </div>
              {trends.fitness_trend && trends.fitness_trend.length > 0 ? (
                <DepartmentTrendCard
                  data={trends.fitness_trend}
                  title="Non-Compliant Trains"
                  description="Trains with expired or invalid fitness certificates"
                  color="purple"
                />
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">No fitness trend data</div>
              )}
            </motion.div>

            {/* Cleaning Department */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-400/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🧹</span>
                <div>
                  <h4 className="font-bold text-white">Cleaning & Detailing</h4>
                  <p className="text-xs text-gray-400">Hygiene standards & compliance</p>
                </div>
              </div>
              {trends.cleaning_trend && trends.cleaning_trend.length > 0 ? (
                <DepartmentTrendCard
                  data={trends.cleaning_trend}
                  title="Pending Cleaning Tasks"
                  description="Trains requiring detailing and hygiene updates"
                  color="blue"
                />
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">No cleaning trend data</div>
              )}
            </motion.div>

            {/* Risk Score (Operations Monitoring) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-400/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📡</span>
                <div>
                  <h4 className="font-bold text-white">System Risk Assessment</h4>
                  <p className="text-xs text-gray-400">Overall operational health index</p>
                </div>
              </div>
              {trends.risk_trend && trends.risk_trend.length > 0 ? (
                <DepartmentTrendCard
                  data={trends.risk_trend}
                  title="Risk Score"
                  description="Combined assessment of fleet compliance and safety"
                  color="cyan"
                />
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">No risk trend data</div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="bg-slate-600/20 border border-slate-500/50 rounded-lg p-8 text-center text-gray-400">
            <p>No trend data available</p>
          </div>
        )}
      </motion.div>

      {/* Risk & Live Events Section - LIVE EVENTS IS NOW PRIMARY */}
      <div className="space-y-6">
        {/* LIVE EVENTS - FULL WIDTH PREMIUM DISPLAY */}
        <div>
          <LiveEventsPanel
            events={events}
            loading={loadingEvents}
          />
        </div>

        {/* High-Risk Trains - Below Live Events */}
        {riskTrains && riskTrains.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-red-400 to-pink-500 rounded-full" />
              <h3 className="text-lg font-bold text-white">High-Risk Trains</h3>
              <p className="text-xs text-gray-400 ml-auto">Immediate attention required</p>
            </div>
            <RiskPanel
              trains={riskTrains}
              loading={loadingRisks}
            />
          </div>
        )}

        {/* No Risk Trains Message */}
        {!riskTrains || riskTrains.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-500/10 to-green-400/5 border border-green-400/50 rounded-xl p-8"
          >
            <div className="text-center">
              <p className="text-green-400 font-semibold text-lg">✓ No High-Risk Trains</p>
              <p className="text-sm text-gray-400 mt-2">Fleet is operating normally</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-700 pt-4">
        <div>
          {events.length > 0 ? (
            <span className="text-green-500">✓ Kafka: Connected</span>
          ) : (
            <span className="text-gray-500">⊘ Kafka: No events in 24h</span>
          )}
        </div>
        <div>Last updated: {metrics ? formatTime(metrics.timestamp) : 'N/A'}</div>
      </div>
    </motion.div>
  );
};

export default AnalyticsDashboard;
