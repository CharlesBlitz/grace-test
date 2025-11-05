import { supabase } from './supabaseClient';

export interface WellnessCheckIn {
  id: string;
  check_in_date: string;
  mood_rating: number;
  energy_level: number;
  sleep_quality: number;
  hours_slept: number;
  pain_level: number;
  pain_location: string;
  notes: string;
}

export interface WellnessSummaryData {
  elderId: string;
  reportType: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  totalCheckIns: number;
  checkInCompletionRate: number;
  avgMoodRating: number;
  moodTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  avgEnergyLevel: number;
  energyTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  avgSleepQuality: number;
  avgHoursSlept: number;
  sleepTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  avgPainLevel: number;
  painTrend: 'improving' | 'stable' | 'worsening' | 'none';
  daysWithPain: number;
  overallWellnessScore: number;
  wellnessTrend: 'improving' | 'stable' | 'declining' | 'mixed';
  keyInsights: string[];
  concerningPatterns: string[];
  positiveHighlights: string[];
}

export async function getWellnessCheckInsForPeriod(
  elderId: string,
  startDate: string,
  endDate: string
): Promise<WellnessCheckIn[]> {
  const { data, error } = await supabase
    .from('wellness_check_ins')
    .select('*')
    .eq('elder_id', elderId)
    .gte('check_in_date', startDate)
    .lte('check_in_date', endDate)
    .order('check_in_date', { ascending: true });

  if (error) {
    console.error('Error fetching wellness check-ins:', error);
    return [];
  }

  return data || [];
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

export function determineTrend(
  currentValue: number,
  previousValue: number,
  isInverted: boolean = false
): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  if (!previousValue || previousValue === 0) return 'insufficient_data';

  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  const threshold = 5;

  if (isInverted) {
    if (percentChange < -threshold) return 'improving';
    if (percentChange > threshold) return 'declining';
  } else {
    if (percentChange > threshold) return 'improving';
    if (percentChange < -threshold) return 'declining';
  }

  return 'stable';
}

export function calculateWellnessScore(
  mood: number,
  energy: number,
  sleep: number,
  pain: number
): number {
  const moodScore = (mood / 5) * 30;
  const energyScore = (energy / 5) * 25;
  const sleepScore = (sleep / 5) * 25;
  const painScore = ((10 - pain) / 10) * 20;

  return Math.round(moodScore + energyScore + sleepScore + painScore);
}

export async function analyzeWellnessData(
  elderId: string,
  reportType: 'weekly' | 'monthly',
  periodStart: string,
  periodEnd: string
): Promise<WellnessSummaryData | null> {
  const checkIns = await getWellnessCheckInsForPeriod(elderId, periodStart, periodEnd);

  if (checkIns.length === 0) {
    return null;
  }

  const startDateObj = new Date(periodStart);
  const endDateObj = new Date(periodEnd);
  const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const checkInCompletionRate = Math.round((checkIns.length / totalDays) * 100);

  const moodRatings = checkIns.map(c => c.mood_rating).filter(v => v !== null);
  const energyLevels = checkIns.map(c => c.energy_level).filter(v => v !== null);
  const sleepQualities = checkIns.map(c => c.sleep_quality).filter(v => v !== null);
  const hoursSlept = checkIns.map(c => c.hours_slept).filter(v => v !== null);
  const painLevels = checkIns.map(c => c.pain_level).filter(v => v !== null);

  const avgMoodRating = calculateAverage(moodRatings);
  const avgEnergyLevel = calculateAverage(energyLevels);
  const avgSleepQuality = calculateAverage(sleepQualities);
  const avgHoursSlept = calculateAverage(hoursSlept);
  const avgPainLevel = calculateAverage(painLevels);
  const daysWithPain = checkIns.filter(c => c.pain_level > 0).length;

  const overallWellnessScore = calculateWellnessScore(
    avgMoodRating,
    avgEnergyLevel,
    avgSleepQuality,
    avgPainLevel
  );

  let comparisonStart: string;
  let comparisonEnd: string;

  if (reportType === 'weekly') {
    const compareStartDate = new Date(startDateObj);
    compareStartDate.setDate(compareStartDate.getDate() - 7);
    const compareEndDate = new Date(startDateObj);
    compareEndDate.setDate(compareEndDate.getDate() - 1);
    comparisonStart = compareStartDate.toISOString().split('T')[0];
    comparisonEnd = compareEndDate.toISOString().split('T')[0];
  } else {
    const compareStartDate = new Date(startDateObj);
    compareStartDate.setMonth(compareStartDate.getMonth() - 1);
    const compareEndDate = new Date(endDateObj);
    compareEndDate.setMonth(compareEndDate.getMonth() - 1);
    comparisonStart = compareStartDate.toISOString().split('T')[0];
    comparisonEnd = compareEndDate.toISOString().split('T')[0];
  }

  const comparisonCheckIns = await getWellnessCheckInsForPeriod(elderId, comparisonStart, comparisonEnd);

  let moodTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';
  let energyTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';
  let sleepTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';
  let painTrend: 'improving' | 'stable' | 'worsening' | 'none' = 'none';

  if (comparisonCheckIns.length > 0) {
    const prevMood = calculateAverage(comparisonCheckIns.map(c => c.mood_rating).filter(v => v !== null));
    const prevEnergy = calculateAverage(comparisonCheckIns.map(c => c.energy_level).filter(v => v !== null));
    const prevSleep = calculateAverage(comparisonCheckIns.map(c => c.sleep_quality).filter(v => v !== null));
    const prevPain = calculateAverage(comparisonCheckIns.map(c => c.pain_level).filter(v => v !== null));

    moodTrend = determineTrend(avgMoodRating, prevMood);
    energyTrend = determineTrend(avgEnergyLevel, prevEnergy);
    sleepTrend = determineTrend(avgSleepQuality, prevSleep);

    if (avgPainLevel === 0) {
      painTrend = 'none';
    } else {
      const painTrendRaw = determineTrend(avgPainLevel, prevPain, true);
      painTrend = painTrendRaw === 'declining' ? 'worsening' : painTrendRaw === 'improving' ? 'improving' : 'stable';
    }
  }

  const improvingCount = [moodTrend, energyTrend, sleepTrend].filter(t => t === 'improving').length;
  const decliningCount = [moodTrend, energyTrend, sleepTrend].filter(t => t === 'declining').length;

  let wellnessTrend: 'improving' | 'stable' | 'declining' | 'mixed' = 'stable';
  if (improvingCount >= 2) wellnessTrend = 'improving';
  else if (decliningCount >= 2) wellnessTrend = 'declining';
  else if (improvingCount > 0 && decliningCount > 0) wellnessTrend = 'mixed';

  const keyInsights = generateKeyInsights({
    avgMoodRating,
    avgEnergyLevel,
    avgSleepQuality,
    avgHoursSlept,
    avgPainLevel,
    checkInCompletionRate,
    totalCheckIns: checkIns.length,
  });

  const concerningPatterns = generateConcerningPatterns({
    avgMoodRating,
    avgEnergyLevel,
    avgSleepQuality,
    avgHoursSlept,
    avgPainLevel,
    moodTrend,
    energyTrend,
    sleepTrend,
    painTrend,
    checkInCompletionRate,
  });

  const positiveHighlights = generatePositiveHighlights({
    avgMoodRating,
    avgEnergyLevel,
    avgSleepQuality,
    avgHoursSlept,
    avgPainLevel,
    moodTrend,
    energyTrend,
    sleepTrend,
    painTrend,
    checkInCompletionRate,
  });

  return {
    elderId,
    reportType,
    periodStart,
    periodEnd,
    totalCheckIns: checkIns.length,
    checkInCompletionRate,
    avgMoodRating,
    moodTrend,
    avgEnergyLevel,
    energyTrend,
    avgSleepQuality,
    avgHoursSlept,
    sleepTrend,
    avgPainLevel,
    painTrend,
    daysWithPain,
    overallWellnessScore,
    wellnessTrend,
    keyInsights,
    concerningPatterns,
    positiveHighlights,
  };
}

function generateKeyInsights(metrics: {
  avgMoodRating: number;
  avgEnergyLevel: number;
  avgSleepQuality: number;
  avgHoursSlept: number;
  avgPainLevel: number;
  checkInCompletionRate: number;
  totalCheckIns: number;
}): string[] {
  const insights: string[] = [];

  if (metrics.checkInCompletionRate >= 80) {
    insights.push(`Excellent engagement with ${metrics.totalCheckIns} wellness check-ins completed`);
  }

  if (metrics.avgMoodRating >= 4) {
    insights.push('Consistently positive mood throughout the period');
  }

  if (metrics.avgSleepQuality >= 4 && metrics.avgHoursSlept >= 7) {
    insights.push('Maintaining good sleep habits with quality rest');
  }

  if (metrics.avgEnergyLevel >= 4) {
    insights.push('High energy levels indicate good vitality');
  }

  if (metrics.avgPainLevel === 0) {
    insights.push('No pain reported during this period');
  }

  return insights;
}

function generateConcerningPatterns(data: any): string[] {
  const patterns: string[] = [];

  if (data.avgMoodRating <= 2) {
    patterns.push('Low mood scores may indicate emotional distress');
  }

  if (data.moodTrend === 'declining') {
    patterns.push('Declining mood trend requires attention');
  }

  if (data.avgSleepQuality <= 2) {
    patterns.push('Poor sleep quality affecting overall wellness');
  }

  if (data.avgHoursSlept < 6) {
    patterns.push('Insufficient sleep duration detected');
  }

  if (data.avgPainLevel >= 7) {
    patterns.push('High pain levels requiring medical review');
  }

  if (data.painTrend === 'worsening') {
    patterns.push('Pain levels increasing over time');
  }

  if (data.avgEnergyLevel <= 2) {
    patterns.push('Low energy levels may indicate fatigue or health concerns');
  }

  if (data.checkInCompletionRate < 50) {
    patterns.push('Low wellness check-in participation');
  }

  return patterns;
}

function generatePositiveHighlights(data: any): string[] {
  const highlights: string[] = [];

  if (data.moodTrend === 'improving') {
    highlights.push('Mood is improving compared to previous period');
  }

  if (data.energyTrend === 'improving') {
    highlights.push('Energy levels are on an upward trend');
  }

  if (data.sleepTrend === 'improving') {
    highlights.push('Sleep quality is getting better');
  }

  if (data.painTrend === 'improving') {
    highlights.push('Pain levels are decreasing');
  }

  if (data.checkInCompletionRate >= 90) {
    highlights.push('Outstanding consistency with daily check-ins');
  }

  if (data.avgMoodRating >= 4 && data.avgEnergyLevel >= 4) {
    highlights.push('Maintaining excellent overall wellbeing');
  }

  return highlights;
}

export async function saveWellnessSummary(summaryData: WellnessSummaryData, organizationId?: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('wellness_summaries')
      .insert({
        elder_id: summaryData.elderId,
        organization_id: organizationId,
        report_type: summaryData.reportType,
        report_period_start: summaryData.periodStart,
        report_period_end: summaryData.periodEnd,
        total_check_ins: summaryData.totalCheckIns,
        check_in_completion_rate: summaryData.checkInCompletionRate,
        avg_mood_rating: summaryData.avgMoodRating,
        mood_trend: summaryData.moodTrend,
        avg_energy_level: summaryData.avgEnergyLevel,
        energy_trend: summaryData.energyTrend,
        avg_sleep_quality: summaryData.avgSleepQuality,
        avg_hours_slept: summaryData.avgHoursSlept,
        sleep_trend: summaryData.sleepTrend,
        avg_pain_level: summaryData.avgPainLevel,
        pain_trend: summaryData.painTrend,
        days_with_pain: summaryData.daysWithPain,
        overall_wellness_score: summaryData.overallWellnessScore,
        wellness_trend: summaryData.wellnessTrend,
        key_insights: summaryData.keyInsights,
        concerning_patterns: summaryData.concerningPatterns,
        positive_highlights: summaryData.positiveHighlights,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving wellness summary:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Exception saving wellness summary:', error);
    return null;
  }
}

export async function createWellnessAlerts(
  elderId: string,
  summaryId: string,
  concerningPatterns: string[],
  metrics: any,
  organizationId?: string
): Promise<void> {
  const alerts: any[] = [];

  if (metrics.avgMoodRating <= 2) {
    alerts.push({
      elder_id: elderId,
      organization_id: organizationId,
      wellness_summary_id: summaryId,
      alert_type: 'declining_mood',
      severity: 'high',
      title: 'Low Mood Alert',
      description: 'Consistently low mood scores detected',
      metric_affected: 'mood',
      current_value: metrics.avgMoodRating,
      threshold_value: 2,
    });
  }

  if (metrics.avgPainLevel >= 7) {
    alerts.push({
      elder_id: elderId,
      organization_id: organizationId,
      wellness_summary_id: summaryId,
      alert_type: 'high_pain',
      severity: 'critical',
      title: 'High Pain Alert',
      description: 'Severe pain levels requiring immediate attention',
      metric_affected: 'pain',
      current_value: metrics.avgPainLevel,
      threshold_value: 7,
    });
  }

  if (metrics.avgSleepQuality <= 2) {
    alerts.push({
      elder_id: elderId,
      organization_id: organizationId,
      wellness_summary_id: summaryId,
      alert_type: 'poor_sleep',
      severity: 'medium',
      title: 'Poor Sleep Quality',
      description: 'Sleep quality concerns detected',
      metric_affected: 'sleep_quality',
      current_value: metrics.avgSleepQuality,
      threshold_value: 2,
    });
  }

  if (metrics.avgEnergyLevel <= 2) {
    alerts.push({
      elder_id: elderId,
      organization_id: organizationId,
      wellness_summary_id: summaryId,
      alert_type: 'low_energy',
      severity: 'medium',
      title: 'Low Energy Levels',
      description: 'Persistent low energy may indicate health concerns',
      metric_affected: 'energy',
      current_value: metrics.avgEnergyLevel,
      threshold_value: 2,
    });
  }

  if (alerts.length > 0) {
    const { error } = await supabase.from('wellness_alerts').insert(alerts);
    if (error) {
      console.error('Error creating wellness alerts:', error);
    }
  }
}
