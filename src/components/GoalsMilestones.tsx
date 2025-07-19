'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  target_date: string | null;
  is_completed: boolean;
  completed_date: string | null;
  priority: number;
  created_at: string;
}

interface Milestone {
  id: string;
  user_id: string;
  milestone_type: string;
  milestone_value: number;
  achieved_date: string | null;
  title: string | null;
  description: string | null;
  created_at: string;
}

interface GoalsMilestonesProps {
  user: User;
  onBack: () => void;
}

const GOAL_CATEGORIES = [
  'Recovery', 'Health & Wellness', 'Relationships', 'Career', 'Education', 
  'Financial', 'Personal Growth', 'Hobbies', 'Service', 'Spiritual'
];

const MILESTONE_TYPES = [
  { type: 'days_clean', label: 'Days Clean', values: [1, 7, 30, 60, 90, 180, 365, 730] },
  { type: 'meetings_attended', label: 'Meetings Attended', values: [1, 5, 10, 25, 50, 100] },
  { type: 'check_ins_completed', label: 'Check-ins Completed', values: [7, 30, 50, 100] },
  { type: 'goals_achieved', label: 'Goals Achieved', values: [1, 3, 5, 10] }
];

export default function GoalsMilestones({ user, onBack }: GoalsMilestonesProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'goals' | 'milestones'>('goals');
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showCelebration, setShowCelebration] = useState<Goal | Milestone | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch goals
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('is_completed')
      .order('priority')
      .order('target_date');

    // Fetch milestones
    const { data: milestonesData } = await supabase
      .from('milestones')
      .select('*')
      .eq('user_id', user.id)
      .order('achieved_date', { ascending: false });

    if (goalsData) setGoals(goalsData);
    if (milestonesData) setMilestones(milestonesData);
    
    setLoading(false);
  };

  const toggleGoalCompletion = async (goal: Goal) => {
    const isCompleting = !goal.is_completed;
    const completedDate = isCompleting ? new Date().toISOString().split('T')[0] : null;

    const { error } = await supabase
      .from('goals')
      .update({
        is_completed: isCompleting,
        completed_date: completedDate
      })
      .eq('id', goal.id);

    if (error) {
      toast.error('Failed to update goal');
    } else {
      setGoals(prev => prev.map(g => 
        g.id === goal.id 
          ? { ...g, is_completed: isCompleting, completed_date: completedDate }
          : g
      ));
      
      if (isCompleting) {
        setShowCelebration(goal);
        toast.success('🎉 Goal completed! Congratulations!');
      } else {
        toast.success('Goal marked as incomplete');
      }
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      toast.error('Failed to delete goal');
    } else {
      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast.success('Goal deleted');
    }
  };

  const checkMilestones = async () => {
    // Get user's recovery start date
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('recovery_start_date')
      .eq('id', user.id)
      .single();

    if (profile?.recovery_start_date) {
      const recoveryStart = new Date(profile.recovery_start_date);
      const today = new Date();
      const daysClean = Math.floor((today.getTime() - recoveryStart.getTime()) / (1000 * 60 * 60 * 24));

      // Check for days clean milestones
      const daysCleanMilestones = MILESTONE_TYPES.find(m => m.type === 'days_clean')?.values || [];
      
      for (const milestone of daysCleanMilestones) {
        if (daysClean >= milestone) {
          // Check if this milestone already exists
          const existing = milestones.find(m => 
            m.milestone_type === 'days_clean' && m.milestone_value === milestone
          );

          if (!existing) {
            // Create new milestone
            const { data, error } = await supabase
              .from('milestones')
              .insert([{
                user_id: user.id,
                milestone_type: 'days_clean',
                milestone_value: milestone,
                achieved_date: today.toISOString().split('T')[0],
                title: `${milestone} Days Clean`,
                description: `Congratulations on reaching ${milestone} days of sobriety!`
              }])
              .select()
              .single();

            if (data && !error) {
              setMilestones(prev => [data, ...prev]);
              setShowCelebration(data);
            }
          }
        }
      }
    }

    // Check check-ins milestone
    const { count: checkInsCount } = await supabase
      .from('daily_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const checkInMilestones = MILESTONE_TYPES.find(m => m.type === 'check_ins_completed')?.values || [];
    
    for (const milestone of checkInMilestones) {
      if ((checkInsCount || 0) >= milestone) {
        const existing = milestones.find(m => 
          m.milestone_type === 'check_ins_completed' && m.milestone_value === milestone
        );

        if (!existing) {
          const { data, error } = await supabase
            .from('milestones')
            .insert([{
              user_id: user.id,
              milestone_type: 'check_ins_completed',
              milestone_value: milestone,
              achieved_date: new Date().toISOString().split('T')[0],
              title: `${milestone} Check-ins Completed`,
              description: `Great job on completing ${milestone} daily check-ins!`
            }])
            .select()
            .single();

          if (data && !error) {
            setMilestones(prev => [data, ...prev]);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (!loading) {
      checkMilestones();
    }
  }, [loading]);

  const getGoalProgress = (goal: Goal) => {
    if (goal.is_completed) return 100;
    if (!goal.target_date) return 0;
    
    const today = new Date();
    const target = new Date(goal.target_date);
    const created = new Date(goal.created_at);
    
    const totalDays = (target.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  };

  const getDaysUntilTarget = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'border-l-red-500 bg-red-50';
      case 2: return 'border-l-orange-500 bg-orange-50';
      case 3: return 'border-l-yellow-500 bg-yellow-50';
      case 4: return 'border-l-green-500 bg-green-50';
      case 5: return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'days_clean': return '🏆';
      case 'meetings_attended': return '👥';
      case 'check_ins_completed': return '📝';
      case 'goals_achieved': return '🎯';
      default: return '⭐';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading your goals and milestones...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Goals & Milestones</h1>
            <p className="text-gray-600">Track your progress and celebrate achievements</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'goals'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🎯 Goals ({goals.filter(g => !g.is_completed).length})
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'milestones'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🏆 Milestones ({milestones.length})
          </button>
        </div>

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div>
            {/* Goals Stats */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Goals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {goals.filter(g => !g.is_completed).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {goals.filter(g => g.is_completed).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">📈</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {goals.length > 0 ? Math.round((goals.filter(g => g.is_completed).length / goals.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Goal Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddGoalForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                + Add New Goal
              </button>
            </div>

            {/* Goals List */}
            {goals.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <span className="text-6xl mb-4 block">🎯</span>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No goals yet</h3>
                <p className="text-gray-600 mb-4">
                  Set your first goal to start tracking your progress in recovery.
                </p>
                <button
                  onClick={() => setShowAddGoalForm(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Set Your First Goal
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className={`bg-white rounded-lg shadow-md border-l-4 ${getPriorityColor(goal.priority)}`}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className={`text-lg font-semibold ${goal.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {goal.title}
                            </h3>
                            {goal.is_completed && <span className="ml-2 text-green-600">✅</span>}
                          </div>
                          <p className="text-gray-600 mb-2">{goal.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded">{goal.category}</span>
                            {goal.target_date && (
                              <span>{getDaysUntilTarget(goal.target_date)}</span>
                            )}
                            <span>Priority {goal.priority}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleGoalCompletion(goal)}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              goal.is_completed
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {goal.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
                          </button>
                          <button
                            onClick={() => setEditingGoal(goal)}
                            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {goal.target_date && !goal.is_completed && (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(getGoalProgress(goal))}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getGoalProgress(goal)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div>
            {milestones.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <span className="text-6xl mb-4 block">🏆</span>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No milestones yet</h3>
                <p className="text-gray-600 mb-4">
                  Complete check-ins and achieve goals to unlock milestones!
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                      <span className="text-4xl mb-3 block">
                        {getMilestoneIcon(milestone.milestone_type)}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {milestone.description}
                      </p>
                      {milestone.achieved_date && (
                        <p className="text-sm text-gray-500">
                          Achieved on {new Date(milestone.achieved_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Goal Form */}
        {(showAddGoalForm || editingGoal) && (
          <GoalForm
            user={user}
            goal={editingGoal}
            onClose={() => {
              setShowAddGoalForm(false);
              setEditingGoal(null);
            }}
            onSave={(goal) => {
              if (editingGoal) {
                setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
                toast.success('Goal updated!');
              } else {
                setGoals(prev => [...prev, goal]);
                toast.success('Goal added!');
              }
              setShowAddGoalForm(false);
              setEditingGoal(null);
            }}
          />
        )}

        {/* Celebration Modal */}
        {showCelebration && (
          <CelebrationModal
            achievement={showCelebration}
            onClose={() => setShowCelebration(null)}
          />
        )}
      </div>
    </div>
  );
}

// Goal Form Component
function GoalForm({ 
  user, 
  goal, 
  onClose, 
  onSave 
}: { 
  user: User; 
  goal: Goal | null; 
  onClose: () => void; 
  onSave: (goal: Goal) => void;
}) {
  const [formData, setFormData] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || 'Recovery',
    target_date: goal?.target_date || '',
    priority: goal?.priority || 3
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (goal) {
        // Update existing goal
        const { data, error } = await supabase
          .from('goals')
          .update(formData)
          .eq('id', goal.id)
          .select()
          .single();

        if (error) throw error;
        onSave(data);
      } else {
        // Add new goal
        const { data, error } = await supabase
          .from('goals')
          .insert([{
            user_id: user.id,
            ...formData,
            is_completed: false
          }])
          .select()
          .single();

        if (error) throw error;
        onSave(data);
      }
    } catch (error: any) {
      toast.error('Failed to save goal: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {goal ? 'Edit Goal' : 'Add New Goal'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What do you want to achieve?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe your goal and why it's important to you..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GOAL_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
            <input
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 - Critical</option>
              <option value={2}>2 - High</option>
              <option value={3}>3 - Medium</option>
              <option value={4}>4 - Low</option>
              <option value={5}>5 - Someday</option>
            </select>
          </div>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Saving...' : (goal ? 'Update Goal' : 'Add Goal')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Celebration Modal Component
function CelebrationModal({ 
  achievement, 
  onClose 
}: { 
  achievement: Goal | Milestone; 
  onClose: () => void;
}) {
  const isGoal = 'category' in achievement;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {isGoal ? 'Goal Completed!' : 'Milestone Achieved!'}
        </h2>
        <h3 className="text-xl font-semibold text-blue-600 mb-2">
          {achievement.title}
        </h3>
        <p className="text-gray-600 mb-6">
          {achievement.description || (isGoal ? 'Congratulations on completing your goal!' : 'You\'ve reached an important milestone!')}
        </p>
        
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}