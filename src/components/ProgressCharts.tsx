'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

interface ProgressChartsProps {
  user: User;
  onBack: () => void;
}

interface CheckInData {
  date: string;
  mood_score: number;
  energy_level: number;
  sleep_quality: number;
  trigger_tags: string[];
}

export default function ProgressCharts({ user, onBack }: ProgressChartsProps) {
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);
  const [triggerStats, setTriggerStats] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));
    
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('date, mood_score, energy_level, sleep_quality, trigger_tags')
      .eq('user_id', user.id)
      .gte('date', daysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (data && !error) {
      setCheckIns(data);
      calculateTriggerStats(data);
    }
    
    setLoading(false);
  };

  const calculateTriggerStats = (data: CheckInData[]) => {
    const stats: { [key: string]: number } = {};
    
    data.forEach(checkIn => {
      if (checkIn.trigger_tags) {
        checkIn.trigger_tags.forEach(trigger => {
          stats[trigger] = (stats[trigger] || 0) + 1;
        });
      }
    });
    
    setTriggerStats(stats);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Mood Trend Chart Data
  const moodChartData = {
    labels: checkIns.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'Mood Score',
        data: checkIns.map(item => item.mood_score || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  // Energy & Sleep Chart Data
  const energySleepChartData = {
    labels: checkIns.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'Energy Level',
        data: checkIns.map(item => item.energy_level || 0),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Sleep Quality',
        data: checkIns.map(item => item.sleep_quality || 0),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Trigger Frequency Chart Data
  const triggerChartData = {
    labels: Object.keys(triggerStats).slice(0, 8), // Top 8 triggers
    datasets: [
      {
        label: 'Frequency',
        data: Object.values(triggerStats).slice(0, 8),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 101, 101, 0.8)',
          'rgba(252, 165, 165, 0.8)',
          'rgba(254, 202, 202, 0.8)',
          'rgba(255, 128, 128, 0.8)',
          'rgba(255, 153, 153, 0.8)',
          'rgba(255, 179, 179, 0.8)',
          'rgba(255, 204, 204, 0.8)',
        ],
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const energySleepOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const triggerOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  // Calculate insights
  const getInsights = () => {
    if (checkIns.length === 0) return [];
    
    const insights = [];
    const recentMoods = checkIns.slice(-7).map(c => c.mood_score || 0);
    const avgRecentMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
    
    if (avgRecentMood >= 7) {
      insights.push({ type: 'positive', text: '🌟 Your mood has been consistently good this week!' });
    } else if (avgRecentMood < 5) {
      insights.push({ type: 'attention', text: '💙 Consider reaching out to your support network if you need help.' });
    }

    const topTrigger = Object.keys(triggerStats).reduce((a, b) => 
      triggerStats[a] > triggerStats[b] ? a : b, Object.keys(triggerStats)[0]
    );
    
    if (topTrigger && triggerStats[topTrigger] > 2) {
      insights.push({ 
        type: 'insight', 
        text: `🎯 "${topTrigger}" appears to be your most common trigger. Consider developing specific strategies for this.` 
      });
    }

    const energyTrend = checkIns.slice(-5).map(c => c.energy_level || 0);
    const avgEnergy = energyTrend.reduce((a, b) => a + b, 0) / energyTrend.length;
    
    if (avgEnergy >= 4) {
      insights.push({ type: 'positive', text: '⚡ Your energy levels have been great lately!' });
    } else if (avgEnergy < 2.5) {
      insights.push({ type: 'attention', text: '🔋 Low energy detected. Make sure you\'re getting enough rest and nutrition.' });
    }

    return insights;
  };

  const insights = getInsights();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading your progress...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={onBack}
              className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Progress Report</h1>
            <p className="text-gray-600">Track your recovery journey over time</p>
          </div>
          
          <div className="flex space-x-2">
            {(['7', '30', '90'] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        {checkIns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <span className="text-6xl mb-4 block">📊</span>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Yet</h2>
            <p className="text-gray-600 mb-4">
              Complete a few daily check-ins to see your progress charts here.
            </p>
            <button
              onClick={onBack}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Go Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Insights Section */}
            {insights.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Insights</h2>
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        insight.type === 'positive'
                          ? 'bg-green-50 border border-green-200'
                          : insight.type === 'attention'
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mood Trend Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">😊 Mood Trends</h2>
              <div className="h-80">
                <Line data={moodChartData} options={chartOptions} />
              </div>
            </div>

            {/* Energy & Sleep Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Energy & Sleep</h2>
              <div className="h-80">
                <Line data={energySleepChartData} options={energySleepOptions} />
              </div>
            </div>

            {/* Trigger Analysis */}
            {Object.keys(triggerStats).length > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Common Triggers</h2>
                  <div className="h-80">
                    <Bar data={triggerChartData} options={triggerOptions} />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Trigger Summary</h2>
                  <div className="space-y-3">
                    {Object.entries(triggerStats)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 8)
                      .map(([trigger, count]) => (
                        <div key={trigger} className="flex justify-between items-center">
                          <span className="text-gray-700">{trigger}</span>
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                            {count} times
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Mood</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {(checkIns.reduce((sum, item) => sum + (item.mood_score || 0), 0) / checkIns.length).toFixed(1)}/10
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Over {timeRange} days
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Check-in Consistency</h3>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round((checkIns.length / parseInt(timeRange)) * 100)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {checkIns.length} of {timeRange} days
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Triggers</h3>
                <p className="text-3xl font-bold text-red-600">
                  {Object.values(triggerStats).reduce((sum, count) => sum + count, 0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Across all check-ins
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}