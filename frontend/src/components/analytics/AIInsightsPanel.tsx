import React from 'react';
import { AlertCircle, CheckCircle2, Lightbulb, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Observation {
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface Risk {
  risk: string;
  impact: string;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Recommendation {
  action: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department: string;
}

interface AIInsightsPanelProps {
  summary: string;
  observations: Observation[];
  risks: Risk[];
  recommendations: Recommendation[];
  loading: boolean;
  lastUpdated?: string;
  onRefresh: () => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500/10 border-red-400 text-red-400';
    case 'WARNING': return 'bg-orange-500/10 border-orange-400 text-orange-400';
    default: return 'bg-blue-500/10 border-blue-400 text-blue-400';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-500/10 border-l-4 border-l-red-400 text-red-400';
    case 'HIGH': return 'bg-orange-500/10 border-l-4 border-l-orange-400 text-orange-400';
    case 'MEDIUM': return 'bg-yellow-500/10 border-l-4 border-l-yellow-400 text-yellow-400';
    default: return 'bg-green-500/10 border-l-4 border-l-green-400 text-green-400';
  }
};

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  summary,
  observations,
  risks,
  recommendations,
  loading,
  lastUpdated,
  onRefresh,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="text-purple-400" size={24} />
          <h3 className="text-xl font-bold text-white">AI Operational Insights</h3>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock size={14} />
              {lastUpdated}
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400 rounded-lg text-purple-400 text-sm transition disabled:opacity-50"
          >
            {loading ? '⏳ Analyzing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/50 rounded-xl p-4">
        <p className="text-gray-200 leading-relaxed">{summary}</p>
      </div>

      {/* Observations */}
      <AnimatePresence>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-400" />
            Observations
          </h4>
          {observations.map((obs, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`border rounded-lg p-3 ${getSeverityColor(obs.severity)}`}
            >
              <div className="font-semibold text-sm mb-1">{obs.title}</div>
              <div className="text-xs opacity-80">{obs.description}</div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Risks */}
      <AnimatePresence>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            Identified Risks
          </h4>
          {risks.map((risk, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-red-500/5 border border-red-400/30 rounded-lg p-3"
            >
              <div className="text-sm font-semibold text-red-300 mb-1">{risk.risk}</div>
              <div className="text-xs text-red-200/80 mb-2">
                <span className="font-semibold">Impact:</span> {risk.impact}
              </div>
              <div className="text-xs text-red-200/80">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  risk.likelihood === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                  risk.likelihood === 'MEDIUM' ? 'bg-orange-500/20 text-orange-300' :
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  Likelihood: {risk.likelihood}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Recommendations */}
      <AnimatePresence>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2">
            <Zap size={16} className="text-green-400" />
            Recommendations
          </h4>
          {recommendations.map((rec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`${getPriorityColor(rec.priority)} rounded-lg p-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">{rec.action}</div>
                  <div className="text-xs opacity-75">{rec.department}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                  rec.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
                  rec.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                  rec.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {rec.priority}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </motion.div>
  );
};

export default AIInsightsPanel;
