'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  FileText,
  Plus,
  Search,
  Filter,
} from 'lucide-react';

interface CarePlanTask {
  id: string;
  name: string;
  description: string;
  task_type: string;
  frequency: string;
  time_of_day: string;
  care_plan_id: string;
  care_plans: {
    name: string;
    organization_residents: {
      first_name: string;
      last_name: string;
      room_number: string;
    };
  };
  completed_today: boolean;
  last_completion?: {
    completed_at: string;
    notes: string;
  };
}

export default function StaffTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CarePlanTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<CarePlanTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedTask, setSelectedTask] = useState<CarePlanTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadTasks();
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [searchQuery, selectedType, tasks]);

  const loadTasks = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) {
        router.push('/organization/register');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data: tasksData } = await supabase
        .from('care_plan_tasks')
        .select(`
          *,
          care_plans!inner(
            name,
            organization_id,
            organization_residents(
              first_name,
              last_name,
              room_number
            )
          )
        `)
        .eq('care_plans.organization_id', orgUser.organization_id)
        .eq('is_active', true)
        .or(`assigned_staff_id.is.null,assigned_staff_id.eq.${user?.id}`)
        .order('time_of_day');

      if (tasksData) {
        const tasksWithCompletions = await Promise.all(
          tasksData.map(async (task) => {
            const { data: completions, count } = await supabase
              .from('care_plan_task_completions')
              .select('*', { count: 'exact' })
              .eq('task_id', task.id)
              .gte('completed_at', today)
              .order('completed_at', { ascending: false })
              .limit(1);

            return {
              ...task,
              completed_today: (count || 0) > 0,
              last_completion: completions?.[0],
            };
          })
        );

        setTasks(tasksWithCompletions as any);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: 'Error loading tasks',
        description: 'Failed to load care tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.care_plans.organization_residents.first_name.toLowerCase().includes(query) ||
          t.care_plans.organization_residents.last_name.toLowerCase().includes(query) ||
          t.care_plans.organization_residents.room_number.toLowerCase().includes(query)
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter((t) => t.task_type === selectedType);
    }

    setFilteredTasks(filtered);
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    setCompleting(true);

    try {
      await supabase.from('care_plan_task_completions').insert({
        task_id: selectedTask.id,
        care_plan_id: selectedTask.care_plan_id,
        completed_by: user?.id,
        completed_at: new Date().toISOString(),
        notes: completionNotes,
        completion_method: 'manual',
      });

      await supabase.from('care_plan_history').insert({
        care_plan_id: selectedTask.care_plan_id,
        action: 'task_completed',
        changed_by: user?.id,
        changes: {
          task_name: selectedTask.name,
          task_type: selectedTask.task_type,
          completed_at: new Date().toISOString(),
        },
      });

      toast({
        title: 'Task completed',
        description: `${selectedTask.name} has been marked as complete`,
      });

      setSelectedTask(null);
      setCompletionNotes('');
      loadTasks();
    } catch (error: any) {
      toast({
        title: 'Error completing task',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  const getTaskTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      medication: '💊',
      hygiene: '🚿',
      activity: '🏃',
      therapy: '🧘',
      assessment: '📋',
      nutrition: '🍎',
    };
    return icons[type] || '📝';
  };

  const getTaskTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      medication: 'bg-blue-100 text-blue-800',
      hygiene: 'bg-cyan-100 text-cyan-800',
      activity: 'bg-green-100 text-green-800',
      therapy: 'bg-purple-100 text-purple-800',
      assessment: 'bg-orange-100 text-orange-800',
      nutrition: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingTasks = filteredTasks.filter((t) => !t.completed_today);
  const completedTasks = filteredTasks.filter((t) => t.completed_today);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Care Tasks</h1>
          <p className="text-gray-600">Tasks assigned to you for today</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold">{tasks.length}</p>
                </div>
                <ClipboardList className="h-12 w-12 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedTasks.length}</p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingTasks.length}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by task name or resident..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedType === 'medication' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('medication')}
                >
                  Medication
                </Button>
                <Button
                  variant={selectedType === 'hygiene' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('hygiene')}
                >
                  Hygiene
                </Button>
                <Button
                  variant={selectedType === 'activity' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('activity')}
                >
                  Activity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="space-y-4">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{getTaskTypeIcon(task.task_type)}</span>
                            <div>
                              <h3 className="text-lg font-semibold">{task.name}</h3>
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>
                                {task.care_plans.organization_residents.first_name}{' '}
                                {task.care_plans.organization_residents.last_name}
                              </span>
                              <Badge variant="outline">
                                Room {task.care_plans.organization_residents.room_number}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>{task.time_of_day}</span>
                            </div>
                            <Badge className={getTaskTypeColor(task.task_type)}>{task.task_type}</Badge>
                            <Badge variant="outline">{task.frequency}</Badge>
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            setSelectedTask(task);
                            setCompletionNotes('');
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">All tasks completed!</h3>
                    <p className="text-gray-600">Great work! All pending tasks have been completed.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <Card key={task.id} className="bg-green-50/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                            <div>
                              <h3 className="text-lg font-semibold">{task.name}</h3>
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>
                                {task.care_plans.organization_residents.first_name}{' '}
                                {task.care_plans.organization_residents.last_name}
                              </span>
                              <Badge variant="outline">
                                Room {task.care_plans.organization_residents.room_number}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>
                                Completed at{' '}
                                {task.last_completion &&
                                  new Date(task.last_completion.completed_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <Badge className={getTaskTypeColor(task.task_type)}>{task.task_type}</Badge>
                          </div>

                          {task.last_completion?.notes && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <p className="text-sm text-gray-700">{task.last_completion.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No completed tasks yet</h3>
                    <p className="text-gray-600">Tasks you complete today will appear here.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Task</DialogTitle>
              <DialogDescription>
                Add any notes about completing this task
              </DialogDescription>
            </DialogHeader>

            {selectedTask && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1">{selectedTask.name}</h4>
                  <p className="text-sm text-gray-600">
                    For: {selectedTask.care_plans.organization_residents.first_name}{' '}
                    {selectedTask.care_plans.organization_residents.last_name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Completion Notes</label>
                  <Textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Any observations, issues, or notes..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedTask(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCompleteTask} disabled={completing}>
                    {completing ? 'Saving...' : 'Mark Complete'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
