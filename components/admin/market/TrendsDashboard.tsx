'use client';

import { useState } from 'react';
import GoogleTrendsWidget from './GoogleTrendsWidget';
import AmazonBestSellers from './AmazonBestSellers';

type InnerTab = 'google' | 'amazon';

export default function TrendsDashboard() {
  const [activeTab, setActiveTab] = useState<InnerTab>('google');

  return (
    <div className="space-y-5">
      {/* Inner tab bar */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('google')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'google'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          <span>📊</span>
          Google Trends
        </button>
        <button
          onClick={() => setActiveTab('amazon')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'amazon'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
          }`}
        >
          <span>📦</span>
          Amazon Best Sellers
        </button>
      </div>

      {/* Content */}
      {activeTab === 'google' && <GoogleTrendsWidget />}
      {activeTab === 'amazon' && <AmazonBestSellers />}
    </div>
  );
}
