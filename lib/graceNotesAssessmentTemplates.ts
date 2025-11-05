export interface AssessmentTemplate {
  type: string;
  name: string;
  description: string;
  statutoryRequirement: string;
  sections: AssessmentSection[];
}

export interface AssessmentSection {
  key: string;
  title: string;
  order: number;
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'scale';
  required: boolean;
  options?: string[];
  helpText?: string;
}

export const CARE_ACT_ASSESSMENT: AssessmentTemplate = {
  type: 'care_act_2014',
  name: 'Care Act 2014 Needs Assessment',
  description: 'Comprehensive assessment of adult social care needs under the Care Act 2014',
  statutoryRequirement: 'Care Act 2014, Section 9',
  sections: [
    {
      key: 'personal_details',
      title: 'Personal Details',
      order: 1,
      questions: [
        {
          id: 'preferred_name',
          question: 'Preferred name and how they like to be addressed',
          type: 'text',
          required: true,
        },
        {
          id: 'communication_needs',
          question: 'Communication needs and preferences',
          type: 'textarea',
          required: true,
          helpText: 'Include language, hearing, visual, cognitive needs',
        },
        {
          id: 'advocacy_needed',
          question: 'Does the person require an advocate?',
          type: 'boolean',
          required: true,
        },
      ],
    },
    {
      key: 'wellbeing_outcomes',
      title: 'Wellbeing and Outcomes',
      order: 2,
      questions: [
        {
          id: 'personal_dignity',
          question: 'How is the person\'s personal dignity and respect being maintained?',
          type: 'textarea',
          required: true,
        },
        {
          id: 'physical_wellbeing',
          question: 'Physical and mental health and emotional wellbeing',
          type: 'textarea',
          required: true,
        },
        {
          id: 'protection_abuse',
          question: 'Protection from abuse and neglect',
          type: 'textarea',
          required: true,
          helpText: 'Any safeguarding concerns must be addressed immediately',
        },
        {
          id: 'control_daily_life',
          question: 'Control over day-to-day life',
          type: 'textarea',
          required: true,
        },
        {
          id: 'participation',
          question: 'Participation in work, education, training or recreation',
          type: 'textarea',
          required: true,
        },
        {
          id: 'social_relationships',
          question: 'Social and economic wellbeing, relationships',
          type: 'textarea',
          required: true,
        },
        {
          id: 'suitable_accommodation',
          question: 'Suitability of living accommodation',
          type: 'textarea',
          required: true,
        },
        {
          id: 'family_relationships',
          question: 'Family and other significant personal relationships',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'daily_living',
      title: 'Managing and Maintaining Nutrition',
      order: 3,
      questions: [
        {
          id: 'nutrition_ability',
          question: 'Can the person plan, prepare and consume food and drink?',
          type: 'select',
          required: true,
          options: ['Independently', 'With some support', 'With substantial support', 'Unable without full support'],
        },
        {
          id: 'nutrition_details',
          question: 'Provide details of current situation and support needed',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'personal_care',
      title: 'Maintaining Personal Hygiene',
      order: 4,
      questions: [
        {
          id: 'hygiene_ability',
          question: 'Can the person wash themselves and maintain personal hygiene?',
          type: 'select',
          required: true,
          options: ['Independently', 'With some support', 'With substantial support', 'Unable without full support'],
        },
        {
          id: 'toileting_ability',
          question: 'Can the person manage toilet needs?',
          type: 'select',
          required: true,
          options: ['Independently', 'With some support', 'With substantial support', 'Unable without full support'],
        },
        {
          id: 'personal_care_details',
          question: 'Provide details of current situation and support needed',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'mobility',
      title: 'Managing and Maintaining the Home',
      order: 5,
      questions: [
        {
          id: 'home_maintenance',
          question: 'Can the person maintain a habitable home environment?',
          type: 'select',
          required: true,
          options: ['Independently', 'With some support', 'With substantial support', 'Unable without full support'],
        },
        {
          id: 'mobility_home',
          question: 'Can the person move around the home safely?',
          type: 'select',
          required: true,
          options: ['Independently', 'With some support', 'With substantial support', 'Unable without full support'],
        },
        {
          id: 'mobility_community',
          question: 'Can the person access the community?',
          type: 'select',
          required: true,
          options: ['Independently', 'With some support', 'With substantial support', 'Unable without full support'],
        },
        {
          id: 'mobility_details',
          question: 'Provide details of current situation and support needed',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'eligibility',
      title: 'Eligibility Determination',
      order: 6,
      questions: [
        {
          id: 'eligible_needs',
          question: 'Which needs meet the eligibility criteria?',
          type: 'multiselect',
          required: true,
          options: [
            'Managing and maintaining nutrition',
            'Maintaining personal hygiene',
            'Managing toilet needs',
            'Being appropriately clothed',
            'Being able to make use of the home safely',
            'Maintaining a habitable home environment',
            'Developing and maintaining family relationships',
            'Accessing work, training, education or volunteering',
            'Making use of necessary facilities or services',
            'Engaging in recreation',
          ],
        },
        {
          id: 'significant_impact',
          question: 'Explain how the needs have a significant impact on wellbeing',
          type: 'textarea',
          required: true,
        },
        {
          id: 'eligibility_decision',
          question: 'Eligibility decision',
          type: 'select',
          required: true,
          options: ['Eligible for care and support', 'Not eligible', 'Requires further assessment'],
        },
      ],
    },
    {
      key: 'outcomes',
      title: 'Personal Outcomes',
      order: 7,
      questions: [
        {
          id: 'desired_outcomes',
          question: 'What outcomes does the person want to achieve?',
          type: 'textarea',
          required: true,
        },
        {
          id: 'support_plan',
          question: 'How will these outcomes be met?',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
};

export const MCA_ASSESSMENT: AssessmentTemplate = {
  type: 'mental_capacity',
  name: 'Mental Capacity Assessment',
  description: 'Assessment of mental capacity under the Mental Capacity Act 2005',
  statutoryRequirement: 'Mental Capacity Act 2005',
  sections: [
    {
      key: 'decision_details',
      title: 'Decision Details',
      order: 1,
      questions: [
        {
          id: 'specific_decision',
          question: 'What is the specific decision that needs to be made?',
          type: 'textarea',
          required: true,
          helpText: 'Be specific about the decision, not general capacity',
        },
        {
          id: 'decision_timeframe',
          question: 'When does this decision need to be made?',
          type: 'text',
          required: true,
        },
        {
          id: 'decision_importance',
          question: 'Why is this decision important?',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'presumption_capacity',
      title: 'Presumption of Capacity',
      order: 2,
      questions: [
        {
          id: 'support_provided',
          question: 'What support has been provided to help the person make this decision?',
          type: 'textarea',
          required: true,
          helpText: 'Communication aids, information in accessible format, timing, location, etc.',
        },
        {
          id: 'impairment_disturbance',
          question: 'Is there an impairment or disturbance in the functioning of the mind or brain?',
          type: 'boolean',
          required: true,
        },
        {
          id: 'impairment_details',
          question: 'If yes, provide details of the impairment or disturbance',
          type: 'textarea',
          required: false,
        },
      ],
    },
    {
      key: 'functional_test',
      title: 'Functional Test (Two-Stage Test)',
      order: 3,
      questions: [
        {
          id: 'understand_information',
          question: 'Can the person understand the information relevant to the decision?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Unclear'],
        },
        {
          id: 'understand_evidence',
          question: 'Evidence for understanding assessment',
          type: 'textarea',
          required: true,
        },
        {
          id: 'retain_information',
          question: 'Can the person retain the information long enough to make the decision?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Unclear'],
        },
        {
          id: 'retain_evidence',
          question: 'Evidence for retention assessment',
          type: 'textarea',
          required: true,
        },
        {
          id: 'use_weigh_information',
          question: 'Can the person use or weigh that information as part of the decision-making process?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Unclear'],
        },
        {
          id: 'weigh_evidence',
          question: 'Evidence for use/weigh assessment',
          type: 'textarea',
          required: true,
        },
        {
          id: 'communicate_decision',
          question: 'Can the person communicate their decision?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Unclear'],
        },
        {
          id: 'communicate_evidence',
          question: 'Evidence for communication assessment',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'capacity_conclusion',
      title: 'Capacity Conclusion',
      order: 4,
      questions: [
        {
          id: 'capacity_decision',
          question: 'Does the person have capacity to make this specific decision?',
          type: 'select',
          required: true,
          options: ['Has capacity', 'Lacks capacity', 'Unclear - further assessment needed'],
        },
        {
          id: 'reasoning',
          question: 'Detailed reasoning for this conclusion',
          type: 'textarea',
          required: true,
        },
        {
          id: 'review_date',
          question: 'When should this assessment be reviewed?',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
};

export const CARERS_ASSESSMENT: AssessmentTemplate = {
  type: 'carers',
  name: 'Carers Assessment',
  description: 'Assessment of carers needs under the Care Act 2014',
  statutoryRequirement: 'Care Act 2014, Section 10',
  sections: [
    {
      key: 'carer_details',
      title: 'Carer Information',
      order: 1,
      questions: [
        {
          id: 'carer_relationship',
          question: 'Relationship to the person cared for',
          type: 'text',
          required: true,
        },
        {
          id: 'caring_duration',
          question: 'How long have you been providing care?',
          type: 'text',
          required: true,
        },
        {
          id: 'hours_per_week',
          question: 'Approximately how many hours per week do you provide care?',
          type: 'text',
          required: true,
        },
        {
          id: 'caring_tasks',
          question: 'What caring tasks do you provide?',
          type: 'multiselect',
          required: true,
          options: [
            'Personal care',
            'Medication management',
            'Meal preparation',
            'Shopping',
            'Household tasks',
            'Emotional support',
            'Financial management',
            'Accompanying to appointments',
            'Other',
          ],
        },
      ],
    },
    {
      key: 'carer_wellbeing',
      title: 'Carer Wellbeing',
      order: 2,
      questions: [
        {
          id: 'physical_health',
          question: 'How is caring affecting your physical health?',
          type: 'textarea',
          required: true,
        },
        {
          id: 'mental_health',
          question: 'How is caring affecting your mental health and emotional wellbeing?',
          type: 'textarea',
          required: true,
        },
        {
          id: 'social_life',
          question: 'How is caring affecting your social life and relationships?',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'carer_outcomes',
      title: 'Carer Outcomes',
      order: 3,
      questions: [
        {
          id: 'work_education',
          question: 'Are you able to work, study, or volunteer?',
          type: 'select',
          required: true,
          options: ['Yes, without difficulty', 'With some difficulty', 'No, unable to'],
        },
        {
          id: 'outcomes_desired',
          question: 'What would help you maintain your wellbeing as a carer?',
          type: 'textarea',
          required: true,
        },
        {
          id: 'support_needed',
          question: 'What support do you need?',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
};

export const CHC_ASSESSMENT: AssessmentTemplate = {
  type: 'continuing_healthcare',
  name: 'NHS Continuing Healthcare Assessment',
  description: 'Assessment for NHS Continuing Healthcare eligibility',
  statutoryRequirement: 'National Framework for NHS Continuing Healthcare',
  sections: [
    {
      key: 'care_domains',
      title: 'Care Domains Assessment',
      order: 1,
      questions: [
        {
          id: 'behaviour',
          question: 'Behaviour',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'cognition',
          question: 'Cognition',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'psychological',
          question: 'Psychological and Emotional Needs',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'communication',
          question: 'Communication',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'mobility',
          question: 'Mobility',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'nutrition',
          question: 'Nutrition',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'continence',
          question: 'Continence',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'skin',
          question: 'Skin and Tissue Viability',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'breathing',
          question: 'Breathing',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'symptom_control',
          question: 'Drug Therapies and Symptom Control',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'altered_states',
          question: 'Altered States of Consciousness',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
        {
          id: 'other',
          question: 'Other Significant Care Needs',
          type: 'select',
          required: true,
          options: ['No needs', 'Low', 'Moderate', 'High', 'Severe', 'Priority'],
        },
      ],
    },
    {
      key: 'decision_rationale',
      title: 'Decision Rationale',
      order: 2,
      questions: [
        {
          id: 'primary_health_need',
          question: 'Is there evidence of a primary health need?',
          type: 'boolean',
          required: true,
        },
        {
          id: 'rationale',
          question: 'Provide detailed rationale for CHC eligibility decision',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
};

export const ASSESSMENT_TEMPLATES: Record<string, AssessmentTemplate> = {
  care_act_2014: CARE_ACT_ASSESSMENT,
  mental_capacity: MCA_ASSESSMENT,
  carers: CARERS_ASSESSMENT,
  continuing_healthcare: CHC_ASSESSMENT,
};

export function getAssessmentTemplate(type: string): AssessmentTemplate | undefined {
  return ASSESSMENT_TEMPLATES[type];
}

export function getAllAssessmentTemplates(): AssessmentTemplate[] {
  return Object.values(ASSESSMENT_TEMPLATES);
}
