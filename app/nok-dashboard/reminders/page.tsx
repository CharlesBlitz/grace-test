'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Clock, Phone, MessageSquare, Mail, Bell, Trash2, Edit, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { getUserSubscription, canUseFeature, trackFeatureUsage } from '@/lib/subscriptionService';

interface Elder {
  id: string;
  name: string;
  phone_number: string;
}

interface Task {
  id: string;
  title: string;
  type: string;
  reminder_method: string[];
  escalation_threshold: number;
  use_cloned_voice: boolean;
  voice_profile_id: string | null;
  use_conversational_greeting?: boolean;
  greeting_style?: string;
  time_aware_greeting?: boolean;
  include_wellbeing_check?: boolean;
  enable_response_capture?: boolean;
}

interface Schedule {
  id: string;
  day_of_week: number | null;
  time_of_day: string;
}

interface VoiceProfile {
  id: string;
  voice_name: string;
  nok_id: string;
}

export default function NOKRemindersPage() {
  const { profile } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    type: 'med',
    reminder_method: ['sms', 'push'],
    escalation_threshold: 3,
    use_cloned_voice: false,
    voice_profile_id: '',
    use_conversational_greeting: false,
    greeting_style: 'brief',
    time_aware_greeting: true,
    include_wellbeing_check: false,
    enable_response_capture: false,
    schedules: [{ day_of_week: null as number | null, time_of_day: '09:00' }],
  });

  useEffect(() => {
    if (profile?.id) {
      fetchElders();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedElder) {
      fetchTasks();
      fetchVoiceProfiles();
    }
  }, [selectedElder]);

  const fetchElders = async () => {
    try {
      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('elder_id')
        .eq('nok_id', profile?.id);

      if (relationships && relationships.length > 0) {
        const elderIds = relationships.map((r) => r.elder_id);
        const { data: eldersData } = await supabase
          .from('users')
          .select('id, name, phone_number')
          .in('id', elderIds);

        if (eldersData && eldersData.length > 0) {
          setElders(eldersData);
          setSelectedElder(eldersData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching elders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!selectedElder) return;

    try {
      const { data } = await supabase
        .from('care_tasks')
        .select('*')
        .eq('elder_id', selectedElder.id)
        .order('created_at', { ascending: false });

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchVoiceProfiles = async () => {
    try {
      const { data } = await supabase
        .from('voice_profiles')
        .select('id, voice_name, nok_id')
        .or(`nok_id.eq.${profile?.id},elder_id.eq.${selectedElder?.id}`);

      setVoiceProfiles(data || []);
    } catch (error) {
      console.error('Error fetching voice profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElder) return;

    try {
      if (!editingTask) {
        const subscription = await getUserSubscription(selectedElder.id);

        if (!subscription) {
          alert('No active subscription found. Please subscribe to create reminders.');
          return;
        }

        const usageCheck = await canUseFeature(selectedElder.id, subscription.id, 'reminders');

        if (!usageCheck.allowed) {
          alert(usageCheck.reason || 'You have reached your reminder limit for this month. Please upgrade your plan.');
          return;
        }
      }

      const taskData = {
        elder_id: selectedElder.id,
        title: formData.title,
        type: formData.type,
        reminder_method: formData.reminder_method,
        escalation_threshold: formData.escalation_threshold,
        use_cloned_voice: formData.use_cloned_voice,
        voice_profile_id: formData.use_cloned_voice && formData.voice_profile_id ? formData.voice_profile_id : null,
        use_conversational_greeting: formData.use_conversational_greeting,
        greeting_style: formData.greeting_style,
        time_aware_greeting: formData.time_aware_greeting,
        include_wellbeing_check: formData.include_wellbeing_check,
        enable_response_capture: formData.enable_response_capture,
        status: 'pending',
      };

      let taskId: string;
      if (editingTask) {
        const { error } = await supabase
          .from('care_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        taskId = editingTask.id;

        await supabase
          .from('reminder_schedule')
          .delete()
          .eq('task_id', editingTask.id);
      } else {
        const { data, error } = await supabase
          .from('care_tasks')
          .insert(taskData)
          .select()
          .single();

        if (error) throw error;
        taskId = data.id;
      }

      const scheduleData = formData.schedules.map((schedule) => ({
        task_id: taskId,
        day_of_week: schedule.day_of_week,
        time_of_day: schedule.time_of_day,
        active: true,
      }));

      const { error: scheduleError } = await supabase
        .from('reminder_schedule')
        .insert(scheduleData);

      if (scheduleError) throw scheduleError;

      if (!editingTask) {
        const subscription = await getUserSubscription(selectedElder.id);
        if (subscription) {
          await trackFeatureUsage(subscription.id, 'reminders', 1);
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save reminder. Please try again.');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const { error } = await supabase
        .from('care_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete reminder. Please try again.');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      type: task.type,
      reminder_method: task.reminder_method || ['sms', 'push'],
      escalation_threshold: task.escalation_threshold || 3,
      use_cloned_voice: task.use_cloned_voice || false,
      voice_profile_id: task.voice_profile_id || '',
      use_conversational_greeting: task.use_conversational_greeting || false,
      greeting_style: task.greeting_style || 'brief',
      time_aware_greeting: task.time_aware_greeting !== undefined ? task.time_aware_greeting : true,
      include_wellbeing_check: task.include_wellbeing_check || false,
      enable_response_capture: task.enable_response_capture || false,
      schedules: [{ day_of_week: null, time_of_day: '09:00' }],
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      type: 'med',
      reminder_method: ['sms', 'push'],
      escalation_threshold: 3,
      use_cloned_voice: false,
      voice_profile_id: '',
      use_conversational_greeting: false,
      greeting_style: 'brief',
      time_aware_greeting: true,
      include_wellbeing_check: false,
      enable_response_capture: false,
      schedules: [{ day_of_week: null, time_of_day: '09:00' }],
    });
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} reminder(s)?`)) return;

    try {
      const { error } = await supabase
        .from('care_tasks')
        .delete()
        .in('id', selectedTasks);

      if (error) throw error;
      setSelectedTasks([]);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      alert('Failed to delete reminders. Please try again.');
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

  const filteredTasks = filterType === 'all'
    ? tasks
    : tasks.filter(task => task.type === filterType);

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedules: [...formData.schedules, { day_of_week: null, time_of_day: '09:00' }],
    });
  };

  const updateSchedule = (index: number, field: string, value: any) => {
    const newSchedules = [...formData.schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setFormData({ ...formData, schedules: newSchedules });
  };

  const removeSchedule = (index: number) => {
    setFormData({
      ...formData,
      schedules: formData.schedules.filter((_, i) => i !== index),
    });
  };

  const toggleReminderMethod = (method: string) => {
    const current = formData.reminder_method;
    if (current.includes(method)) {
      setFormData({
        ...formData,
        reminder_method: current.filter((m) => m !== method),
      });
    } else {
      setFormData({
        ...formData,
        reminder_method: [...current, method],
      });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-deep-navy text-xl py-12">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/nok-dashboard">
            <Button variant="ghost" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>

          <div className="flex gap-3">
            {selectedTasks.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                className="border-coral-red text-coral-red hover:bg-coral-red/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedTasks.length})
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
            <DialogTrigger asChild>
              <Button className="bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[16px]">
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Create Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Reminder' : 'Create New Reminder'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="title">Reminder Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Take morning medication"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="med">Medication</SelectItem>
                      <SelectItem value="hydrate">Hydration</SelectItem>
                      <SelectItem value="walk">Exercise/Walk</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-3 block">Delivery Methods</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sms"
                        checked={formData.reminder_method.includes('sms')}
                        onCheckedChange={() => toggleReminderMethod('sms')}
                      />
                      <label htmlFor="sms" className="flex items-center cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        SMS Text Message
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="call"
                        checked={formData.reminder_method.includes('call')}
                        onCheckedChange={() => toggleReminderMethod('call')}
                      />
                      <label htmlFor="call" className="flex items-center cursor-pointer">
                        <Phone className="w-4 h-4 mr-2" />
                        Phone Call
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="push"
                        checked={formData.reminder_method.includes('push')}
                        onCheckedChange={() => toggleReminderMethod('push')}
                      />
                      <label htmlFor="push" className="flex items-center cursor-pointer">
                        <Bell className="w-4 h-4 mr-2" />
                        App Notification
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="email"
                        checked={formData.reminder_method.includes('email')}
                        onCheckedChange={() => toggleReminderMethod('email')}
                      />
                      <label htmlFor="email" className="flex items-center cursor-pointer">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </label>
                    </div>
                  </div>
                </div>

                {(formData.reminder_method.includes('call') || formData.reminder_method.includes('sms')) && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="use_cloned_voice"
                          checked={formData.use_cloned_voice}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, use_cloned_voice: checked as boolean })
                          }
                        />
                        <label htmlFor="use_cloned_voice" className="cursor-pointer">
                          Use cloned voice for reminders
                        </label>
                      </div>
                      {formData.use_cloned_voice && (
                        <Select
                          value={formData.voice_profile_id}
                          onValueChange={(value) => setFormData({ ...formData, voice_profile_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select voice profile" />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceProfiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.voice_name}
                              </SelectItem>
                            ))}
                            {voiceProfiles.length === 0 && (
                              <SelectItem value="none" disabled>
                                No voice profiles available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="use_conversational_greeting"
                          checked={formData.use_conversational_greeting}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, use_conversational_greeting: checked as boolean })
                          }
                        />
                        <label htmlFor="use_conversational_greeting" className="cursor-pointer font-semibold">
                          Use warm, conversational greetings
                        </label>
                      </div>
                      <p className="text-sm text-deep-navy/60 mb-3 ml-6">
                        Add friendly greetings like "How are you today?" to make reminders feel more personal and caring
                      </p>

                      {formData.use_conversational_greeting && (
                        <div className="space-y-3 ml-6">
                          <div>
                            <Label htmlFor="greeting_style">Greeting Style</Label>
                            <Select
                              value={formData.greeting_style}
                              onValueChange={(value) => setFormData({ ...formData, greeting_style: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="brief">Brief - Quick and simple</SelectItem>
                                <SelectItem value="warm">Warm - Friendly and caring</SelectItem>
                                <SelectItem value="casual">Casual - Relaxed and friendly</SelectItem>
                                <SelectItem value="formal">Formal - Professional and respectful</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="time_aware_greeting"
                              checked={formData.time_aware_greeting}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, time_aware_greeting: checked as boolean })
                              }
                            />
                            <label htmlFor="time_aware_greeting" className="cursor-pointer text-sm">
                              Time-aware (Good morning, afternoon, evening)
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="include_wellbeing_check"
                              checked={formData.include_wellbeing_check}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, include_wellbeing_check: checked as boolean })
                              }
                            />
                            <label htmlFor="include_wellbeing_check" className="cursor-pointer text-sm">
                              Include wellbeing check ("Hope you're doing well")
                            </label>
                          </div>

                          {formData.reminder_method.includes('call') && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="enable_response_capture"
                                checked={formData.enable_response_capture}
                                onCheckedChange={(checked) =>
                                  setFormData({ ...formData, enable_response_capture: checked as boolean })
                                }
                              />
                              <label htmlFor="enable_response_capture" className="cursor-pointer text-sm">
                                Ask "How are you?" and capture response (Press 1 if well, 2 if need help)
                              </label>
                            </div>
                          )}

                          <Alert className="bg-sky-blue/10 border-sky-blue/30">
                            <AlertDescription className="text-sm">
                              <strong>Example message:</strong><br />
                              {formData.greeting_style === 'warm' && formData.time_aware_greeting && formData.include_wellbeing_check
                                ? `"Good morning, ${selectedElder?.name}! It's lovely to speak with you. I hope you're feeling well this morning. This is a reminder: ${formData.title || '[reminder]'}. Take care and have a wonderful day."`
                                : formData.greeting_style === 'casual'
                                ? `"Hey ${selectedElder?.name}! Hope you're doing great. This is a reminder: ${formData.title || '[reminder]'}. Have a good one!"`
                                : formData.greeting_style === 'formal'
                                ? `"Good day, ${selectedElder?.name}. I trust you are well. This is a reminder: ${formData.title || '[reminder]'}. I wish you well."`
                                : `"Good morning, ${selectedElder?.name}. I hope you're doing well. This is a reminder: ${formData.title || '[reminder]'}. Take care."`
                              }
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="escalation">Missed Attempts Before Alert</Label>
                  <Input
                    id="escalation"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.escalation_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, escalation_threshold: parseInt(e.target.value) || 3 })
                    }
                  />
                  <p className="text-sm text-deep-navy/60 mt-1">
                    You'll be alerted after this many missed reminders
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Reminder Schedule</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addSchedule}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Time
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.schedules.map((schedule, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <Select
                          value={schedule.day_of_week?.toString() || 'daily'}
                          onValueChange={(value) =>
                            updateSchedule(index, 'day_of_week', value === 'daily' ? null : parseInt(value))
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Every Day</SelectItem>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={schedule.time_of_day}
                          onChange={(e) => updateSchedule(index, 'time_of_day', e.target.value)}
                          className="flex-1"
                        />
                        {formData.schedules.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSchedule(index)}
                          >
                            <Trash2 className="w-4 h-4 text-coral-red" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-mint-green hover:bg-mint-green/90 text-deep-navy">
                    {editingTask ? 'Update Reminder' : 'Create Reminder'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center">
            Manage Reminders
          </h1>
          {selectedElder && (
            <p className="text-body text-deep-navy/70 text-center mt-2">
              Setting reminders for {selectedElder.name}
            </p>
          )}
        </Card>

        {elders.length > 1 && (
          <Card className="bg-white rounded-[20px] shadow-md p-6 mb-6">
            <Label className="text-deep-navy font-semibold mb-3 block">Select Elder</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {elders.map((elder) => (
                <Button
                  key={elder.id}
                  onClick={() => setSelectedElder(elder)}
                  variant={selectedElder?.id === elder.id ? 'default' : 'outline'}
                  className="justify-start h-auto py-4 px-6 rounded-[16px]"
                >
                  <div className="text-left">
                    <p className="font-semibold">{elder.name}</p>
                    {elder.phone_number && (
                      <p className="text-sm opacity-70">{elder.phone_number}</p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        )}

        {tasks.length > 0 && (
          <Card className="bg-white rounded-[20px] shadow-md p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-deep-navy font-medium">
                  {selectedTasks.length > 0
                    ? `${selectedTasks.length} selected`
                    : 'Select all'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-deep-navy/60" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="med">Medication</SelectItem>
                    <SelectItem value="hydrate">Hydration</SelectItem>
                    <SelectItem value="walk">Exercise</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {filteredTasks.length === 0 && tasks.length === 0 ? (
            <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
              <p className="text-lg text-deep-navy/70 mb-4">No reminders set up yet</p>
              <p className="text-sm text-deep-navy/60">
                Create your first reminder to help {selectedElder?.name} stay on track
              </p>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
              <Filter className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
              <p className="text-lg text-deep-navy/70">No reminders match this filter</p>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className={`rounded-[20px] shadow-md p-6 hover:shadow-lg transition-all ${
                selectedTasks.includes(task.id) ? 'bg-sky-blue/10 border-2 border-sky-blue' : 'bg-white'
              }`}>
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => toggleTaskSelection(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-deep-navy mb-2">{task.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-3 py-1 bg-sky-blue/20 text-sky-blue rounded-full text-sm capitalize">
                        {task.type}
                      </span>
                      {task.reminder_method?.map((method) => (
                        <span key={method} className="px-3 py-1 bg-mint-green/20 text-mint-green rounded-full text-sm flex items-center">
                          {method === 'sms' && <MessageSquare className="w-3 h-3 mr-1" />}
                          {method === 'call' && <Phone className="w-3 h-3 mr-1" />}
                          {method === 'push' && <Bell className="w-3 h-3 mr-1" />}
                          {method === 'email' && <Mail className="w-3 h-3 mr-1" />}
                          {method}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-deep-navy/60">
                      Alert after {task.escalation_threshold} missed reminders
                      {task.use_cloned_voice && ' • Uses cloned voice'}
                      {task.use_conversational_greeting && ` • ${task.greeting_style || 'Brief'} greeting style`}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)} className="text-coral-red hover:text-coral-red">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
