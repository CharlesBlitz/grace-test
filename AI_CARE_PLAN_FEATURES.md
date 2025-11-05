# AI-Powered Care Plan Assistant

This system leverages OpenAI to support staff in creating comprehensive, evidence-based care plans through voice dictation, intelligent suggestions, and best practice guidance.

## Features Overview

### 1. AI-Generated Care Goals
**Location:** `/organization/care-plans/create` (Step 2)

- Click "Generate with AI" to automatically create care goals based on resident conditions and care level
- AI analyzes resident profile and suggests 3-5 SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goals
- Goals include recommended category, priority level, and descriptions
- Staff can review, edit, or regenerate suggestions before accepting

### 2. AI-Generated Care Tasks
**Location:** `/organization/care-plans/create` (Step 3)

- Click "Generate from Goals" to create daily tasks that support care goals
- AI suggests specific, actionable tasks with frequency, timing, and type
- Tasks are directly linked to the goals they support
- Editable before acceptance

### 3. Voice Dictation with AI Structuring
**Location:** Multiple care plan forms

- Click microphone icon to start voice dictation
- Speak naturally about care plan details
- AI automatically cleans up transcription, removes filler words, and structures content professionally
- Voice notes are converted into well-formatted clinical documentation
- Available for: Care plan descriptions, goal descriptions, task descriptions, assessment notes

### 4. AI Assessment Analysis
**Location:** `/organization/care-plans/assessments`

- After completing an assessment, click "Analyze with AI"
- AI provides:
  - Key findings from assessment data
  - Areas of concern (highlighted in orange)
  - Areas of improvement (highlighted in green)
  - Specific recommendations for care plan adjustments
  - Suggested follow-up assessments or interventions
- Staff can edit recommendations before applying to care plan

### 5. Voice-Enabled AI Assistant
**Location:** Floating button (bottom-right) on care plan pages

- Click the sparkle icon to open AI assistant
- Ask questions about care plan best practices via voice or text
- Get instant, evidence-based guidance on:
  - Best practices for specific conditions (dementia, fall prevention, diabetes, etc.)
  - How to structure care plans
  - Frequency of assessments and reviews
  - Documentation requirements
  - Common challenges and solutions
- Responses are spoken aloud (can be toggled off)
- Full conversation history maintained during session

### 6. AI-Generated Care Plan Descriptions
**Location:** `/organization/care-plans/create` (Step 1)

- Click "Generate with AI" next to description field
- AI creates comprehensive overview of care approach
- Description is appropriate for sharing with families and care team
- Incorporates resident conditions, care level, and key concerns

## How to Use

### Creating a Care Plan with AI Assistance

1. **Start Creating Care Plan**
   - Navigate to Organization > Care Plans
   - Click "Create Custom Plan" or "Use This Template"

2. **Basic Information (Step 1)**
   - Select resident and care level
   - Use voice dictation or click "Generate with AI" for care plan description
   - AI will create a comprehensive, compassionate overview

3. **Generate Goals (Step 2)**
   - Click "Generate with AI" button
   - Review the suggested goals
   - Edit any details directly in the suggestion card
   - Click "Accept" to add to care plan, or "Regenerate" for different suggestions
   - Click "Discard" if not needed
   - Add more goals manually or generate additional AI suggestions

4. **Generate Tasks (Step 3)**
   - With goals defined, click "Generate from Goals"
   - AI creates specific daily tasks supporting the goals
   - Review, edit, regenerate, or accept suggestions
   - Tasks include timing, frequency, and type

5. **Review and Submit (Step 4)**
   - Review complete care plan
   - All AI-suggested content has been reviewed and accepted by staff
   - Submit care plan

### Conducting Assessments with AI Analysis

1. **Complete Assessment**
   - Navigate to assessment page
   - Fill out all assessment questions
   - Add clinical notes

2. **Get AI Analysis**
   - Click "Analyze with AI" button
   - Wait for AI to process assessment data (typically 3-5 seconds)
   - Review key findings, concerns, and improvements

3. **Apply Recommendations**
   - Edit AI-generated recommendations as needed
   - Click "Apply to Care Plan" to add recommendations
   - Click "Regenerate" if you want different analysis
   - Click "Discard" if not needed

### Using the AI Assistant

1. **Open Assistant**
   - Click sparkle icon in bottom-right corner
   - Assistant opens as floating chat window

2. **Ask Questions**
   - Type or click microphone to speak your question
   - Examples:
     - "What are best practices for dementia care plans?"
     - "How often should care plans be reviewed?"
     - "What should I include in a fall prevention care plan?"

3. **Get Spoken Responses**
   - AI provides detailed, evidence-based guidance
   - Response is automatically spoken (toggle speaker icon to disable)
   - Click suggested questions for quick access to common topics

## Staff Control & Oversight

### Review Before Acceptance
- All AI suggestions must be explicitly accepted by staff
- Nothing is automatically added to care plans
- Staff can edit any AI-generated content before accepting

### Regeneration
- Don't like a suggestion? Click "Regenerate" for a different version
- AI will provide alternative suggestions with different approaches
- Unlimited regenerations available

### Rejection
- Click "Discard" to reject any suggestion
- Rejected suggestions are logged for quality improvement
- No penalty for rejecting suggestions

### Manual Override
- Staff can always add goals, tasks, or notes manually
- AI assistance is completely optional
- "Add Manually" buttons available on all forms

## Database & Analytics

### Tracking AI Usage
The system tracks:
- Which suggestions were accepted vs. rejected
- How often suggestions were regenerated
- Average time saved per care plan
- Most commonly asked questions
- Token usage and costs

### Data Privacy
- All AI suggestions are stored in your Supabase database
- Suggestions are organization-scoped (only your staff can see them)
- Voice transcripts can be automatically deleted after processing
- Full audit trail of AI-assisted care plans

## Best Practices

1. **Always Review AI Content**
   - AI is a tool to assist, not replace clinical judgment
   - Verify all suggestions match resident's actual needs
   - Edit to reflect your organization's specific protocols

2. **Use Voice Dictation for Efficiency**
   - Faster than typing for longer notes
   - Reduces documentation burden
   - AI cleanup ensures professional formatting

3. **Leverage AI Assistant for Learning**
   - Great for training new staff
   - Quick access to best practices
   - Evidence-based guidance on demand

4. **Regenerate When Needed**
   - If first suggestion isn't quite right, regenerate
   - AI learns from context and provides alternatives
   - No limit on regenerations

5. **Combine AI and Manual Input**
   - Use AI for initial drafts
   - Add facility-specific details manually
   - Edit AI suggestions to match your voice

## Configuration

### OpenAI API Key
Set in `.env` file:
```
OPENAI_API_KEY=your_key_here
```

### Custom Prompts
Organizations can customize AI prompts in the database:
- Navigate to Organization Settings (future feature)
- Edit prompt templates to match your organization's style
- Set specific guidelines AI should follow

## Technical Details

### AI Model
- Uses OpenAI GPT-4o-mini for fast, cost-effective responses
- Optimized prompts for senior care context
- Token usage optimized to minimize costs

### Response Times
- Goal generation: 3-5 seconds
- Task generation: 2-3 seconds
- Assessment analysis: 4-6 seconds
- Voice structuring: 2-3 seconds
- Best practice queries: 3-4 seconds

### Costs (Approximate)
- Goal generation: ~$0.01 per request
- Task generation: ~$0.005 per request
- Assessment analysis: ~$0.015 per request
- Voice structuring: ~$0.005 per request
- Best practice query: ~$0.01 per request

## Support

For issues or questions about AI features:
1. Check the AI Assistant for guidance
2. Review this documentation
3. Contact your system administrator

## Future Enhancements

Planned features:
- Learning from organization's historical care plans
- Custom AI training on facility-specific protocols
- Automated care plan updates based on assessment trends
- Integration with medication management
- Multi-language support
- Voice commands for entire workflow
