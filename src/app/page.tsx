'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import DailyCheckIn from '@/components/DailyCheckIn';
import ProgressCharts from '@/components/ProgressCharts';
import CopingStrategies from '@/components/CopingStrategies';
import EmergencyContacts from '@/components/EmergencyContacts';
import GoalsMilestones from '@/components/GoalsMilestones';
import Settings from '@/components/Settings';

type ViewType = 'dashboard' | 'checkin' | 'progress' | 'strategies' | 'contacts' | 'goals' | 'settings';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Route to different views
  switch (currentView) {
    case 'checkin':
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
            >
              ← Back to Dashboard
            </button>
            <DailyCheckIn user={user} onComplete={() => setCurrentView('dashboard')} />
          </div>
        </div>
      );
    
    case 'progress':
      return <ProgressCharts user={user} onBack={() => setCurrentView('dashboard')} />;
    
    case 'strategies':
      return <CopingStrategies user={user} onBack={() => setCurrentView('dashboard')} />;
    
    case 'contacts':
      return <EmergencyContacts user={user} onBack={() => setCurrentView('dashboard')} />;
    
    case 'goals':
      return <GoalsMilestones user={user} onBack={() => setCurrentView('dashboard')} />;
    
    case 'settings':
      return <Settings user={user} onBack={() => setCurrentView('dashboard')} />;
    
    case 'settings':
      return <Settings user={user} onBack={() => setCurrentView('dashboard')} />;
    
    default:
      return <Dashboard user={user} onNavigate={setCurrentView} />;
  }
}

// Simple Auth Component
function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Check your email for confirmation!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Recovery Companion
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Your daily support for recovery
          </p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-blue-600 hover:text-blue-700"
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
  );
}

// Enhanced Dashboard Component
function Dashboard({ user, onNavigate }: { user: User; onNavigate: (view: ViewType) => void }) {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    avgMood: 0,
    streak: 0
  });

  useEffect(() => {
    fetchCheckIns();
    fetchStats();
  }, []);

  const fetchCheckIns = async () => {
    const { data } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(7);
    
    setCheckIns(data || []);
  };

  const fetchStats = async () => {
    // Get total check-ins
    const { count } = await supabase
      .from('daily_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get average mood from last 30 days
    const { data: moodData } = await supabase
      .from('daily_checkins')
      .select('mood_score')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const avgMood = moodData?.length ? 
      moodData.reduce((sum, item) => sum + (item.mood_score || 0), 0) / moodData.length : 0;

    setStats({
      totalCheckIns: count || 0,
      avgMood: Math.round(avgMood * 10) / 10,
      streak: calculateStreak(checkIns)
    });
  };

  const calculateStreak = (checkInData: any[]) => {
    if (!checkInData.length) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < checkInData.length; i++) {
      const checkInDate = new Date(checkInData[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (checkInDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              How are you doing today?
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCheckIns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">😊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Mood (30 days)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgMood}/10</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">🔥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold text-gray-900">{stats.streak} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Check-In */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Daily Check-In</h2>
            <p className="text-gray-600 mb-4">
              Take a moment to reflect on your day and track your progress.
            </p>
            <button 
              onClick={() => onNavigate('checkin')}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 font-medium"
            >
              {checkIns.length > 0 && checkIns[0].date === new Date().toISOString().split('T')[0]
                ? 'Update Today\'s Check-In' 
                : 'Start Daily Check-In'
              }
            </button>
          </div>

          {/* Recent Check-Ins */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Recent Check-Ins</h2>
            {checkIns.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">📝</span>
                <p className="text-gray-500">No check-ins yet.</p>
                <p className="text-gray-400 text-sm">Start your first one to begin tracking!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkIns.map((checkin) => (
                  <div key={checkin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(checkin.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        Mood: {checkin.mood_score}/10 • Energy: {checkin.energy_level}/5
                      </p>
                    </div>
                    <div className="text-right">
                      {checkin.trigger_tags?.length > 0 && (
                        <p className="text-xs text-red-600">
                          {checkin.trigger_tags.length} trigger(s)
                        </p>
                      )}
                      {checkin.gratitude_note && (
                        <p className="text-xs text-green-600">✓ Gratitude noted</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <button 
              onClick={() => onNavigate('strategies')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <span className="text-2xl mb-2 block">🧘</span>
              <p className="font-medium">Coping Strategies</p>
              <p className="text-sm text-gray-600">Access your toolkit</p>
            </button>
            
            <button 
              onClick={() => onNavigate('contacts')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <span className="text-2xl mb-2 block">📞</span>
              <p className="font-medium">Emergency Contacts</p>
              <p className="text-sm text-gray-600">Quick access to support</p>
            </button>
            
            <button 
              onClick={() => onNavigate('progress')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <span className="text-2xl mb-2 block">📈</span>
              <p className="font-medium">Progress Report</p>
              <p className="text-sm text-gray-600">View your trends</p>
            </button>
            
            <button 
              onClick={() => onNavigate('goals')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <span className="text-2xl mb-2 block">🎯</span>
              <p className="font-medium">Goals & Milestones</p>
              <p className="text-sm text-gray-600">Track achievements</p>
            </button>
            
            <button 
              onClick={() => onNavigate('settings')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <span className="text-2xl mb-2 block">⚙️</span>
              <p className="font-medium">Settings</p>
              <p className="text-sm text-gray-600">Customize your app</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Coming Soon Component for features we haven't built yet
function ComingSoonPage({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
        >
          ← Back to Dashboard
        </button>
        
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <span className="text-6xl mb-4 block">🚧</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-600 mb-6">
            This feature is coming soon! We're working hard to bring you the best recovery support tools.
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}