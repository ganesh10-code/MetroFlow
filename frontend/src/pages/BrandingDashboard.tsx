import React, { useEffect, useState } from 'react';
import api from '../config/axios';

const BrandingDashboard = () => {
  const [trains, setTrains] = useState<any[]>([]);

  useEffect(() => {
    fetchTrains();
  }, []);

  const fetchTrains = async () => {
    try {
      const res = await api.get('/branding/trains');
      setTrains(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePriority = async (trainId: string, advertiser: string) => {
    try {
      await api.put(`/branding/trains/${trainId}`, { advertiser_name: advertiser });
      fetchTrains();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 border-b pb-4">Branding & Logistics</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {trains.map((train) => (
          <div key={train.train_id} className="border rounded-lg shadow-sm p-4 hover:shadow-md transition bg-gray-50 text-sm">
            <h3 className="font-semibold text-lg text-metro-600 mb-2">{train.train_id}</h3>
            <p><strong>Current Ad:</strong> {train.advertiser_name || 'None'}</p>
            <p><strong>Risk Level:</strong> {train.penalty_risk_level || 'LOW'}</p>
            
            <div className="mt-4 pt-3 border-t">
              <label className="block text-xs font-medium text-gray-700 mb-1">Set New Advertiser</label>
              <div className="flex space-x-2">
                <input id={`ad-${train.train_id}`} className="flex-1 w-full border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-metro-500" placeholder="e.g. Coca Cola" />
                <button 
                  onClick={() => {
                    const el = document.getElementById(`ad-${train.train_id}`) as HTMLInputElement;
                    handleUpdatePriority(train.train_id, el.value);
                  }} 
                  className="bg-metro-600 text-white px-2 py-1 rounded hover:bg-metro-700 font-medium">Save</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandingDashboard;
