'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

interface CheckInData {
  mood_score: number;
  energy_level: number;
  sleep_quality: number;
  trigger_tags: string[];
  gratitude_note: string;
  notes: string;
}

interface DailyCheckInProps {
  user: User;
  onComplete?: () => void;
}

const TRIGGER_OPTIONS = [
  'Stress', 'Social Situations', 'Work/School', 'Family', 'Money Worries',
  'Loneliness', 'Boredom', 'Anger', 'Sadness', 'Physical Pain',
  'Celebrations', 'Peer Pressure', 'Environment', 'Routine Changes'
];

export default function DailyCheckIn({ user, onComplete }: DailyCheckInProps) {
  const [formData, setFormData] = useState<CheckInData>({
    mood_score: 5,
    energy_level: 3,
    sleep_quality: 3,
    trigger_tags: [],
    gratitude_note: '',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [todaysCheckIn, setTodaysCheckIn] = useState<any>(null);

  useEffect(() => {
    checkTodaysCheckIn();
  }, [user]);

  const checkTodaysCheckIn = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (data && !error) {
      setHasCheckedInToday(true);
      setTodaysCheckIn(data);
      setFormData({
        mood_score: data.mood_score || 5,
        energy_level: data.energy_level || 3,
        sleep_quality: data.sleep_quality || 3,
        trigger_tags: data.trigger_tags || [],
        gratitude_note: data.gratitude_note || '',
        notes: data.notes || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const checkInData = {
        user_id: user.id,
        date: today,
        ...formData
      };

      let result;
      
      if (hasCheckedInToday) {
        // Update existing check-in
        result = await supabase
          .from('daily_checkins')
          .update(formData)
          .eq('id', todaysCheckIn.id)
          .select()
          .single();
      } else {
        // Create new check-in
        result = await supabase
          .from('daily_checkins')
          .insert([checkInData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      toast.success(hasCheckedInToday ? 'Check-in updated!' : 'Check-in saved!');
      setHasCheckedInToday(true);
      setTodaysCheckIn(result.data);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      toast.error('Failed to save check-in: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTrigger = (trigger: string) => {
    setFormData(prev => ({
      ...prev,
      trigger_tags: prev.trigger_tags.includes(trigger)
        ? prev.trigger_tags.filter(t => t !== trigger)
        : [...prev.trigger_tags, trigger]
    }));
  };

  const getMoodEmoji = (score: number) => {
    if (score <= 2) return '😢';
    if (score <= 4) return '😔';
    if (score <= 6) return '😐';
    if (score <= 8) return '😊';
    return '😄';
  };

  const getEnergyLabel = (level: number) => {
    const labels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
    return labels[level - 1];
  };

  const getSleepLabel = (quality: number) => {
    const labels = ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];
    return labels[quality - 1];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {hasCheckedInToday ? 'Update Today\'s Check-In' : 'Daily Check-In'}
        </h2>
        <p className="text-gray-600">
          {hasCheckedInToday 
            ? 'You can update your check-in throughout the day'
            : 'Take a moment to reflect on how you\'re doing today'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Mood Score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How's your mood today? {getMoodEmoji(formData.mood_score)} ({formData.mood_score}/10)
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">😢 Low</span>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.mood_score}
              onChange={(e) => setFormData(prev => ({ ...prev, mood_score: parseInt(e.target.value) }))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-500">😄 High</span>
          </div>
        </div>

        {/* Energy Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Energy Level: {getEnergyLabel(formData.energy_level)} ({formData.energy_level}/5)
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">🔋 Low</span>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.energy_level}
              onChange={(e) => setFormData(prev => ({ ...prev, energy_level: parseInt(e.target.value) }))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-500">⚡ High</span>
          </div>
        </div>

        {/* Sleep Quality */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Sleep Quality: {getSleepLabel(formData.sleep_quality)} ({formData.sleep_quality}/5)
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">😴 Poor</span>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.sleep_quality}
              onChange={(e) => setFormData(prev => ({ ...prev, sleep_quality: parseInt(e.target.value) }))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-500">✨ Great</span>
          </div>
        </div>

        {/* Triggers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Any triggers today? (Select all that apply)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TRIGGER_OPTIONS.map((trigger) => (
              <button
                key={trigger}
                type="button"
                onClick={() => toggleTrigger(trigger)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  formData.trigger_tags.includes(trigger)
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {trigger}
              </button>
            ))}
          </div>
        </div>

        {/* Gratitude Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What are you grateful for today? 🙏
          </label>
          <textarea
            value={formData.gratitude_note}
            onChange={(e) => setFormData(prev => ({ ...prev, gratitude_note: e.target.value }))}
            placeholder="Even small things count - a good cup of coffee, a text from a friend, making it through a tough moment..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Any additional notes about today?
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="How did you handle challenges? What worked well? What would you do differently?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-3 text-white font-medium rounded-md transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isSubmitting 
              ? 'Saving...' 
              : hasCheckedInToday 
                ? 'Update Check-In' 
                : 'Save Check-In'
            }
          </button>
        </div>
      </form>

      {hasCheckedInToday && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm">
            ✅ You've completed your check-in for today! You can update it anytime.
          </p>
        </div>
      )}
    </div>
  );
}