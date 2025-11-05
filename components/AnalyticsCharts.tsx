'use client';

import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Pie, PieChart } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TaskTrend {
  date: string;
  completed: number;
  missed: number;
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

export function TaskCompletionChart({ data }: { data: TaskTrend[] }) {
  const latestValue = data[data.length - 1]?.completed || 0;
  const previousValue = data[data.length - 2]?.completed || 0;
  const trend = latestValue > previousValue ? 'up' : latestValue < previousValue ? 'down' : 'stable';

  return (
    <Card className="bg-white rounded-[20px] shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-deep-navy">Task Completion Trend</h3>
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-mint-green" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-coral-red" />}
        {trend === 'stable' && <Minus className="w-5 h-5 text-soft-gray" />}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            stroke="#4A5568"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#4A5568"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#6FCF97"
            strokeWidth={3}
            dot={{ fill: '#6FCF97', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function SentimentPieChart({ data }: { data: SentimentData }) {
  const total = data.positive + data.neutral + data.negative;

  if (total === 0) {
    return (
      <Card className="bg-white rounded-[20px] shadow-md p-6">
        <h3 className="text-lg font-semibold text-deep-navy mb-4">Conversation Sentiment</h3>
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-deep-navy/60">No conversation data yet</p>
        </div>
      </Card>
    );
  }

  const chartData = [
    { name: 'Positive', value: data.positive, color: '#6FCF97' },
    { name: 'Neutral', value: data.neutral, color: '#87CEEB' },
    { name: 'Negative', value: data.negative, color: '#FF6B6B' },
  ].filter(item => item.value > 0);

  return (
    <Card className="bg-white rounded-[20px] shadow-md p-6">
      <h3 className="text-lg font-semibold text-deep-navy mb-4">Conversation Sentiment</h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-3">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-deep-navy">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-deep-navy">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function EngagementScoreCard({ score }: { score: number }) {
  let color = '#FF6B6B';
  let label = 'Needs Attention';

  if (score >= 70) {
    color = '#6FCF97';
    label = 'Excellent';
  } else if (score >= 50) {
    color = '#87CEEB';
    label = 'Good';
  } else if (score >= 30) {
    color = '#FFA500';
    label = 'Fair';
  }

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="bg-white rounded-[20px] shadow-md p-6">
      <h3 className="text-lg font-semibold text-deep-navy mb-4 text-center">Engagement Score</h3>
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="#E5E7EB"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-deep-navy">{score}</span>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium" style={{ color }}>
          {label}
        </p>
        <p className="text-xs text-deep-navy/60 mt-1 text-center">
          Based on task completion, conversations, and response times
        </p>
      </div>
    </Card>
  );
}

export function QuickStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  colorClass: string;
}) {
  return (
    <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center`}>
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
        {trend && (
          <div>
            {trend === 'up' && <TrendingUp className="w-5 h-5 text-mint-green" />}
            {trend === 'down' && <TrendingDown className="w-5 h-5 text-coral-red" />}
            {trend === 'stable' && <Minus className="w-5 h-5 text-soft-gray" />}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-deep-navy/60 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-deep-navy mb-1">{value}</p>
      <p className="text-sm text-deep-navy/60">{subtitle}</p>
    </Card>
  );
}
