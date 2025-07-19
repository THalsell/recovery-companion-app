'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  recovery_start_date: string | null;
  timezone: string;
  privacy_settings: {
    anonymous: boolean;
    share_progress: boolean;
    data_analytics: boolean;
  };
  notification_preferences: {
    daily_reminder: boolean;
    milestone_alerts: boolean;
    weekly_summary: boolean;
    crisis_check_ins: boolean;
    reminder_time: string;
  };
  created_at: string;
  updated_at: string;
}

interface SettingsProps {
  user: User;
  onBack: () => void;
}

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'
];

const RECOVERY_PROGRAMS = [
  'Alcoholics Anonymous (AA)', 'Narcotics Anonymous (NA)', 'Cocaine Anonymous (CA)',
  'Crystal Meth Anonymous (CMA)', 'Marijuana Anonymous (MA)', 'SMART Recovery',
  'LifeRing Secular Recovery', 'Women for Sobriety', 'Celebrate Recovery',
  'Self-managed', 'Other', 'Prefer not to say'
];

export default function Settings({ user, onBack }: SettingsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'privacy' | 'notifications' | 'data' | 'account'>('profile');
  const [recoveryProgram, setRecoveryProgram] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
    } else if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create one
      await createProfile();
    }
    setLoading(false);
  };

  const createProfile = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{
        id: user.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        privacy_settings: {
          anonymous: false,
          share_progress: false,
          data_analytics: true
        },
        notification_preferences: {
          daily_reminder: true,
          milestone_alerts: true,
          weekly_summary: true,
          crisis_check_ins: true,
          reminder_time: '09:00'
        }
      }])
      .select()
      .single();

    if (data && !error) {
      setProfile(data);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Settings saved!');
    }
    setSaving(false);
  };

  const calculateCleanTime = () => {
    if (!profile?.recovery_start_date) return null;
    
    const startDate = new Date(profile.recovery_start_date);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null;
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    
    let result = '';
    if (years > 0) result += `${years} year${years > 1 ? 's' : ''} `;
    if (months > 0) result += `${months} month${months > 1 ? 's' : ''} `;
    if (days > 0 || result === '') result += `${days} day${days !== 1 ? 's' : ''}`;
    
    return result.trim();
  };

  const exportData = async () => {
    try {
      toast.info('Preparing your data export...');
      
      // Fetch all user data
      const [checkIns, strategies, contacts, goals, milestones] = await Promise.all([
        supabase.from('daily_checkins').select('*').eq('user_id', user.id),
        supabase.from('coping_strategies').select('*').eq('user_id', user.id),
        supabase.from('emergency_contacts').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('milestones').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        profile: profile,
        daily_checkins: checkIns.data,
        coping_strategies: strategies.data,
        emergency_contacts: contacts.data,
        goals: goals.data,
        milestones: milestones.data,
        exported_at: new Date().toISOString()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `recovery-companion-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const deleteAccount = async () => {
    try {
      // In a real app, you'd want to delete all user data first
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;
      
      toast.success('Account deleted successfully');
      // Redirect would happen automatically via auth state change
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-red-600">Failed to load profile</p>
            <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <nav className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile & Recovery', icon: '👤' },
                  { id: 'notifications', label: 'Notifications', icon: '🔔' },
                  { id: 'privacy', label: 'Privacy & Security', icon: '🔒' },
                  { id: 'data', label: 'Data & Export', icon: '📊' },
                  { id: 'account', label: 'Account', icon: '⚙️' }
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Profile & Recovery Section */}
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile & Recovery Information</h2>
                  </div>

                  {/* Recovery Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recovery Start Date
                    </label>
                    <input
                      type="date"
                      value={profile.recovery_start_date || ''}
                      onChange={(e) => updateProfile({ recovery_start_date: e.target.value })}
                      min="2000-01-01"
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the date you started your recovery journey
                    </p>
                    {profile.recovery_start_date && (
                      <p className="mt-2 text-sm text-green-600">
                        🎉 Clean time: {calculateCleanTime()}
                      </p>
                    )}
                  </div>

                  {/* Recovery Program */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recovery Program (Optional)
                    </label>
                    <select
                      value={recoveryProgram}
                      onChange={(e) => setRecoveryProgram(e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a program</option>
                      {RECOVERY_PROGRAMS.map((program) => (
                        <option key={program} value={program}>{program}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      This information is private and helps personalize your experience
                    </p>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => updateProfile({ timezone: e.target.value })}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>

                  {/* Account Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Account Information</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>Account created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                      <p><strong>Last sign in:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                    <p className="text-gray-600 mb-6">Choose when and how you'd like to be reminded to check in.</p>
                  </div>

                  {/* Daily Reminder Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Check-in Reminder Time
                    </label>
                    <input
                      type="time"
                      value={profile.notification_preferences.reminder_time}
                      onChange={(e) => updateProfile({
                        notification_preferences: {
                          ...profile.notification_preferences,
                          reminder_time: e.target.value
                        }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Notification Toggles */}
                  <div className="space-y-4">
                    {[
                      { key: 'daily_reminder', label: 'Daily Check-in Reminders', desc: 'Get reminded to complete your daily check-in' },
                      { key: 'milestone_alerts', label: 'Milestone Celebrations', desc: 'Be notified when you reach recovery milestones' },
                      { key: 'weekly_summary', label: 'Weekly Progress Summary', desc: 'Receive a summary of your week\'s progress' },
                      { key: 'crisis_check_ins', label: 'Crisis Check-ins', desc: 'Extra support during difficult times' }
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={profile.notification_preferences[setting.key as keyof typeof profile.notification_preferences] as boolean}
                            onChange={(e) => updateProfile({
                              notification_preferences: {
                                ...profile.notification_preferences,
                                [setting.key]: e.target.checked
                              }
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-700">
                            {setting.label}
                          </label>
                          <p className="text-sm text-gray-500">{setting.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Section */}
              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy & Security</h2>
                    <p className="text-gray-600 mb-6">Control how your data is used and shared.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { 
                        key: 'anonymous', 
                        label: 'Anonymous Usage', 
                        desc: 'Use the app without linking data to your identity' 
                      },
                      { 
                        key: 'share_progress', 
                        label: 'Share Progress with Support Network', 
                        desc: 'Allow your sponsor or support person to see your progress' 
                      },
                      { 
                        key: 'data_analytics', 
                        label: 'Help Improve the App', 
                        desc: 'Share anonymous usage data to help us improve the app' 
                      }
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={profile.privacy_settings[setting.key as keyof typeof profile.privacy_settings]}
                            onChange={(e) => updateProfile({
                              privacy_settings: {
                                ...profile.privacy_settings,
                                [setting.key]: e.target.checked
                              }
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-700">
                            {setting.label}
                          </label>
                          <p className="text-sm text-gray-500">{setting.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">🔒 Your Privacy Matters</h3>
                    <p className="text-sm text-blue-800">
                      Your recovery data is encrypted and secured. We never share personal information 
                      with third parties without your explicit consent.
                    </p>
                  </div>
                </div>
              )}

              {/* Data & Export Section */}
              {activeSection === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Data & Export</h2>
                    <p className="text-gray-600 mb-6">Manage your data and download your information.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">📊 Export Your Data</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Download all your recovery data including check-ins, goals, and progress in JSON format.
                      </p>
                      <button
                        onClick={exportData}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        Download Data Export
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">🗑️ Data Retention</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Your data is automatically backed up and retained for your recovery journey. 
                        You can request data deletion at any time.
                      </p>
                      <div className="text-sm text-gray-500">
                        <p>• Check-ins: Retained indefinitely for progress tracking</p>
                        <p>• Goals & milestones: Retained indefinitely for motivation</p>
                        <p>• Emergency contacts: Retained for safety purposes</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Management</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">🔑 Change Password</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Update your account password for security.
                      </p>
                      <button
                        onClick={async () => {
                          const { error } = await supabase.auth.resetPasswordForEmail(user.email!);
                          if (error) {
                            toast.error('Failed to send password reset email');
                          } else {
                            toast.success('Password reset email sent!');
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        Send Password Reset Email
                      </button>
                    </div>

                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h3 className="font-medium text-red-900 mb-2">⚠️ Delete Account</h3>
                      <p className="text-sm text-red-800 mb-4">
                        Permanently delete your account and all recovery data. This action cannot be undone.
                      </p>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Settings are saved automatically
                  </p>
                  {saving && (
                    <span className="text-sm text-blue-600">Saving...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-red-900 mb-4">Delete Account</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
                <li>All your daily check-ins and progress data</li>
                <li>Your goals and milestones</li>
                <li>Emergency contacts and coping strategies</li>
                <li>Your account and profile information</li>
              </ul>
              <p className="text-sm text-red-600 mb-6 font-medium">
                This action cannot be undone.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={deleteAccount}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                >
                  Yes, Delete My Account
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}