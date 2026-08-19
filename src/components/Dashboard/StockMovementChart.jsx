import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TrendingUp, ArrowUpFromLine, ArrowDownToLine, Calendar, RefreshCw } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function StockMovementChart() {
  const [days, setDays] = useState(7);
  const [movementData, setMovementData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMovement = async (selectedDays) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/movement?days=${selectedDays}`);
      if (res.ok) {
        const data = await res.json();
        setMovementData(data.dailyMovement || []);
      }
    } catch (err) {
      console.error('Failed to fetch movement data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovement(days);
  }, [days]);

  // Format dates to Thai short date (e.g. 19 ส.ค.)
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10) - 1;
      return `${d} ${thaiMonthsShort[m] || ''}`;
    }
    return dateStr;
  };

  // Generate full date range so there are no missing date gaps
  const fullDateLabels = [];
  const outDataMap = {};
  const inDataMap = {};

  (movementData || []).forEach(item => {
    outDataMap[item.date_str] = Number(item.total_out) || 0;
    inDataMap[item.date_str] = Number(item.total_in) || 0;
  });

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    fullDateLabels.push(dateStr);
  }

  const chartLabels = fullDateLabels.map(formatDateLabel);
  const chartOutData = fullDateLabels.map(d => outDataMap[d] || 0);
  const chartInData = fullDateLabels.map(d => inDataMap[d] || 0);

  const totalOut = chartOutData.reduce((a, b) => a + b, 0);
  const totalIn = chartInData.reduce((a, b) => a + b, 0);

  const chartConfig = {
    labels: chartLabels,
    datasets: [
      {
        label: 'เบิกออก (ชิ้น)',
        data: chartOutData,
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderColor: '#dc2626',
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 28
      },
      {
        label: 'รับเข้า (ชิ้น)',
        data: chartInData,
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 28
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#475569',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          font: { size: 12, weight: 600 }
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        titleFont: { size: 13, weight: 700 },
        bodyFont: { size: 12 },
        cornerRadius: 6,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.raw} ชิ้น`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.8)' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          stepSize: 5,
          precision: 0
        }
      }
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--primary)" />
            แนวโน้มการเบิกจ่ายและรับเข้าสินค้า
          </h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            เปรียบเทียบยอดการเบิกออกและการรับเข้าตามช่วงเวลา
          </span>
        </div>

        {/* Time Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-main)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {[
            { label: '7 วัน', value: 7 },
            { label: '14 วัน', value: 14 },
            { label: '30 วัน', value: 30 }
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              style={{
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: days === opt.value ? 'var(--primary)' : 'transparent',
                color: days === opt.value ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          backgroundColor: 'rgba(239, 68, 68, 0.06)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <ArrowUpFromLine size={16} color="#ef4444" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>เบิกออกรวม:</span>
          <strong style={{ fontSize: '0.95rem', color: '#ef4444' }}>{totalOut} ชิ้น</strong>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          backgroundColor: 'rgba(16, 185, 129, 0.06)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <ArrowDownToLine size={16} color="#10b981" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>รับเข้ารวม:</span>
          <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>{totalIn} ชิ้น</strong>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ height: '240px', position: 'relative' }}>
        {isLoading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" />
          </div>
        ) : (
          <Bar data={chartConfig} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
