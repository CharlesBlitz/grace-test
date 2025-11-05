import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  elderId: string;
  organizationId?: string;
  weekOffset?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { elderId, organizationId, weekOffset = 0 }: GenerateRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (weekOffset * 7));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);

    const periodStart = startDate.toISOString().split('T')[0];
    const periodEnd = endDate.toISOString().split('T')[0];

    const { data: checkIns, error: checkInsError } = await supabase
      .from('wellness_check_ins')
      .select('*')
      .eq('elder_id', elderId)
      .gte('check_in_date', periodStart)
      .lte('check_in_date', periodEnd)
      .order('check_in_date', { ascending: true });

    if (checkInsError) throw checkInsError;

    if (!checkIns || checkIns.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No wellness check-ins found for this period',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const totalDays = 7;
    const checkInCompletionRate = Math.round((checkIns.length / totalDays) * 100);

    const moodRatings = checkIns.map(c => c.mood_rating).filter(v => v !== null);
    const energyLevels = checkIns.map(c => c.energy_level).filter(v => v !== null);
    const sleepQualities = checkIns.map(c => c.sleep_quality).filter(v => v !== null);
    const hoursSlept = checkIns.map(c => c.hours_slept).filter(v => v !== null);
    const painLevels = checkIns.map(c => c.pain_level).filter(v => v !== null);

    const calculateAvg = (values: number[]) => {
      if (values.length === 0) return 0;
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    };

    const avgMoodRating = calculateAvg(moodRatings);
    const avgEnergyLevel = calculateAvg(energyLevels);
    const avgSleepQuality = calculateAvg(sleepQualities);
    const avgHoursSlept = calculateAvg(hoursSlept);
    const avgPainLevel = calculateAvg(painLevels);
    const daysWithPain = checkIns.filter(c => c.pain_level > 0).length;

    const moodScore = (avgMoodRating / 5) * 30;
    const energyScore = (avgEnergyLevel / 5) * 25;
    const sleepScore = (avgSleepQuality / 5) * 25;
    const painScore = ((10 - avgPainLevel) / 10) * 20;
    const overallWellnessScore = Math.round(moodScore + energyScore + sleepScore + painScore);

    const compareStartDate = new Date(startDate);
    compareStartDate.setDate(compareStartDate.getDate() - 7);
    const compareEndDate = new Date(startDate);
    compareEndDate.setDate(compareEndDate.getDate() - 1);

    const { data: prevCheckIns } = await supabase
      .from('wellness_check_ins')
      .select('*')
      .eq('elder_id', elderId)
      .gte('check_in_date', compareStartDate.toISOString().split('T')[0])
      .lte('check_in_date', compareEndDate.toISOString().split('T')[0]);

    const determineTrend = (current: number, previous: number, inverted = false) => {
      if (!previous) return 'insufficient_data';
      const change = ((current - previous) / previous) * 100;
      const threshold = 5;
      if (inverted) {
        if (change < -threshold) return 'improving';
        if (change > threshold) return 'declining';
      } else {
        if (change > threshold) return 'improving';
        if (change < -threshold) return 'declining';
      }
      return 'stable';
    };

    let moodTrend = 'insufficient_data';
    let energyTrend = 'insufficient_data';
    let sleepTrend = 'insufficient_data';
    let painTrend = 'none';

    if (prevCheckIns && prevCheckIns.length > 0) {
      const prevMood = calculateAvg(prevCheckIns.map(c => c.mood_rating).filter(v => v !== null));
      const prevEnergy = calculateAvg(prevCheckIns.map(c => c.energy_level).filter(v => v !== null));
      const prevSleep = calculateAvg(prevCheckIns.map(c => c.sleep_quality).filter(v => v !== null));
      const prevPain = calculateAvg(prevCheckIns.map(c => c.pain_level).filter(v => v !== null));

      moodTrend = determineTrend(avgMoodRating, prevMood);
      energyTrend = determineTrend(avgEnergyLevel, prevEnergy);
      sleepTrend = determineTrend(avgSleepQuality, prevSleep);

      if (avgPainLevel === 0) {
        painTrend = 'none';
      } else {
        const rawTrend = determineTrend(avgPainLevel, prevPain, true);
        painTrend = rawTrend === 'declining' ? 'worsening' : rawTrend === 'improving' ? 'improving' : 'stable';
      }
    }

    const trends = [moodTrend, energyTrend, sleepTrend];
    const improvingCount = trends.filter(t => t === 'improving').length;
    const decliningCount = trends.filter(t => t === 'declining').length;

    let wellnessTrend = 'stable';
    if (improvingCount >= 2) wellnessTrend = 'improving';
    else if (decliningCount >= 2) wellnessTrend = 'declining';
    else if (improvingCount > 0 && decliningCount > 0) wellnessTrend = 'mixed';

    const keyInsights: string[] = [];
    if (checkInCompletionRate >= 80) keyInsights.push('Excellent wellness check-in engagement');
    if (avgMoodRating >= 4) keyInsights.push('Consistently positive mood');
    if (avgSleepQuality >= 4 && avgHoursSlept >= 7) keyInsights.push('Maintaining good sleep habits');
    if (avgEnergyLevel >= 4) keyInsights.push('High energy levels');
    if (avgPainLevel === 0) keyInsights.push('No pain reported');

    const concerningPatterns: string[] = [];
    if (avgMoodRating <= 2) concerningPatterns.push('Low mood scores detected');
    if (moodTrend === 'declining') concerningPatterns.push('Declining mood trend');
    if (avgSleepQuality <= 2) concerningPatterns.push('Poor sleep quality');
    if (avgHoursSlept < 6) concerningPatterns.push('Insufficient sleep duration');
    if (avgPainLevel >= 7) concerningPatterns.push('High pain levels');
    if (painTrend === 'worsening') concerningPatterns.push('Increasing pain');
    if (avgEnergyLevel <= 2) concerningPatterns.push('Low energy levels');

    const positiveHighlights: string[] = [];
    if (moodTrend === 'improving') positiveHighlights.push('Mood is improving');
    if (energyTrend === 'improving') positiveHighlights.push('Energy levels increasing');
    if (sleepTrend === 'improving') positiveHighlights.push('Sleep quality improving');
    if (painTrend === 'improving') positiveHighlights.push('Pain levels decreasing');
    if (checkInCompletionRate >= 90) positiveHighlights.push('Outstanding check-in consistency');

    const { data: summary, error: summaryError } = await supabase
      .from('wellness_summaries')
      .insert({
        elder_id: elderId,
        organization_id: organizationId,
        report_type: 'weekly',
        report_period_start: periodStart,
        report_period_end: periodEnd,
        total_check_ins: checkIns.length,
        check_in_completion_rate: checkInCompletionRate,
        avg_mood_rating: avgMoodRating,
        mood_trend: moodTrend,
        avg_energy_level: avgEnergyLevel,
        energy_trend: energyTrend,
        avg_sleep_quality: avgSleepQuality,
        avg_hours_slept: avgHoursSlept,
        sleep_trend: sleepTrend,
        avg_pain_level: avgPainLevel,
        pain_trend: painTrend,
        days_with_pain: daysWithPain,
        overall_wellness_score: overallWellnessScore,
        wellness_trend: wellnessTrend,
        key_insights: keyInsights,
        concerning_patterns: concerningPatterns,
        positive_highlights: positiveHighlights,
      })
      .select('id')
      .single();

    if (summaryError) throw summaryError;

    const alerts: any[] = [];
    if (avgMoodRating <= 2) {
      alerts.push({
        elder_id: elderId,
        organization_id: organizationId,
        wellness_summary_id: summary.id,
        alert_type: 'declining_mood',
        severity: 'high',
        title: 'Low Mood Alert',
        description: 'Consistently low mood scores detected',
        metric_affected: 'mood',
        current_value: avgMoodRating,
        threshold_value: 2,
      });
    }

    if (avgPainLevel >= 7) {
      alerts.push({
        elder_id: elderId,
        organization_id: organizationId,
        wellness_summary_id: summary.id,
        alert_type: 'high_pain',
        severity: 'critical',
        title: 'High Pain Alert',
        description: 'Severe pain levels detected',
        metric_affected: 'pain',
        current_value: avgPainLevel,
        threshold_value: 7,
      });
    }

    if (alerts.length > 0) {
      await supabase.from('wellness_alerts').insert(alerts);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summaryId: summary.id,
        overallWellnessScore,
        wellnessTrend,
        alertsCreated: alerts.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error generating weekly wellness summary:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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