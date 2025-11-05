import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { analyzeMessage } from '@/lib/behaviorEngine';
import { checkFeatureAccess, FEATURE_KEYS } from '@/lib/featureAccessMiddleware';
import { rateLimit, getIdentifier, createRateLimitResponse } from '@/lib/rateLimiter';
import { handleApiError } from '@/lib/errorTracking';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(getIdentifier(request), 'ai');
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.resetTime!);
    }

    const { message, elderId } = await request.json();

    if (!message || !elderId) {
      return NextResponse.json(
        { error: 'message and elderId are required' },
        { status: 400 }
      );
    }

    const accessCheck = await checkFeatureAccess(elderId, FEATURE_KEYS.VOICE_CONVERSATIONS, {
      increment: true,
      requireActive: true,
    });

    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          error: accessCheck.reason,
          limitReached: true,
          upgradeUrl: '/pricing',
          usage: {
            limit: accessCheck.limit,
            current: accessCheck.currentUsage,
            remaining: accessCheck.remaining,
          }
        },
        { status: 403 }
      );
    }

    const { data: tasks } = await supabase
      .from('care_tasks')
      .select('*')
      .eq('elder_id', elderId)
      .eq('status', 'pending');

    const upcomingTasks = (tasks || []).map(task => ({
      id: task.id,
      title: task.title,
      dueMinutes: 30,
    }));

    const { data: carePlans } = await supabase
      .from('care_plans')
      .select(`
        id,
        name,
        care_level,
        care_plan_goals(id, name, category, status, priority),
        care_plan_tasks(id, name, task_type, frequency, time_of_day, is_active),
        organization_residents!inner(id, user_id)
      `)
      .eq('organization_residents.user_id', elderId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    const carePlanContext = carePlans ? {
      planName: carePlans.name,
      careLevel: carePlans.care_level,
      activeGoals: (carePlans.care_plan_goals || []).filter((g: any) => g.status === 'active').length,
      todayTasks: (carePlans.care_plan_tasks || []).filter((t: any) => t.is_active).length,
      priorities: (carePlans.care_plan_goals || [])
        .filter((g: any) => g.priority === 'high' || g.priority === 'critical')
        .map((g: any) => g.name),
    } : null;

    const behaviorResponse = analyzeMessage(message, upcomingTasks);

    let aiEnhancedResponse = behaviorResponse.replyText;

    if (OPENAI_API_KEY && behaviorResponse.actions.some(a => a.type === 'simple_response')) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are Grace, a warm, caring, and patient AI companion for elderly users. Respond with empathy, kindness, and simplicity. Keep responses conversational and brief (2-3 sentences). Use natural language and be supportive.

${carePlanContext ? `CARE PLAN CONTEXT:
You are helping this person with their personalized care plan: "${carePlanContext.planName}"
They have ${carePlanContext.activeGoals} active goals and ${carePlanContext.todayTasks} daily tasks.
${carePlanContext.priorities.length > 0 ? `High priority areas: ${carePlanContext.priorities.join(', ')}` : ''}

When appropriate, gently reference their care plan goals and encourage progress. Celebrate task completions and goal achievements.` : ''}

${upcomingTasks.length > 0 ? `UPCOMING TASKS: ${upcomingTasks.map(t => t.title).join(', ')}. Remind them gently if relevant to the conversation.` : ''}`,
              },
              {
                role: 'user',
                content: message,
              },
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
        });

        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          aiEnhancedResponse = data.choices[0].message.content;
        }
      } catch (error) {
        console.error('Error calling OpenAI:', error);
      }
    }

    const { data: voiceProfile } = await supabase
      .from('voice_profiles')
      .select('*')
      .eq('elder_id', elderId)
      .eq('role', behaviorResponse.voiceRole)
      .maybeSingle();

    let audioBase64: string | null = null;

    if (voiceProfile) {
      try {
        const voiceResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-say`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              voiceId: voiceProfile.eleven_voice_id,
              text: aiEnhancedResponse,
            }),
          }
        );

        if (voiceResponse.ok) {
          const audioBlob = await voiceResponse.blob();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          audioBase64 = `data:audio/mpeg;base64,${base64}`;
        }
      } catch (error) {
        console.error('Error generating voice:', error);
      }
    }

    const transcript = `User: ${message}\nAssistant: ${aiEnhancedResponse}`;

    await supabase.from('conversations').insert({
      elder_id: elderId,
      transcript,
      sentiment: behaviorResponse.sentiment,
    });

    if (behaviorResponse.actions.some(a => a.type === 'emergency')) {
      console.log('EMERGENCY ACTION TRIGGERED for elder:', elderId);
    }

    return NextResponse.json({
      replyText: aiEnhancedResponse,
      audioUrl: audioBase64,
      sentiment: behaviorResponse.sentiment,
      actions: behaviorResponse.actions,
      usage: {
        limit: accessCheck.limit,
        current: accessCheck.currentUsage,
        remaining: accessCheck.remaining,
      },
    });
  } catch (error) {
    return handleApiError(error, request, undefined);
  }
}
