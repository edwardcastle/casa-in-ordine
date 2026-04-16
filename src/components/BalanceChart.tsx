'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface BalanceChartProps {
  labels: string[];
  data: number[];
  title: string;
}

export default function BalanceChart({ labels, data, title }: BalanceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'doughnut'> | null>(null);
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
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: ['#2D3748', '#D98A6C'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
      plugins: [
        {
          id: 'centerText',
          afterDraw(chart) {
            const { ctx, width, height } = chart;
            ctx.save();
            ctx.font = 'bold 11px Montserrat';
            ctx.fillStyle = '#2D3748';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${data[0]}/${data[1]}`, width / 2, height / 2);
            ctx.restore();
          },
        },
      ],
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [visible, labels, data, title]);

  return (
    <div ref={containerRef} className="flex items-center justify-center" style={{ minHeight: 112 }}>
      {visible && <canvas ref={canvasRef} width={112} height={112} />}
    </div>
  );
}
