/**
 * Incident Detector
 *
 * Real-time incident detection system that analyzes care interactions
 * to identify potential incidents requiring immediate attention and reporting.
 */

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentKeyword {
  word: string;
  category: string;
  severity: IncidentSeverity;
  weight: number;
}

export interface DetectionResult {
  isIncident: boolean;
  severity: IncidentSeverity;
  confidence: number;
  detectedKeywords: string[];
  categories: string[];
  requiresImmediateAlert: boolean;
  suggestedActions: string[];
}

const INCIDENT_KEYWORDS: IncidentKeyword[] = [
  { word: 'fall', category: 'physical_injury', severity: 'high', weight: 0.9 },
  { word: 'fell', category: 'physical_injury', severity: 'high', weight: 0.9 },
  { word: 'fallen', category: 'physical_injury', severity: 'high', weight: 0.9 },
  { word: 'trip', category: 'physical_injury', severity: 'medium', weight: 0.7 },
  { word: 'tripped', category: 'physical_injury', severity: 'medium', weight: 0.7 },
  { word: 'slip', category: 'physical_injury', severity: 'medium', weight: 0.7 },
  { word: 'slipped', category: 'physical_injury', severity: 'medium', weight: 0.7 },

  { word: 'pain', category: 'physical_distress', severity: 'medium', weight: 0.6 },
  { word: 'hurt', category: 'physical_distress', severity: 'medium', weight: 0.6 },
  { word: 'hurting', category: 'physical_distress', severity: 'medium', weight: 0.6 },
  { word: 'ache', category: 'physical_distress', severity: 'low', weight: 0.4 },
  { word: 'aching', category: 'physical_distress', severity: 'low', weight: 0.4 },
  { word: 'sore', category: 'physical_distress', severity: 'low', weight: 0.4 },

  { word: 'injury', category: 'physical_injury', severity: 'high', weight: 0.8 },
  { word: 'injured', category: 'physical_injury', severity: 'high', weight: 0.8 },
  { word: 'wound', category: 'physical_injury', severity: 'high', weight: 0.8 },
  { word: 'bleeding', category: 'physical_injury', severity: 'critical', weight: 1.0 },
  { word: 'bleed', category: 'physical_injury', severity: 'critical', weight: 1.0 },
  { word: 'blood', category: 'physical_injury', severity: 'high', weight: 0.8 },
  { word: 'bruise', category: 'physical_injury', severity: 'medium', weight: 0.6 },
  { word: 'bruised', category: 'physical_injury', severity: 'medium', weight: 0.6 },
  { word: 'cut', category: 'physical_injury', severity: 'medium', weight: 0.7 },
  { word: 'fracture', category: 'physical_injury', severity: 'critical', weight: 1.0 },
  { word: 'broken', category: 'physical_injury', severity: 'critical', weight: 0.9 },

  { word: 'refuse', category: 'behavior', severity: 'medium', weight: 0.5 },
  { word: 'refused', category: 'behavior', severity: 'medium', weight: 0.5 },
  { word: 'refusing', category: 'behavior', severity: 'medium', weight: 0.5 },
  { word: 'won\'t take', category: 'behavior', severity: 'medium', weight: 0.6 },
  { word: 'won\'t eat', category: 'behavior', severity: 'medium', weight: 0.6 },

  { word: 'upset', category: 'emotional_distress', severity: 'low', weight: 0.4 },
  { word: 'distressed', category: 'emotional_distress', severity: 'medium', weight: 0.6 },
  { word: 'crying', category: 'emotional_distress', severity: 'medium', weight: 0.5 },
  { word: 'agitated', category: 'emotional_distress', severity: 'medium', weight: 0.6 },
  { word: 'angry', category: 'emotional_distress', severity: 'medium', weight: 0.5 },
  { word: 'aggressive', category: 'behavior', severity: 'high', weight: 0.8 },
  { word: 'violent', category: 'behavior', severity: 'critical', weight: 1.0 },
  { word: 'hit', category: 'behavior', severity: 'high', weight: 0.8 },
  { word: 'hitting', category: 'behavior', severity: 'high', weight: 0.8 },
  { word: 'kick', category: 'behavior', severity: 'high', weight: 0.8 },
  { word: 'kicking', category: 'behavior', severity: 'high', weight: 0.8 },
  { word: 'bite', category: 'behavior', severity: 'high', weight: 0.8 },
  { word: 'biting', category: 'behavior', severity: 'high', weight: 0.8 },

  { word: 'confused', category: 'cognitive', severity: 'medium', weight: 0.5 },
  { word: 'confusion', category: 'cognitive', severity: 'medium', weight: 0.5 },
  { word: 'disoriented', category: 'cognitive', severity: 'medium', weight: 0.6 },
  { word: 'wandering', category: 'behavior', severity: 'medium', weight: 0.6 },

  { word: 'choke', category: 'medical_emergency', severity: 'critical', weight: 1.0 },
  { word: 'choking', category: 'medical_emergency', severity: 'critical', weight: 1.0 },
  { word: 'can\'t breathe', category: 'medical_emergency', severity: 'critical', weight: 1.0 },
  { word: 'difficulty breathing', category: 'medical_emergency', severity: 'critical', weight: 1.0 },
  { word: 'chest pain', category: 'medical_emergency', severity: 'critical', weight: 1.0 },
  { word: 'seizure', category: 'medical_emergency', severity: 'critical', weight: 1.0 },
  { word: 'unconscious', category: 'medical_emergency', severity: 'critical', weight: 1.0 },
  { word: 'collapsed', category: 'medical_emergency', severity: 'critical', weight: 1.0 },

  { word: 'medication error', category: 'medication', severity: 'high', weight: 0.9 },
  { word: 'wrong medication', category: 'medication', severity: 'critical', weight: 1.0 },
  { word: 'missed medication', category: 'medication', severity: 'medium', weight: 0.6 },
  { word: 'adverse reaction', category: 'medication', severity: 'high', weight: 0.9 },

  { word: 'absconded', category: 'safeguarding', severity: 'critical', weight: 1.0 },
  { word: 'missing', category: 'safeguarding', severity: 'critical', weight: 1.0 },
  { word: 'abuse', category: 'safeguarding', severity: 'critical', weight: 1.0 },
  { word: 'neglect', category: 'safeguarding', severity: 'critical', weight: 1.0 },
];

const NEGATIVE_SENTIMENT_PHRASES = [
  'very upset',
  'extremely distressed',
  'in tears',
  'won\'t stop crying',
  'completely refused',
  'severely agitated',
  'highly confused',
  'very aggressive',
];

/**
 * Analyze text for potential incidents
 */
export function detectIncident(text: string, sentimentScore?: number): DetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      isIncident: false,
      severity: 'low',
      confidence: 0,
      detectedKeywords: [],
      categories: [],
      requiresImmediateAlert: false,
      suggestedActions: [],
    };
  }

  const lowerText = text.toLowerCase();
  const detectedKeywords: string[] = [];
  const categories = new Set<string>();
  let maxSeverity: IncidentSeverity = 'low';
  let totalWeight = 0;
  let keywordCount = 0;

  for (const keyword of INCIDENT_KEYWORDS) {
    if (lowerText.includes(keyword.word)) {
      detectedKeywords.push(keyword.word);
      categories.add(keyword.category);
      totalWeight += keyword.weight;
      keywordCount++;

      if (getSeverityLevel(keyword.severity) > getSeverityLevel(maxSeverity)) {
        maxSeverity = keyword.severity;
      }
    }
  }

  const hasNegativePhrases = NEGATIVE_SENTIMENT_PHRASES.some(phrase =>
    lowerText.includes(phrase)
  );

  if (hasNegativePhrases) {
    totalWeight += 0.3;
  }

  if (sentimentScore !== undefined && sentimentScore < -0.5) {
    totalWeight += Math.abs(sentimentScore) * 0.2;
  }

  const confidence = Math.min(totalWeight / 2, 1.0);

  const isIncident = keywordCount > 0 && confidence >= 0.4;

  const requiresImmediateAlert =
    maxSeverity === 'critical' ||
    (maxSeverity === 'high' && keywordCount >= 2) ||
    (categories.has('medical_emergency')) ||
    (categories.has('safeguarding'));

  const suggestedActions = generateSuggestedActions(Array.from(categories), maxSeverity);

  return {
    isIncident,
    severity: isIncident ? maxSeverity : 'low',
    confidence: Math.round(confidence * 100) / 100,
    detectedKeywords,
    categories: Array.from(categories),
    requiresImmediateAlert,
    suggestedActions,
  };
}

/**
 * Get numeric severity level for comparison
 */
function getSeverityLevel(severity: IncidentSeverity): number {
  const levels = { low: 1, medium: 2, high: 3, critical: 4 };
  return levels[severity];
}

/**
 * Generate suggested actions based on detected categories and severity
 */
function generateSuggestedActions(categories: string[], severity: IncidentSeverity): string[] {
  const actions: string[] = [];

  if (categories.includes('medical_emergency')) {
    actions.push('Call 999 immediately');
    actions.push('Administer first aid if trained');
    actions.push('Notify senior staff and family');
    actions.push('Document all actions taken');
  } else if (categories.includes('safeguarding')) {
    actions.push('Follow safeguarding procedures');
    actions.push('Notify safeguarding lead');
    actions.push('Contact local authority if required');
    actions.push('Secure evidence and documentation');
  } else if (categories.includes('physical_injury')) {
    if (severity === 'critical' || severity === 'high') {
      actions.push('Assess for serious injury');
      actions.push('Consider calling 999 or GP');
      actions.push('Complete body map and incident report');
      actions.push('Notify family and manager');
    } else {
      actions.push('Assess and treat minor injury');
      actions.push('Complete incident report');
      actions.push('Monitor for changes');
    }
  } else if (categories.includes('behavior')) {
    actions.push('Ensure safety of resident and others');
    actions.push('De-escalate situation calmly');
    actions.push('Review care plan and triggers');
    actions.push('Document behavior and interventions');
  } else if (categories.includes('medication')) {
    actions.push('Assess resident immediately');
    actions.push('Contact GP or 111 for advice');
    actions.push('Complete medication error form');
    actions.push('Review medication administration procedures');
  } else if (categories.includes('emotional_distress') || categories.includes('cognitive')) {
    actions.push('Provide reassurance and comfort');
    actions.push('Assess for underlying causes');
    actions.push('Monitor closely');
    actions.push('Document and inform care team');
  }

  if (actions.length === 0) {
    actions.push('Assess situation');
    actions.push('Document incident details');
    actions.push('Notify senior staff if concerned');
  }

  return actions;
}

/**
 * Analyze conversation for incident patterns over time
 */
export function analyzeConversationHistory(
  transcripts: string[],
  sentimentScores: (number | null)[]
): {
  trendingConcerns: string[];
  averageSentiment: number;
  detectionResults: DetectionResult[];
} {
  const detectionResults: DetectionResult[] = [];
  const allKeywords = new Set<string>();
  let sentimentSum = 0;
  let sentimentCount = 0;

  transcripts.forEach((transcript, index) => {
    const sentiment = sentimentScores[index];
    const result = detectIncident(transcript, sentiment || undefined);
    detectionResults.push(result);

    result.detectedKeywords.forEach(kw => allKeywords.add(kw));

    if (sentiment !== null) {
      sentimentSum += sentiment;
      sentimentCount++;
    }
  });

  const keywordFrequency = new Map<string, number>();
  detectionResults.forEach(result => {
    result.detectedKeywords.forEach(kw => {
      keywordFrequency.set(kw, (keywordFrequency.get(kw) || 0) + 1);
    });
  });

  const trendingConcerns = Array.from(keywordFrequency.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword);

  const averageSentiment = sentimentCount > 0 ? sentimentSum / sentimentCount : 0;

  return {
    trendingConcerns,
    averageSentiment: Math.round(averageSentiment * 100) / 100,
    detectionResults,
  };
}

/**
 * Get incident category display name
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    physical_injury: 'Physical Injury',
    physical_distress: 'Physical Distress',
    behavior: 'Behavioral Concern',
    emotional_distress: 'Emotional Distress',
    cognitive: 'Cognitive Change',
    medical_emergency: 'Medical Emergency',
    medication: 'Medication Issue',
    safeguarding: 'Safeguarding Concern',
  };
  return names[category] || category;
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: IncidentSeverity): string {
  const colors = {
    low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    medium: 'text-orange-600 bg-orange-50 border-orange-200',
    high: 'text-red-600 bg-red-50 border-red-200',
    critical: 'text-red-800 bg-red-100 border-red-300',
  };
  return colors[severity];
}

/**
 * Get severity badge variant
 */
export function getSeverityVariant(severity: IncidentSeverity): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (severity === 'critical' || severity === 'high') return 'destructive';
  if (severity === 'medium') return 'default';
  return 'secondary';
}
