import React from 'react';
import { Wifi, AlertCircle, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface KafkaEvent {
  timestamp: string;
  department: string;
  event_type: string;
  train_id: string;
  details: string;
  records_count?: number;
  user_id?: number | null;
}

interface LiveEventsPanelProps {
  events: KafkaEvent[];
  loading?: boolean;
}

const getDepartmentColor = (dept: string) => {
  switch (dept) {
    case 'maintenance':
      return {
        bg: 'from-orange-500/20 to-orange-600/10',
        border: 'border-orange-400/40',
        badge: 'bg-orange-500/30 text-orange-300',
        text: 'text-orange-300',
      };
    case 'fitness':
      return {
        bg: 'from-purple-500/20 to-purple-600/10',
        border: 'border-purple-400/40',
        badge: 'bg-purple-500/30 text-purple-300',
        text: 'text-purple-300',
      };
    case 'cleaning':
      return {
        bg: 'from-blue-500/20 to-blue-600/10',
        border: 'border-blue-400/40',
        badge: 'bg-blue-500/30 text-blue-300',
        text: 'text-blue-300',
      };
    case 'operations':
      return {
        bg: 'from-cyan-500/20 to-cyan-600/10',
        border: 'border-cyan-400/40',
        badge: 'bg-cyan-500/30 text-cyan-300',
        text: 'text-cyan-300',
      };
    case 'branding':
      return {
        bg: 'from-pink-500/20 to-pink-600/10',
        border: 'border-pink-400/40',
        badge: 'bg-pink-500/30 text-pink-300',
        text: 'text-pink-300',
      };
    default:
      return {
        bg: 'from-gray-500/20 to-gray-600/10',
        border: 'border-gray-400/40',
        badge: 'bg-gray-500/30 text-gray-300',
        text: 'text-gray-300',
      };
  }
};

const getDepartmentIcon = (dept: string) => {
  switch (dept) {
    case 'maintenance':
      return '🔧';
    case 'fitness':
      return '✓';
    case 'cleaning':
      return '🧹';
    case 'operations':
      return '📡';
    case 'branding':
      return '🎨';
    default:
      return '📌';
  }
};

const getDepartmentLabel = (dept: string) => {
  const labels: Record<string, string> = {
    maintenance: 'Maintenance',
    fitness: 'Fitness Certification',
    cleaning: 'Cleaning & Detailing',
    operations: 'Operations Control',
    branding: 'Branding',
  };
  return labels[dept] || dept.toUpperCase();
};

const formatTimeWithDate = (isoString: string) => {
  try {
    const date = new Date(isoString);
    const time = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const dateStr = date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
    return { time, date: dateStr };
  } catch {
    return { time: 'N/A', date: 'N/A' };
  }
};

export const LiveEventsPanel: React.FC<LiveEventsPanelProps> = ({
  events = [],
  loading = false,
}) => {
  const colors = getDepartmentColor(events[0]?.department || 'operations');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {/* Premium Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-green-500 rounded-full" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">🔴 Live Kafka Event Stream</h2>
            <p className="text-sm text-gray-400 mt-1">Real-time department updates & system events</p>
          </div>
          {events.length > 0 && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500/40 to-green-500/40 border border-cyan-400/60 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-cyan-300">{events.length} Active Events</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Event Display Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-slate-600/60 rounded-2xl overflow-hidden min-h-96"
      >
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
              <p className="text-lg text-gray-400">Connecting to Kafka Stream...</p>
              <p className="text-xs text-gray-500 mt-2">Listening for department events...</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Wifi className="mx-auto mb-4 opacity-30" size={48} />
              <p className="text-xl text-gray-400 font-medium">No Live Events</p>
              <p className="text-sm text-gray-500 mt-2">Waiting for real-time updates...</p>
              <p className="text-xs text-gray-600 mt-4">Events will appear here as departments submit updates</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            <AnimatePresence mode="popLayout">
              {events.slice(0, 20).map((event, idx) => {
                const eventColors = getDepartmentColor(event.department);
                const { time, date } = formatTimeWithDate(event.timestamp);

                return (
                  <motion.div
                    key={`${event.timestamp}-${idx}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`bg-gradient-to-r ${eventColors.bg} border-l-4 ${eventColors.border} hover:from-slate-700/40 hover:to-slate-800/20 transition-all p-6 group`}
                  >
                    <div className="grid grid-cols-12 gap-6 items-start">
                      {/* Department Icon & Name */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`text-4xl ${eventColors.text}`}>
                            {getDepartmentIcon(event.department)}
                          </div>
                          <div className="flex-1">
                            <div className={`inline-block px-3 py-1 ${eventColors.badge} rounded-lg text-xs font-bold mb-2`}>
                              {getDepartmentLabel(event.department)}
                            </div>
                            <p className="text-xs text-gray-500 font-mono">{event.event_type}</p>
                          </div>
                        </div>
                      </div>

                      {/* Main Event Details */}
                      <div className="col-span-6">
                        <h4 className="text-base font-bold text-white mb-2 line-clamp-2">
                          {event.details}
                        </h4>
                        <div className="space-y-1">
                          {event.train_id && event.train_id !== 'N/A' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-400">TRAIN ID:</span>
                              <span className="px-2 py-1 bg-slate-700/80 rounded text-xs font-mono text-cyan-300 font-bold">
                                {event.train_id}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <span className="font-semibold">Records:</span>
                              <span className={`${eventColors.text} font-bold`}>{event.records_count ?? 0}</span>
                            </div>
                            {event.user_id && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <span className="font-semibold">User ID:</span>
                                <span className="text-gray-300">{event.user_id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Timestamp Section */}
                      <div className="col-span-3">
                        <div className="bg-slate-700/40 border border-slate-600/40 rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-2">
                            <Clock size={14} className="text-cyan-400" />
                            <span className="text-xs font-semibold text-gray-400">TIMESTAMP</span>
                          </div>
                          <div className="text-lg font-bold text-cyan-300 font-mono mb-1">{time}</div>
                          <div className="text-xs text-gray-500">{date}</div>
                        </div>

                        {/* Event Sequence Indicator */}
                        <div className="mt-3 flex items-center justify-center">
                          <div className="flex items-center gap-1">
                            <Zap size={12} className="text-green-400" />
                            <span className="text-xs text-green-400 font-semibold">Event #{idx + 1}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Event Status Bar */}
                    <div className="mt-4 pt-4 border-t border-slate-600/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-xs font-semibold text-green-400">PROCESSED</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.records_count && event.records_count > 0
                            ? `${event.records_count} record${event.records_count !== 1 ? 's' : ''} imported`
                            : 'Event logged'}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-gray-600">
                        {event.department.toUpperCase()} → SYSTEM
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Statistics Footer */}
      {events.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3"
        >
          {/* Total Events */}
          <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 font-semibold mb-1">TOTAL EVENTS</p>
            <p className="text-2xl font-bold text-cyan-300">{events.length}</p>
          </div>

          {/* Events by Department */}
          {['maintenance', 'fitness', 'cleaning', 'operations', 'branding'].map((dept) => {
            const count = events.filter((e) => e.department === dept).length;
            if (count === 0) return null;
            const deptColors = getDepartmentColor(dept);
            return (
              <div
                key={dept}
                className={`bg-gradient-to-br ${deptColors.bg} border ${deptColors.border} rounded-lg p-3 text-center`}
              >
                <p className="text-xs text-gray-400 font-semibold mb-1">{getDepartmentLabel(dept).toUpperCase()}</p>
                <p className={`text-2xl font-bold ${deptColors.text}`}>{count}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Department Legend */}
      {events.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-slate-800/40 border border-slate-600/40 rounded-xl p-4"
        >
          <p className="text-xs font-semibold text-gray-400 mb-3 uppercase">Department Color Guide</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔧</span>
              <span className="text-sm text-gray-300">Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <span className="text-sm text-gray-300">Fitness</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧹</span>
              <span className="text-sm text-gray-300">Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📡</span>
              <span className="text-sm text-gray-300">Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <span className="text-sm text-gray-300">Branding</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LiveEventsPanel;
