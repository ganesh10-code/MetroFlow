import React, { useEffect, useState } from 'react';
import api from '../config/axios';

const MaintenanceDashboard = () => {
  const [trains, setTrains] = useState<any[]>([]);

  useEffect(() => {
    fetchTrains();
  }, []);

  const fetchTrains = async () => {
    try {
      const res = await api.get('/maintenance/trains');
      setTrains(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (trainId: string, status: string) => {
    try {
      await api.put(`/maintenance/trains/${trainId}`, { rolling_stock_status: status });
      fetchTrains();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 border-b pb-4">Maintenance Department</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {trains.map((train) => (
            <li key={train.train_id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-metro-600">{train.train_id}</p>
                <p className="text-xs text-gray-500 mt-1">Status: {train.rolling_stock_status || 'UNKNOWN'}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleUpdateStatus(train.train_id, 'OK')} className="px-3 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 hover:bg-green-200">Mark OK</button>
                <button onClick={() => handleUpdateStatus(train.train_id, 'MAINTENANCE_REQUIRED')} className="px-3 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 hover:bg-red-200">Needs Repair</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
