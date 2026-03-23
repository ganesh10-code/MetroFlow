import React, { useEffect, useState } from 'react';
import api from '../config/axios';

const FitnessDashboard = () => {
  const [trains, setTrains] = useState<any[]>([]);

  useEffect(() => {
    fetchTrains();
  }, []);

  const fetchTrains = async () => {
    try {
      const res = await api.get('/fitness/trains');
      setTrains(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (trainId: string, status: string) => {
    try {
      await api.put(`/fitness/trains/${trainId}`, { compliance_status: status });
      fetchTrains();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 border-b pb-4">Fitness & Certification</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {trains.map((train) => (
            <li key={train.train_id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-metro-600">{train.train_id}</p>
                <p className="text-xs text-gray-500 mt-1">Compliance: {train.compliance_status || 'NOT VERIFIED'}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleUpdateStatus(train.train_id, 'FIT')} className="px-3 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 hover:bg-blue-200">Certify Fit</button>
                <button onClick={() => handleUpdateStatus(train.train_id, 'UNSAFE')} className="px-3 py-1 text-xs font-semibold rounded bg-orange-100 text-orange-800 hover:bg-orange-200">Flag Unsafe</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FitnessDashboard;
