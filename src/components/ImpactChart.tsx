'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface ImpactChartProps {
  labels: string[];
  beforeData: number[];
  afterData: number[];
  beforeLabel: string;
  afterLabel: string;
}

export default function ImpactChart({ labels, beforeData, afterData, beforeLabel, afterLabel }: ImpactChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [visible, setVisible] = useState(false);

  // Wait until the container is visible before creating the chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: beforeLabel,
            data: beforeData,
            backgroundColor: 'rgba(217, 138, 108, 0.2)',
            borderColor: '#D98A6C',
            borderWidth: 2,
            pointBackgroundColor: '#D98A6C',
            pointRadius: 4,
          },
          {
            label: afterLabel,
            data: afterData,
            backgroundColor: 'rgba(123, 143, 122, 0.2)',
            borderColor: '#7B8F7A',
            borderWidth: 2,
            pointBackgroundColor: '#7B8F7A',
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { display: false },
            grid: { color: '#E5E0D5' },
            angleLines: { color: '#E5E0D5' },
            pointLabels: {
              font: { size: 12, family: 'Montserrat' },
              color: '#2D3748',
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 13, family: 'Montserrat' },
              color: '#2D3748',
              padding: 20,
              usePointStyle: true,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [visible, labels, beforeData, afterData, beforeLabel, afterLabel]);

  return (
    <div ref={containerRef} style={{ minHeight: 300 }}>
      {visible && <canvas ref={canvasRef} />}
    </div>
  );
}
