# Care Plan Management System for Organizations

## Overview

The Care Plan Management System is a comprehensive solution for care organizations to create, manage, and track structured care plans for their residents. This system integrates with Grace Companion's voice-first approach, enabling staff to use voice commands and residents to interact naturally with their care plans through conversations with Grace.

## Database Setup

### Required Migrations

Two migrations must be applied in order:

1. **Organization Management** (`20251102160000_add_organization_management.sql`)
   - Creates core organization infrastructure
   - Establishes staff roles and permissions
   - Sets up resident management tables
   - Includes basic care_plans and assessments tables

2. **Care Plan System** (`20251102170000_add_care_plan_system.sql`)
   - Replaces basic care_plans with comprehensive system
   - Adds care plan templates library
   - Creates goals, tasks, and completions tracking
   - Implements assessment scheduling and history
   - Adds staff assignments and audit trail

### Applying Migrations

Due to file size limitations with MCP tools, migrations should be applied manually:

```bash
# Connect to your Supabase database and run:
psql [YOUR_DATABASE_URL] < supabase/migrations/20251102160000_add_organization_management.sql
psql [YOUR_DATABASE_URL] < supabase/migrations/20251102170000_add_care_plan_system.sql
```

Or use the Supabase dashboard SQL editor to paste and execute each migration.

## System Architecture

### Core Tables

1. **care_plan_templates** - Pre-defined templates for common conditions
2. **care_plans** - Individual resident care plans
3. **care_plan_goals** - Measurable objectives within plans
4. **care_plan_tasks** - Daily tasks linked to goals
5. **care_plan_task_completions** - Completion records
6. **care_plan_assessments** - Periodic evaluations
7. **care_plan_staff_assignments** - Staff responsibility assignments
8. **care_plan_history** - Full audit trail

### Built-in Templates

The system includes 6 pre-configured templates:

**Condition-Based:**
- Dementia Care - Early Stage
- Fall Prevention Program
- Diabetes Management
- Post-Surgery Recovery

**Care Level-Based:**
- Assisted Living - Standard Care
- Memory Care - Advanced Support

Organizations can also create custom templates.

## Features

### For Organizations

**Template Library**
- Browse system and custom templates
- Create organization-specific templates
- Define default goals and tasks
- Set assessment schedules

**Care Plan Creation**
- Wizard-based creation process
- Template selection or custom creation
- Assign staff coordinators
- Set review schedules

**Progress Tracking**
- Real-time completion rates
- Goal achievement analytics
- Assessment history timeline
- Staff performance metrics

**Reporting & Compliance**
- Exportable care plan documents
- Regulatory compliance reports
- Audit trails for all changes
- Family-friendly progress summaries

### For Staff

**Daily Task Management**
- View assigned care plan tasks
- Complete tasks via app or voice
- Add notes and photos
- Hand-off summaries between shifts

**Assessment Tools**
- Standardized assessment forms
- Scheduled assessment reminders
- Score tracking over time
- Recommendation workflow

**Care Coordination**
- View all residents' care plans
- Assign tasks to team members
- Update goals and progress
- Communicate with families

### For Residents & Families

**Simplified View**
- Current goals in plain language
- Progress indicators
- Upcoming activities
- Assessment results

**Voice Integration**
- Ask Grace about care plan ("What's on my schedule today?")
- Complete tasks by voice ("I took my medication")
- Receive personalized reminders based on care plan
- Natural conversation updates ("How am I doing with my walking goal?")

### Voice Integration

The care plan system enhances Grace's intelligence:

**For Residents:**
```
Grace: "Good morning Margaret! It's time for your morning walk. Remember,
we're working on increasing your mobility this month."

Resident: "I finished my walk"

Grace: "Wonderful! I've logged that. You're doing great - that's 5 walks
this week towards your goal."
```

**For Staff:**
```
Staff: "Grace, show me today's care plans for room 204"

Grace: "Mrs. Johnson has 6 tasks today. 4 are completed. The medication
reminder at 2 PM and evening mobility exercise are still pending."
```

**Voice Commands:**
- "Mark [task] complete for [resident]"
- "What assessments are due today?"
- "Show me [resident's] care plan progress"
- "Add a note to [resident's] care plan"

## Implementation Status

### Completed

- Database schema design
- Migration files created
- System templates defined
- RLS policies configured
- Voice integration design

### Pending

- Apply database migrations
- Build care plan template library UI
- Create care plan wizard
- Add care plan view to resident detail pages
- Build staff dashboard for care plans
- Implement assessment forms
- Create progress analytics
- Build reporting system
- Integrate voice commands

## User Flows

### Creating a Care Plan

1. Staff navigates to resident profile
2. Clicks "Create Care Plan"
3. Selects template or starts from scratch
4. Reviews and customizes goals
5. Assigns tasks to schedule
6. Sets review date
7. Assigns care coordinators
8. Saves and activates plan

### Daily Care Delivery

1. Staff logs in and views their dashboard
2. Sees list of care plan tasks for the day
3. Provides care and marks tasks complete
4. Adds notes or photos as needed
5. Grace proactively reminds residents of tasks
6. Residents can confirm completion by voice
7. Progress automatically updates

### Periodic Assessment

1. System alerts staff when assessment is due
2. Staff opens assessment form
3. Completes standardized questions
4. Records findings and recommendations
5. System compares to previous assessments
6. Updates care plan goals if needed
7. Family receives summary notification

## Integration Points

### Existing Features

- **Medication Reminders**: Link to medication goals in care plans
- **Activity Timeline**: Care plan completions appear in activity feed
- **Family Portal**: Families see care plan progress
- **Emergency Help**: Care plans inform emergency protocols
- **Staff Coordination**: Care plans drive task assignments

### Voice System

- Care plans provide context for Grace's conversations
- Tasks trigger voice reminders at scheduled times
- Completions can be recorded via voice
- Assessments can be voice-assisted
- Progress reports available by voice

## Next Steps

1. **Apply Migrations**
   - Run organization management migration
   - Run care plan system migration
   - Verify all tables and policies created

2. **Build Core UI**
   - Template library page (`/organization/care-plans/templates`)
   - Care plan wizard (`/organization/care-plans/create`)
   - Resident care plan view (add to `/organization/residents/[id]`)
   - Staff dashboard updates

3. **Implement Assessment Forms**
   - Cognitive assessment
   - Mobility assessment
   - Nutrition assessment
   - Comprehensive review

4. **Add Voice Integration**
   - Update voice-conversation function
   - Add care plan context to Grace
   - Implement voice task completion
   - Add voice-based progress queries

5. **Build Analytics**
   - Goal achievement dashboard
   - Staff performance metrics
   - Resident progress trends
   - Compliance reports

## Technical Notes

- All care plan operations log to `care_plan_history` for compliance
- RLS policies ensure staff only access their organization's data
- Templates marked `is_system_template=true` are available to all orgs
- Task completions support `completion_method` of 'manual', 'voice', or 'auto'
- Assessment data stored as JSONB for flexibility
- Care plans link to `organization_residents`, not direct to `users`

## Benefits

**For Organizations:**
- Standardized care delivery
- Regulatory compliance
- Staff efficiency
- Family satisfaction
- Quality improvement data

**For Staff:**
- Clear daily priorities
- Reduced paperwork
- Better coordination
- Voice-assisted workflows
- Performance visibility

**For Residents:**
- Personalized care
- Goal-oriented approach
- Natural voice interactions
- Family involvement
- Progress celebration

**For Families:**
- Transparency into care
- Regular progress updates
- Easy communication
- Peace of mind
- Involvement in care decisions

---

*This system positions Grace Companion as a complete care coordination platform, differentiating it from simple reminder apps and demonstrating enterprise value to care facilities.*
