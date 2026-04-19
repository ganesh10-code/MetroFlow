import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RiskTrain {
  train_id: string;
  urgency_level: string;
  penalty_risk_level: string;
  compliance_status?: string;
  open_job_priority?: string;
  km_since_maintenance: number;
}

interface RiskPanelProps {
  trains: RiskTrain[];
  loading?: boolean;
  onTrainClick?: (trainId: string) => void;
}

const getRiskColor = (urgency: string, penalty: string) => {
  if (urgency === 'CRITICAL' || penalty === 'HIGH') {
    return 'bg-red-500/10 border-l-4 border-l-red-500 text-red-300';
  }
  if (urgency === 'HIGH') {
    return 'bg-orange-500/10 border-l-4 border-l-orange-500 text-orange-300';
  }
  return 'bg-yellow-500/10 border-l-4 border-l-yellow-500 text-yellow-300';
};

export const RiskPanel: React.FC<RiskPanelProps> = ({
  trains = [],
  loading = false,
  onTrainClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-700/20 to-slate-800/20 border border-slate-600/50 rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="text-red-400" size={20} />
        <h3 className="text-lg font-bold text-white">⚠️ High Risk Trains</h3>
        {trains.length > 0 && (
          <span className="ml-auto px-3 py-1 bg-red-500/20 border border-red-400/50 rounded-full text-xs font-semibold text-red-300">
            {trains.length} Trains
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">
          <div className="inline-block animate-spin">⏳</div> Loading...
        </div>
      ) : trains.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Zap className="mx-auto mb-3 opacity-50" size={24} />
          <p className="text-sm">No high-risk trains detected</p>
          <p className="text-xs mt-1 text-gray-500">Great operational status!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {trains.map((train, idx) => (
              <motion.div
                key={train.train_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onTrainClick?.(train.train_id)}
                className={`p-4 rounded-lg cursor-pointer transition ${getRiskColor(
                  train.urgency_level,
                  train.penalty_risk_level
                )} hover:opacity-80`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-white">{train.train_id}</div>
                  <div className="flex gap-2">
                    {train.urgency_level === 'CRITICAL' && (
                      <span className="px-2 py-1 bg-red-500/30 rounded text-xs font-bold">
                        CRITICAL
                      </span>
                    )}
                    {train.penalty_risk_level === 'HIGH' && (
                      <span className="px-2 py-1 bg-orange-500/30 rounded text-xs font-bold">
                        PENALTY RISK
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1 opacity-80">
                  {train.open_job_priority && (
                    <p>
                      <span className="font-semibold">Open Job:</span>{' '}
                      {train.open_job_priority}
                    </p>
                  )}
                  {train.km_since_maintenance > 0 && (
                    <p>
                      <span className="font-semibold">KM since service:</span>{' '}
                      {train.km_since_maintenance}
                    </p>
                  )}
                  {train.compliance_status && (
                    <p>
                      <span className="font-semibold">Compliance:</span>{' '}
                      {train.compliance_status}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default RiskPanel;
