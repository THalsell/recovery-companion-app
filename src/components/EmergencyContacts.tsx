'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  priority_level: number;
  created_at: string;
}

interface EmergencyContactsProps {
  user: User;
  onBack: () => void;
}

const RELATIONSHIP_OPTIONS = [
  'Sponsor', 'Therapist', 'Family Member', 'Friend', 'Support Group Leader', 
  'Crisis Hotline', 'Doctor', 'Emergency Services', 'Mentor', 'Other'
];

const CRISIS_HOTLINES = [
  { name: 'National Suicide Prevention Lifeline', phone: '988', description: '24/7 crisis support' },
  { name: 'Crisis Text Line', phone: 'Text HOME to 741741', description: 'Text-based crisis support' },
  { name: 'SAMHSA National Helpline', phone: '1-800-662-4357', description: 'Substance abuse support' },
  { name: 'Emergency Services', phone: '911', description: 'Life-threatening emergencies' }
];

export default function EmergencyContacts({ user, onBack }: EmergencyContactsProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [showCrisisPanel, setShowCrisisPanel] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('priority_level')
      .order('created_at');

    if (data && !error) {
      setContacts(data);
    }
    setLoading(false);
  };

  const handleCall = (phone: string, name: string) => {
    // Format phone number for calling
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length >= 10) {
      // For web app, we'll show instructions since we can't directly make calls
      toast.success(`Calling ${name}...`, {
        description: `Phone: ${phone}`,
        duration: 5000,
      });
      
      // In a real mobile app, you'd use:
      // window.open(`tel:${cleanPhone}`);
    } else {
      toast.error('Invalid phone number');
    }
  };

  const handleText = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length >= 10) {
      toast.success(`Opening text to ${name}...`, {
        description: `Phone: ${phone}`,
        duration: 5000,
      });
      
      // In a real mobile app, you'd use:
      // window.open(`sms:${cleanPhone}`);
    } else {
      toast.error('Invalid phone number');
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      toast.error('Failed to delete contact');
    } else {
      setContacts(prev => prev.filter(c => c.id !== contactId));
      toast.success('Contact deleted');
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Critical';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      case 5: return 'Reference';
      default: return 'Normal';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading contacts...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={onBack}
              className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Emergency Contacts</h1>
            <p className="text-gray-600">Your support network when you need help</p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCrisisPanel(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium"
            >
              🚨 Crisis Help
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Add Contact
            </button>
          </div>
        </div>

        {/* Crisis Panel */}
        {showCrisisPanel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">🚨</span>
                <h2 className="text-xl font-bold text-gray-900">Crisis Support</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                If you're in immediate danger or having thoughts of self-harm, please reach out for help immediately.
              </p>
              
              <div className="space-y-3 mb-6">
                {CRISIS_HOTLINES.map((hotline, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{hotline.name}</p>
                        <p className="text-sm text-gray-600">{hotline.description}</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">{hotline.phone}</p>
                      </div>
                      <button
                        onClick={() => handleCall(hotline.phone, hotline.name)}
                        className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm"
                      >
                        Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowCrisisPanel(false)}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions for Top Contacts */}
        {contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Contact</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contacts.slice(0, 3).map((contact) => (
                <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{contact.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(contact.priority_level)}`}>
                      {getPriorityLabel(contact.priority_level)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{contact.relationship}</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCall(contact.phone, contact.name)}
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 text-sm"
                    >
                      📞 Call
                    </button>
                    <button
                      onClick={() => handleText(contact.phone, contact.name)}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 text-sm"
                    >
                      💬 Text
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Contacts List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Contacts</h2>
          </div>
          
          {contacts.length === 0 ? (
            <div className="p-8 text-center">
              <span className="text-6xl mb-4 block">📞</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No contacts yet</h3>
              <p className="text-gray-600 mb-4">
                Add emergency contacts to quickly reach your support network when you need help.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Add Your First Contact
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <div key={contact.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-900 mr-3">{contact.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(contact.priority_level)}`}>
                          {getPriorityLabel(contact.priority_level)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-1">{contact.relationship}</p>
                      <p className="text-gray-700 font-mono">{contact.phone}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCall(contact.phone, contact.name)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        📞 Call
                      </button>
                      <button
                        onClick={() => handleText(contact.phone, contact.name)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        💬 Text
                      </button>
                      <button
                        onClick={() => setEditingContact(contact)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Contact Form */}
        {(showAddForm || editingContact) && (
          <ContactForm
            user={user}
            contact={editingContact}
            onClose={() => {
              setShowAddForm(false);
              setEditingContact(null);
            }}
            onSave={(contact) => {
              if (editingContact) {
                setContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
                toast.success('Contact updated!');
              } else {
                setContacts(prev => [...prev, contact]);
                toast.success('Contact added!');
              }
              setShowAddForm(false);
              setEditingContact(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Contact Form Component
function ContactForm({ 
  user, 
  contact, 
  onClose, 
  onSave 
}: { 
  user: User; 
  contact: EmergencyContact | null; 
  onClose: () => void; 
  onSave: (contact: EmergencyContact) => void;
}) {
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    phone: contact?.phone || '',
    relationship: contact?.relationship || '',
    priority_level: contact?.priority_level || 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (contact) {
        // Update existing contact
        const { data, error } = await supabase
          .from('emergency_contacts')
          .update(formData)
          .eq('id', contact.id)
          .select()
          .single();

        if (error) throw error;
        onSave(data);
      } else {
        // Add new contact
        const { data, error } = await supabase
          .from('emergency_contacts')
          .insert([{
            user_id: user.id,
            ...formData
          }])
          .select()
          .single();

        if (error) throw error;
        onSave(data);
      }
    } catch (error: any) {
      toast.error('Failed to save contact: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length >= 6) {
      return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (phoneNumber.length >= 3) {
      return phoneNumber.replace(/(\d{3})(\d{3})/, '($1) $2');
    }
    return phoneNumber;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {contact ? 'Edit Contact' : 'Add Emergency Contact'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                phone: formatPhoneNumber(e.target.value)
              }))}
              placeholder="(123) 456-7890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select relationship</option>
              {RELATIONSHIP_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
            <select
              value={formData.priority_level}
              onChange={(e) => setFormData(prev => ({ ...prev, priority_level: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Critical (1) - Emergency only</option>
              <option value={2}>High (2) - Crisis situations</option>
              <option value={3}>Medium (3) - Regular support</option>
              <option value={4}>Low (4) - General contact</option>
              <option value={5}>Reference (5) - Info only</option>
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
              {isSubmitting ? 'Saving...' : (contact ? 'Update Contact' : 'Add Contact')}
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