import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useDashboard } from '../../hooks/useDashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

ChartJS.defaults.color = '#64748b';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.scale.grid.color = '#f1f5f9';

export function StockChart() {
  const { categoryBreakdown } = useDashboard();
  
  const labels = Object.keys(categoryBreakdown);
  const data = Object.values(categoryBreakdown);

  const pieData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: [
          '#002d74', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#1e293b',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16
        }
      }
    }
  };

  if (labels.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>ไม่มีข้อมูลสำหรับแสดงกราฟ</div>;
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      height: '300px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>สัดส่วนสินค้าตามหมวดหมู่</h3>
      <div style={{ height: '230px' }}>
        <Pie data={pieData} options={pieOptions} />
      </div>
    </div>
  );
}
