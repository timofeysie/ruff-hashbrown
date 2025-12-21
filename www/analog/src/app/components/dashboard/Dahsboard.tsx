import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

const tokenUsageData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Token Usage',
      data: [1200, 1900, 1000, 2100, 2300, 1800],
      fill: false,
      backgroundColor: '#ff9800',
      borderColor: '#ff9800',
      tension: 0.2,
    },
  ],
};

const hashbrownStats = {
  labels: ['Active Users', 'Total Hashbrowns', 'Failed Tasks'],
  datasets: [
    {
      label: 'Stats',
      data: [68, 195, 8],
      backgroundColor: [
        'rgba(255, 152, 0, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(244, 67, 54, 0.8)',
      ],
      borderWidth: 1,
    },
  ],
};

function Dashboard() {
  return (
    <div style={{ padding: 32 }}>
      <h2>Hashbrown Dashboard</h2>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 400px', background: '#fff8e1', borderRadius: 12, padding: 24 }}>
          <h3>Token Usage (last 6 months)</h3>
          <Line data={tokenUsageData} options={{ plugins: { legend: { display: false } } }} />
        </div>
        <div style={{ flex: '1 1 300px', background: '#f3e5f5', borderRadius: 12, padding: 24 }}>
          <h3>Quick Stats</h3>
          <Doughnut data={hashbrownStats} options={{ plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        <h3>Hashbrown Activity Feed</h3>
        <ul>
          <li>🥇 User123 completed "Make hashbrowns" task</li>
          <li>🔥 8 total failed hashbrown attempts this week</li>
          <li>⚡ Most active: User456</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;