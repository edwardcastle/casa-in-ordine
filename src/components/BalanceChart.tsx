'use client';

import { useEffect, useRef, useState } from 'react';
import type { Chart as ChartType } from 'chart.js';

interface BalanceChartProps {
  labels: string[];
  data: number[];
  title: string;
}

export default function BalanceChart({ labels, data, title }: BalanceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartType<'doughnut'> | null>(null);
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

    // Load chart.js only once this chart scrolls into view, keeping the library
    // out of the homepage's initial download + hydration path.
    let cancelled = false;
    let chart: ChartType<'doughnut'> | null = null;

    (async () => {
      const { Chart, DoughnutController, ArcElement, Tooltip, Legend } = await import('chart.js');
      Chart.register(DoughnutController, ArcElement, Tooltip, Legend);
      if (cancelled || !canvasRef.current) return;

      chartRef.current?.destroy();
      chart = new Chart(canvasRef.current, {
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
            afterDraw(c) {
              const { ctx, width, height } = c;
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
      chartRef.current = chart;
    })();

    return () => {
      cancelled = true;
      chart?.destroy();
      chartRef.current = null;
    };
  }, [visible, labels, data, title]);

  return (
    <div ref={containerRef} className="flex items-center justify-center" style={{ minHeight: 112 }}>
      {visible && <canvas ref={canvasRef} width={112} height={112} />}
    </div>
  );
}
