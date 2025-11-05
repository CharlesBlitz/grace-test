'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import DailyNoteReview from '@/components/DailyNoteReview';

export default function ReviewDocumentationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [documentation, setDocumentation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadDocumentation();
  }, [user, id]);

  const loadDocumentation = async () => {
    try {
      const { data, error } = await supabase
        .from('care_documentation')
        .select(`
          *,
          users!care_documentation_resident_id_fkey(name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setDocumentation(data);
    } catch (error) {
      console.error('Error loading documentation:', error);
      alert('Failed to load documentation');
      router.push('/organization/documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    router.push('/organization/documentation');
  };

  const handleReject = () => {
    router.push('/organization/documentation');
  };

  const handleUpdate = () => {
    loadDocumentation();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (!documentation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/organization/documentation')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documentation
        </Button>

        <DailyNoteReview
          documentation={documentation}
          onApprove={handleApprove}
          onReject={handleReject}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
