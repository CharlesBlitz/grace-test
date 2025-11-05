import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReminderRequest {
  taskId: string;
  elderId: string;
  elderPhone: string;
  elderName: string;
  reminderMessage: string;
  deliveryMethod: 'sms' | 'call';
  useClonedVoice: boolean;
  voiceProfileId?: string;
  useConversationalGreeting?: boolean;
  greetingStyle?: 'brief' | 'warm' | 'casual' | 'formal';
  timeAwareGreeting?: boolean;
  includeWellbeingCheck?: boolean;
  enableResponseCapture?: boolean;
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

function estimateMessageDuration(message: string): number {
  const wordCount = message.split(/\s+/).length;
  const baseSeconds = Math.ceil(wordCount / 2.5);
  return Math.min(baseSeconds + 3, 60);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateConversationalMessage(
  supabase: any,
  elderName: string,
  reminderMessage: string,
  greetingStyle: string,
  timeAware: boolean,
  includeWellbeingCheck: boolean
): Promise<{ message: string; duration: number; styleUsed: string }> {
  const timeOfDay = timeAware ? getTimeOfDay() : 'any';

  try {
    const { data: template } = await supabase
      .from('conversational_greeting_templates')
      .select('*')
      .eq('greeting_style', greetingStyle)
      .eq('time_of_day', timeOfDay)
      .eq('active', true)
      .maybeSingle();

    const fallbackTemplate = !template ? await supabase
      .from('conversational_greeting_templates')
      .select('*')
      .eq('greeting_style', greetingStyle)
      .eq('time_of_day', 'any')
      .eq('active', true)
      .maybeSingle() : null;

    const selectedTemplate = template || fallbackTemplate?.data;

    if (selectedTemplate) {
      const parts: string[] = [];
      const greeting = selectedTemplate.greeting_text.replace('[name]', elderName);
      parts.push(greeting);

      if (includeWellbeingCheck && selectedTemplate.wellbeing_phrase) {
        parts.push(selectedTemplate.wellbeing_phrase);
      }

      parts.push(`This is a reminder: ${reminderMessage}`);

      if (selectedTemplate.closing_text) {
        parts.push(selectedTemplate.closing_text);
      }

      const fullMessage = parts.join(' ');
      return {
        message: fullMessage,
        duration: estimateMessageDuration(fullMessage),
        styleUsed: greetingStyle
      };
    }
  } catch (error) {
    console.error('Error fetching greeting template:', error);
  }

  const fallbackMessage = `Hi ${elderName}, this is a reminder: ${reminderMessage}`;
  return {
    message: fallbackMessage,
    duration: estimateMessageDuration(fallbackMessage),
    styleUsed: greetingStyle
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const requestData: ReminderRequest = await req.json();
    const {
      taskId,
      elderId,
      elderPhone,
      elderName,
      reminderMessage,
      deliveryMethod,
      useClonedVoice,
      voiceProfileId,
      useConversationalGreeting = false,
      greetingStyle = 'brief',
      timeAwareGreeting = true,
      includeWellbeingCheck = false,
      enableResponseCapture = false,
    } = requestData;

    if (!elderPhone) {
      throw new Error('Elder phone number is required');
    }

    let finalMessage = `Hi ${elderName}, this is a reminder: ${reminderMessage}`;
    let messageDuration = estimateMessageDuration(finalMessage);
    let greetingStyleUsed = 'none';

    if (useConversationalGreeting) {
      const conversationalResult = await generateConversationalMessage(
        supabase,
        elderName,
        reminderMessage,
        greetingStyle,
        timeAwareGreeting,
        includeWellbeingCheck
      );
      finalMessage = conversationalResult.message;
      messageDuration = conversationalResult.duration;
      greetingStyleUsed = conversationalResult.styleUsed;
    }

    let notificationLog: any = {
      task_id: taskId,
      elder_id: elderId,
      notification_type: 'reminder',
      delivery_method: deliveryMethod,
      recipient: elderPhone,
      message_content: finalMessage,
      status: 'pending',
      greeting_style_used: greetingStyleUsed,
      message_duration_seconds: messageDuration,
      created_at: new Date().toISOString(),
    };

    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    if (deliveryMethod === 'sms') {
      const smsBody = new URLSearchParams({
        To: elderPhone,
        From: twilioPhoneNumber,
        Body: finalMessage,
      });

      const smsResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: smsBody.toString(),
        }
      );

      const smsResult = await smsResponse.json();

      if (smsResponse.ok) {
        notificationLog.status = 'sent';
        notificationLog.external_id = smsResult.sid;
        notificationLog.sent_at = new Date().toISOString();
      } else {
        notificationLog.status = 'failed';
        notificationLog.error_message = smsResult.message || 'SMS send failed';
      }
    } else if (deliveryMethod === 'call') {
      let audioUrl = '';

      if (useClonedVoice && voiceProfileId && elevenLabsApiKey) {
        const { data: profile } = await supabase
          .from('voice_profiles')
          .select('elevenlabs_voice_id')
          .eq('id', voiceProfileId)
          .maybeSingle();

        if (profile?.elevenlabs_voice_id) {
          const ttsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${profile.elevenlabs_voice_id}`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: finalMessage,
                model_id: 'eleven_monolingual_v1',
              }),
            }
          );

          if (ttsResponse.ok) {
            const audioBlob = await ttsResponse.arrayBuffer();
            const fileName = `voice-reminders/${taskId}-${Date.now()}.mp3`;

            const { data: uploadData } = await supabase.storage
              .from('voice-recordings')
              .upload(fileName, audioBlob, {
                contentType: 'audio/mpeg',
                upsert: false,
              });

            if (uploadData) {
              const { data: urlData } = supabase.storage
                .from('voice-recordings')
                .getPublicUrl(fileName);

              if (urlData) {
                audioUrl = urlData.publicUrl;
              }
            }
          }
        }
      }

      let twimlUrl = '';

      if (audioUrl) {
        twimlUrl = `https://twimlets.com/echo?Twiml=%3CResponse%3E%3CPlay%3E${encodeURIComponent(audioUrl)}%3C%2FPlay%3E%3C%2FResponse%3E`;
      } else if (enableResponseCapture) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(finalMessage)}</Say>
  <Gather numDigits="1" timeout="5" action="${supabaseUrl}/functions/v1/reminder-response-handler">
    <Say voice="Polly.Joanna">If you're doing well, press 1. If you need assistance, press 2.</Say>
  </Gather>
  <Say voice="Polly.Joanna">Thank you. Take care.</Say>
</Response>`;
        const encodedTwiml = encodeURIComponent(twiml);
        twimlUrl = `https://twimlets.com/echo?Twiml=${encodedTwiml}`;
      } else {
        twimlUrl = `https://twimlets.com/echo?Twiml=%3CResponse%3E%3CSay%20voice%3D%22Polly.Joanna%22%3E${encodeURIComponent(finalMessage)}%3C%2FSay%3E%3C%2FResponse%3E`;
      }

      const callBody = new URLSearchParams({
        To: elderPhone,
        From: twilioPhoneNumber,
        Url: twimlUrl,
      });

      const callResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: callBody.toString(),
        }
      );

      const callResult = await callResponse.json();

      if (callResponse.ok) {
        notificationLog.status = 'sent';
        notificationLog.external_id = callResult.sid;
        notificationLog.sent_at = new Date().toISOString();
      } else {
        notificationLog.status = 'failed';
        notificationLog.error_message = callResult.message || 'Call initiation failed';
      }
    }

    const { error: logError } = await supabase
      .from('notification_log')
      .insert(notificationLog);

    if (logError) {
      console.error('Failed to log notification:', logError);
    }

    const { error: updateError } = await supabase
      .from('care_tasks')
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq('id', taskId);

    if (updateError) {
      console.error('Failed to update task:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: notificationLog.status === 'sent',
        status: notificationLog.status,
        deliveryMethod,
        externalId: notificationLog.external_id,
        messageDuration,
        greetingStyleUsed,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending reminder:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
