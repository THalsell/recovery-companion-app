'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

interface CopingStrategy {
  id: string;
  user_id: string | null;
  category: string;
  title: string;
  description: string | null;
  is_custom: boolean;
  effectiveness_rating: number | null;
  usage_count: number;
  last_used: string | null;
}

interface CopingStrategiesProps {
  user: User;
  onBack: () => void;
}

const CATEGORY_ICONS = {
  'Breathing': '🫁',
  'Grounding': '🌱',
  'Movement': '🚶',
  'Mindfulness': '🧘',
  'Emergency': '🚨',
  'Distraction': '🎯',
  'Custom': '✨'
};

export default function CopingStrategies({ user, onBack }: CopingStrategiesProps) {
  const [strategies, setStrategies] = useState<CopingStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<CopingStrategy | null>(null);
  const [showBreathingTimer, setShowBreathingTimer] = useState(false);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    const { data, error } = await supabase
      .from('coping_strategies')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('is_custom', { ascending: true })
      .order('category')
      .order('title');

    if (data && !error) {
      setStrategies(data);
    }
    setLoading(false);
  };

  const useStrategy = async (strategy: CopingStrategy) => {
    // Only track usage for strategies that belong to the user or are default
    if (strategy.user_id === user.id || strategy.user_id === null) {
      const { error } = await supabase
        .from('coping_strategies')
        .update({
          usage_count: strategy.usage_count + 1,
          last_used: new Date().toISOString()
        })
        .eq('id', strategy.id);

      if (!error) {
        // Update local state
        setStrategies(prev => prev.map(s => 
          s.id === strategy.id 
            ? { ...s, usage_count: s.usage_count + 1, last_used: new Date().toISOString() }
            : s
        ));
      }
    }

    // Set as active strategy
    setActiveStrategy(strategy);
    
    // Special handling for breathing exercises
    if (strategy.category === 'Breathing') {
      setShowBreathingTimer(true);
    }
  };

  const rateStrategy = async (strategyId: string, rating: number) => {
    const { error } = await supabase
      .from('coping_strategies')
      .update({ effectiveness_rating: rating })
      .eq('id', strategyId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to save rating');
    } else {
      setStrategies(prev => prev.map(s => 
        s.id === strategyId ? { ...s, effectiveness_rating: rating } : s
      ));
      toast.success('Rating saved!');
    }
  };

  const categories = ['All', ...new Set(strategies.map(s => s.category))];
  
  const filteredStrategies = selectedCategory === 'All' 
    ? strategies 
    : strategies.filter(s => s.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading coping strategies...</div>
          </div>
        </div>
      </div>
    );
  }

  // Breathing Timer Modal
  if (showBreathingTimer && activeStrategy) {
    return <BreathingTimer strategy={activeStrategy} onClose={() => {
      setShowBreathingTimer(false);
      setActiveStrategy(null);
    }} />;
  }

  // Strategy Detail View
  if (activeStrategy && !showBreathingTimer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setActiveStrategy(null)}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
          >
            ← Back to Strategies
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">
                {CATEGORY_ICONS[activeStrategy.category as keyof typeof CATEGORY_ICONS] || '✨'}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{activeStrategy.title}</h2>
                <p className="text-gray-600">{activeStrategy.category}</p>
              </div>
            </div>

            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {activeStrategy.description}
              </p>
            </div>

            {/* Usage Stats */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{activeStrategy.usage_count}</p>
                  <p className="text-sm text-gray-600">Times Used</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {activeStrategy.effectiveness_rating ? `${activeStrategy.effectiveness_rating}/5` : 'Not rated'}
                  </p>
                  <p className="text-sm text-gray-600">Effectiveness</p>
                </div>
              </div>
            </div>

            {/* Rating */}
            {activeStrategy.user_id === user.id && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Rate this strategy's effectiveness:</p>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => rateStrategy(activeStrategy.id, rating)}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        activeStrategy.effectiveness_rating && rating <= activeStrategy.effectiveness_rating
                          ? 'bg-yellow-400 border-yellow-400'
                          : 'border-gray-300 hover:border-yellow-400'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {activeStrategy.category === 'Breathing' && (
                <button
                  onClick={() => setShowBreathingTimer(true)}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
                >
                  Start Breathing Exercise
                </button>
              )}
              
              {activeStrategy.category === 'Emergency' && (
                <button
                  onClick={() => {
                    // In a real app, this would open emergency contacts
                    toast.info('Emergency contacts feature coming soon!');
                  }}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 font-medium"
                >
                  Quick Contact
                </button>
              )}
              
              <button
                onClick={() => {
                  toast.success('Strategy marked as used!');
                  setActiveStrategy(null);
                }}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium"
              >
                Mark as Used
              </button>
            </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Coping Strategies</h1>
            <p className="text-gray-600">Your toolkit for managing difficult moments</p>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + Add Custom Strategy
          </button>
        </div>

        {/* Emergency Quick Access */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚨</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Need immediate help?</h3>
              <p className="text-red-700 text-sm">Quick access to emergency coping strategies</p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  const breathingStrategy = strategies.find(s => s.category === 'Breathing');
                  if (breathingStrategy) useStrategy(breathingStrategy);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Breathing
              </button>
              <button 
                onClick={() => {
                  const groundingStrategy = strategies.find(s => s.category === 'Grounding');
                  if (groundingStrategy) useStrategy(groundingStrategy);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Grounding
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category === 'All' ? 'All Strategies' : `${CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || ''} ${category}`}
              </button>
            ))}
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStrategies.map((strategy) => (
            <div
              key={strategy.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => useStrategy(strategy)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">
                  {CATEGORY_ICONS[strategy.category as keyof typeof CATEGORY_ICONS] || '✨'}
                </span>
                {strategy.is_custom && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    Custom
                  </span>
                )}
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">{strategy.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {strategy.description}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Used {strategy.usage_count} times</span>
                {strategy.effectiveness_rating && (
                  <div className="flex items-center">
                    <span className="mr-1">⭐</span>
                    <span>{strategy.effectiveness_rating}/5</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Strategy Form */}
        {showAddForm && (
          <AddStrategyForm 
            user={user} 
            onClose={() => setShowAddForm(false)}
            onAdd={(newStrategy) => {
              setStrategies(prev => [...prev, newStrategy]);
              setShowAddForm(false);
              toast.success('Strategy added!');
            }}
          />
        )}
      </div>
    </div>
  );
}

// Breathing Timer Component
function BreathingTimer({ strategy, onClose }: { strategy: CopingStrategy; onClose: () => void }) {
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [count, setCount] = useState(4);
  const [isActive, setIsActive] = useState(false);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && count > 0) {
      interval = setInterval(() => {
        setCount(count - 1);
      }, 1000);
    } else if (isActive && count === 0) {
      // Move to next phase
      const phases: Array<'inhale' | 'hold1' | 'exhale' | 'hold2'> = ['inhale', 'hold1', 'exhale', 'hold2'];
      const currentIndex = phases.indexOf(phase);
      const nextIndex = (currentIndex + 1) % phases.length;
      
      if (nextIndex === 0) {
        setCycles(prev => prev + 1);
      }
      
      setPhase(phases[nextIndex]);
      setCount(4);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, count, phase]);

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return 'bg-blue-500';
      case 'hold1': return 'bg-yellow-500';
      case 'exhale': return 'bg-green-500';
      case 'hold2': return 'bg-purple-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{strategy.title}</h2>
        <p className="text-gray-600 mb-8">Focus on your breathing</p>
        
        <div className={`w-32 h-32 mx-auto rounded-full ${getPhaseColor()} flex items-center justify-center mb-6 transition-all duration-1000`}>
          <div className="text-white">
            <div className="text-3xl font-bold">{count}</div>
            <div className="text-sm">{getPhaseInstruction()}</div>
          </div>
        </div>
        
        <p className="text-gray-600 mb-6">Cycles completed: {cycles}</p>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex-1 py-3 px-4 rounded-md font-medium ${
              isActive 
                ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isActive ? 'Pause' : 'Start'}
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Custom Strategy Form
function AddStrategyForm({ user, onClose, onAdd }: { 
  user: User; 
  onClose: () => void; 
  onAdd: (strategy: CopingStrategy) => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Custom'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await supabase
      .from('coping_strategies')
      .insert([{
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        is_custom: true,
        usage_count: 0
      }])
      .select()
      .single();

    if (error) {
      toast.error('Failed to add strategy');
    } else {
      onAdd(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Strategy</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Custom">Custom</option>
              <option value="Breathing">Breathing</option>
              <option value="Grounding">Grounding</option>
              <option value="Movement">Movement</option>
              <option value="Mindfulness">Mindfulness</option>
              <option value="Distraction">Distraction</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe the steps or technique..."
              required
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Add Strategy
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