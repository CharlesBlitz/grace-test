import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Home, Building2, Sparkles, BookOpen, Code } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-5xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <HelpCircle className="w-12 h-12 text-coral-red" strokeWidth={1.5} />
            <h1 className="text-4xl md:text-5xl font-bold text-deep-navy">
              Frequently Asked Questions
            </h1>
          </div>
          <p className="text-lg text-deep-navy/70">
            Find answers to common questions about Grace Companion
          </p>
        </div>

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="organizations" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Care Organisations
              </TabsTrigger>
              <TabsTrigger value="professionals" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Care Professionals
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Technical & AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="what-is" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What is the Grace suite?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace is a comprehensive care technology suite with three products: Grace Companion provides AI-powered support, friendly conversation, and gentle reminders for elders and individuals with cognitive impairments, helping keep families connected. Grace Facility offers complete care management for residential care homes and nursing facilities, including care planning, staff coordination, and family portals. Grace Notes is a practice management platform for independent care professionals, providing mobile field documentation, AI-powered note generation, and CQC compliance tools. Together, they support the entire care ecosystem.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="who-for" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Who is this service for?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                The Grace suite serves four groups: (1) Elders living independently who need reminders and companionship, (2) Family members who want to stay connected and monitor their loved ones' wellbeing, (3) Care facilities including nursing homes, residential care homes, and assisted living facilities that want to provide better resident care and family communication, and (4) Independent care professionals such as social workers, community nurses, and care coordinators who need efficient practice management and field documentation. Whether you're an individual user, care organisation, or independent professional, Grace is designed to support excellence in care.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="how-use" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Do I need to be good with technology?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Not at all! Grace Companion is designed to be voice-first, which means you can interact entirely by speaking. No typing, no complex menus, and no confusing settings. If you can have a conversation, you can use Grace. Family members can also help with initial setup if needed.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="voice-clone" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What is voice cloning and is it safe?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Voice cloning allows reminders to be delivered in a loved one's voice, which can be comforting and more effective for individuals with dementia. It's completely optional. We use ElevenLabs technology to create a synthetic voice from brief voice samples recorded during registration. You record three short phrases, and the system creates a voice profile that sounds like you. The voice data is encrypted, stored securely in UK-based servers, and used only for your reminders. It's never shared or used for any other purpose. You can delete your voice profile at any time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cost" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How much does it cost?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                We offer a free tier with basic features and paid plans with additional capabilities like voice cloning, unlimited conversations, and advanced family monitoring. Pricing is transparent and clearly displayed during registration. There are no hidden fees, and you can cancel anytime.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="devices" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What devices can I use?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Companion works on smartphones, tablets, and computers. It's a Progressive Web App (PWA), which means you can install it like a native app on your device by clicking "Add to Home Screen" in your browser. Once installed, it works offline for viewing scheduled reminders and provides push notifications. Reminders can also be delivered via SMS text messages and phone calls to any mobile or landline, so you don't even need a smartphone. It works on iOS, Android, Windows, and Mac.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="internet" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Do I need internet access?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes, Grace Companion requires an internet connection to function. This can be Wi-Fi or mobile data. Most reminders will still appear even if you temporarily lose connection, but conversations with the AI require an active internet connection.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="medical" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Is this a medical device? Can I rely on it for health decisions?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                <strong className="text-coral-red">No.</strong> Grace Companion is NOT a medical device and should never be used for medical decisions or emergencies. It's a support tool for reminders and companionship only. Always consult healthcare professionals for medical advice. In an emergency, call 999 immediately. Grace cannot detect medical emergencies or provide medical guidance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Is my information private and secure?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Absolutely. We take privacy very seriously. All your conversations and data are encrypted and stored securely in UK-based servers. We comply with UK GDPR regulations. We never sell your data to third parties. You control who in your family can access your information, and you can delete your account and all data at any time. Read our <Link href="/privacy" className="text-sky-blue hover:underline">Privacy Policy</Link> for full details.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="family-access" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Can my family see my conversations?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Family members can see reminder history and receive notifications when you request help, but full conversation details are private by default. You or your legal guardian control exactly what family members can access. This balance ensures your privacy whilst giving families the information they need to support you effectively.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="help-request" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How do I get help if I need it?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Simply tell Grace you need help. You can say things like "I need help," "Call my family," or "I don't feel well." Grace will immediately notify your designated family members or emergency contacts. This is not a substitute for 999 in emergencies, but it's a quick way to reach your support network.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reminders" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How do reminders work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Reminders can be delivered four ways: (1) App notifications if you have the app installed, (2) SMS text messages to your phone, (3) Automated phone calls with voice messages, and (4) Email. Family members can set up reminders through their dashboard, choosing which delivery methods to use. You can even have reminders delivered in a family member's cloned voice for familiarity. If you miss several reminders, the system automatically alerts your emergency contacts to check on you. This escalation feature ensures someone knows if you're having difficulties.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reminder-setup" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How do I set up reminders?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Setting up reminders is easy. Just tell Grace what you need to remember and when. For example, "Remind me to take my blood pressure medication at 9am every day" or "Remind me about my doctor's appointment on Friday at 2pm." Grace understands natural language, so you don't need to use specific commands. Family members can also create and manage reminders through the family dashboard, setting up recurring schedules for medications, hydration, exercise, and more.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="languages" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What languages are supported?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Companion supports multilingual voice interactions in 14 languages: English (UK & US), Spanish, French, German, Italian, Portuguese, Polish, Hindi, Urdu, Bengali, Punjabi, Arabic, and Mandarin Chinese. The system automatically detects when you switch languages during conversations and continues seamlessly in your preferred language. This is especially valuable for elderly immigrants who may revert to their native language during stress, emotional moments, or cognitive changes. Family members can view language insights showing when and why language switching occurs, helping monitor cognitive health and cultural comfort.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="multilingual" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does multilingual support work for elderly immigrants?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Companion is the first eldercare platform that truly serves immigrant communities by automatically detecting and adapting to language changes. When an elderly person reverts to their native language during stress, confusion, or emotional moments, Grace seamlessly continues the conversation without asking them to switch back. This is completely natural and respects their linguistic heritage. The system monitors language patterns and can alert family members if frequent switching or permanent reversion to native language might indicate cognitive changes or emotional distress. This feature provides both cultural dignity and health monitoring for diverse elderly populations.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="language-monitoring" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Why is language monitoring important for cognitive health?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                For bilingual or multilingual elderly individuals, sudden changes in language usage patterns can indicate cognitive or emotional changes. While it's completely normal to switch languages during emotional moments or when discussing memories, frequent involuntary switching or sudden inability to speak their usual language may require attention. Grace tracks these patterns and provides insights to family members through the Family Language Insights dashboard. This helps families understand when language switching is normal cultural expression versus when it might indicate stress, confusion, or cognitive changes requiring professional assessment.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="accuracy" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What if Grace makes a mistake or doesn't understand me?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace uses advanced AI but isn't perfect. If she misunderstands, simply rephrase or repeat. Grace is designed to be patient and will ask clarifying questions when unsure. She learns from interactions and improves over time. If Grace consistently misunderstands something specific, family members can help adjust settings or contact our support team.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cancel" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Can I cancel anytime?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes, absolutely. There are no long-term contracts. You can cancel your subscription at any time through settings. If you cancel, you'll retain access until the end of your current billing period. You can also delete your account and all associated data permanently at any time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="support" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What if I need technical support?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Our support team is here to help! Contact us at <a href="mailto:support@gracecompanion.co.uk" className="text-sky-blue hover:underline">support@gracecompanion.co.uk</a> or call 0800 XXX XXXX (Monday-Friday, 9am-5pm GMT). We're committed to making Grace Companion work for you and will patiently guide you through any issues.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dementia" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Is this suitable for someone with dementia?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Companion is designed with dementia in mind. The voice-first interface, familiar voice reminders, patient AI responses, and simple single-screen design all cater to cognitive challenges. Our multilingual support is particularly valuable for individuals with dementia, as they often revert to their native language as the condition progresses. Grace automatically detects language switching and continues conversations without disruption, maintaining dignity and comfort. However, suitability depends on the individual and stage of dementia. We recommend family involvement in setup and monitoring. Grace is a support tool, not a replacement for professional dementia care.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="multiple-accounts" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Can I use the same email address for multiple Grace products?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                No, you cannot use the same email address to create accounts for Grace Companion, Grace Facility (organisation portal), Grace Notes, and the Admin Portal. Each product requires a unique email address because they all share the same authentication system. This is a technical limitation of the underlying authentication platform. If you need accounts for multiple products, you'll need to use different email addresses for each. <strong>Gmail Tip:</strong> If you use Gmail, you can use the plus (+) trick to create multiple addresses that all deliver to your inbox. For example, <code>youremail+personal@gmail.com</code>, <code>youremail+organisation@gmail.com</code>, and <code>youremail+professional@gmail.com</code> are all treated as different email addresses by our system but deliver to <code>youremail@gmail.com</code>. This is particularly useful for testing or if you need access to multiple products.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="organizations">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="org-what" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does Grace Companion work for care facilities?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Companion provides a complete care co-ordination platform for residential care homes, nursing homes, and assisted living facilities. It includes resident management, staff task assignments, comprehensive care planning, family communication portals, medication tracking, and regulatory compliance tools. Staff can use voice commands for quick updates, and families receive regular updates about their loved ones' wellbeing.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="org-register" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How do we register our care organisation?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Start by visiting the organisation registration page and providing your facility details, CQC registration number, and care type. You'll set up your first administrator account who can then add staff members and residents. The registration process includes verification to ensure compliance with UK care regulations. Once approved, you'll have access to the full organisational dashboard.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="care-plans" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What are care plans and how do they work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Care plans are structured documents that outline individualized care for each resident. Grace includes a comprehensive care plan system with pre-built templates for common conditions like dementia, fall prevention, and diabetes management. Staff can create custom care plans with specific goals, daily tasks, and assessment schedules. The system tracks completion rates, generates progress reports, and ensures regulatory compliance. Care plans integrate with Grace's voice assistant, so residents receive personalized reminders based on their individual care needs.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai-care-plans" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does AI help with care planning?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace uses AI to assist staff in creating comprehensive, evidence-based care plans. The AI can automatically generate care goals based on resident conditions, suggest daily tasks that support those goals, analyze assessment results to identify concerns and improvements, and provide best practice guidance. All AI suggestions are reviewed and approved by staff before being added to care plans. This reduces administrative burden while ensuring high-quality, personalized care planning.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="staff-management" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How do we manage staff roles and permissions?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                The system supports multiple staff roles including administrators, care managers, care workers, nurses, and healthcare assistants. Each role has appropriate permissions for viewing resident information, creating care plans, completing tasks, and accessing reports. Administrators can assign staff to specific residents, manage shift schedules, and track task completion. All staff actions are logged for audit and compliance purposes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="family-portal" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Can families access information about their loved ones?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes. Families receive secure access to a dedicated portal where they can view their loved one's care plan progress, read daily care notes, see medication administration records, view photos and updates, and message the care team. Facilities control exactly what information is shared with families. Families also receive notifications for important events, assessment results, and when their loved one requests help. For multilingual residents, families can access Language Insights showing when their loved one switches languages, emotional states during different language use, and concerning patterns that may indicate cognitive or emotional changes. This transparency builds trust and keeps families connected.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mca-dols" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Does the system support MCA and DoLS compliance?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes. Grace includes dedicated modules for Mental Capacity Act assessments and Deprivation of Liberty Safeguards management. Staff can complete capacity assessments, record best interest decisions, track DoLS applications and renewals, and generate required documentation for local authorities. The system provides automatic reminders for review dates and expiring authorizations, ensuring your facility stays compliant with legal requirements.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="assessments" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How do resident assessments work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                The system includes standardized assessment templates for cognitive function, mobility, nutrition, and overall wellbeing. Assessments can be scheduled to occur automatically at required intervals. After completing an assessment, staff can use AI analysis to identify key findings, areas of concern, and recommendations for care plan adjustments. Assessment history is tracked over time, allowing you to see trends and demonstrate improvement or identify deterioration early.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reporting" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What reports and analytics are available?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace provides comprehensive analytics including care plan completion rates, staff performance metrics, resident progress trends, medication administration compliance, incident tracking, and regulatory compliance reports. All reports can be filtered by date range, resident, or staff member. The system maintains a complete audit trail of all care activities, which is essential for CQC inspections and quality improvement initiatives.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="org-pricing" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How much does it cost for care organisations?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Pricing for care organisations is based on the number of residents and required features. We offer flexible plans that scale with your facility size. Contact our sales team at <a href="mailto:sales@gracecompanion.co.uk" className="text-sky-blue hover:underline">sales@gracecompanion.co.uk</a> for a customised quote. We offer free demonstrations and trial periods so you can see how Grace works in your facility before committing. Volume discounts are available for organisations with multiple facilities.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="org-personal-account" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Can I have both a personal Grace Companion account and an organisation administrator account?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes, but you'll need to use different email addresses for each account. Grace Companion (for personal/family use), Grace Facility (organisation portal), and Grace Notes (professional practitioners) all share the same authentication system, so each account requires a unique email address. If you want both a personal account and an organisation administrator account, simply register each with a different email. For example, you might use <code>yourname@personalmail.com</code> for your personal Grace Companion account and <code>yourname@yourfacility.co.uk</code> for your organisation administrator account. Staff members at your facility and residents can still be connected and managed independently across the systems. This separation actually helps maintain clear boundaries between personal and professional use.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="professionals">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="prof-multilingual" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Does Grace Notes support multilingual clients?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes. Grace Notes includes comprehensive multilingual support for practitioners working with diverse communities. During field visits, the system automatically detects when clients speak in their native language and continues documentation seamlessly. Voice dictation works across 14 languages including English, Spanish, French, German, Italian, Portuguese, Polish, Hindi, Urdu, Bengali, Punjabi, Arabic, and Mandarin Chinese. The Language Insights dashboard shows language usage patterns across your caseload, helping you identify clients who may need culturally appropriate assessment approaches or interpreters. This makes Grace Notes ideal for practitioners serving immigrant and diverse elderly populations.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-what" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What is Grace Notes?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Notes is a complete practice management platform designed specifically for independent care professionals including social workers, community nurses, occupational therapists, and care coordinators. It combines mobile field documentation with GPS verification, AI-powered note generation, UK statutory assessment templates, client management, and CQC compliance tools all in one system. Unlike transcription-only tools, Grace Notes is a complete practice solution.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-who" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Who is Grace Notes for?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Notes is designed for independent care professionals who conduct home visits and need efficient documentation. This includes independent social workers, community nurses, domiciliary care managers, occupational therapists, care coordinators, and small care agencies. If you're conducting assessments, creating care plans, and documenting home visits whilst managing your own caseload, Grace Notes is built for you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-pricing" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How much does Grace Notes cost?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Notes offers transparent pricing starting at £29/month for solo practitioners managing up to 20 clients. Our Small Team plan is £79/month for up to 100 clients and includes all UK statutory templates and AI features. The Practice plan at £199/month offers unlimited clients, custom templates, API access, and dedicated support. All plans include a 14-day free trial with no credit card required. Visit our <Link href="/pricing" className="text-sky-blue hover:underline">pricing page</Link> for complete details.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-templates" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What statutory templates are included?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Notes includes comprehensive UK statutory assessment templates for Care Act 2014 assessments, Mental Capacity Act assessments, Carers' Assessments, Continuing Healthcare (CHC) Checklists and Decision Support Tools, DoLS applications, safeguarding reports, and care and support planning. All templates are pre-built, regularly updated to reflect current legislation, and can be completed using voice dictation in the field.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-mobile" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does mobile field documentation work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Notes is designed to work on your mobile device during home visits. When you arrive at a client's location, the app uses GPS to verify your check-in. You can then use voice dictation to record observations whilst remaining present with the client. Take photos of mobility aids, living conditions, or relevant documentation. The app works offline, so you can document in areas with poor signal, and everything syncs automatically when you're back online. This mobile-first approach saves hours compared to traditional paper notes that need transcribing later.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-ai" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does AI-powered note generation work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                After a home visit, you speak your observations using voice dictation. Grace Notes' AI then transforms your voice notes into professionally structured documentation, automatically removing filler words, correcting grammar, and formatting according to best practice standards. The AI has contextual awareness of your client's care plan and history, so it can suggest relevant observations or highlight concerns. You always review and approve the generated notes before they're finalised, maintaining full professional control whilst saving significant time on documentation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-vs-magic" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How is Grace Notes different from Magic Notes?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Magic Notes is a transcription tool funded by councils for their employees, with enterprise pricing and no public pricing transparency. It only transcribes audio and requires you to copy and paste into your existing case management system. Grace Notes is a complete practice management platform available to independent professionals at transparent prices from £29/month. It includes built-in client management, UK statutory templates, GPS field verification, photo documentation, care planning, and CQC compliance dashboards. You're not just transcribing, you're managing your entire practice in one system designed specifically for independent UK care professionals.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-offline" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Does it work offline?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes. Grace Notes is a Progressive Web App that works offline once installed on your device. You can access client records, complete assessments, take photos, and record voice notes without an internet connection. All your work is saved locally and automatically syncs to the cloud when you're back online. This is essential for home visits in rural areas or buildings with poor mobile signal. You never lose your work.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-compliance" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Is Grace Notes CQC compliant?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes. Grace Notes is designed with CQC compliance built-in. It maintains complete audit trails of all care activities, tracks consent and capacity assessments, monitors safeguarding concerns with automatic alerts, generates regulatory reports ready for inspections, and stores all documentation with timestamps and electronic signatures. The system meets Care Quality Commission requirements for record-keeping, data protection, and evidence of person-centred care. Many independent practitioners use Grace Notes specifically to demonstrate compliance during CQC registration and inspections.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-data" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Where is client data stored?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                All client data is stored in UK-based secure servers with full encryption at rest and in transit. We comply with UK GDPR, Data Protection Act 2018, and NHS Data Security and Protection Toolkit standards. Your practice data is completely isolated from other users. You remain the data controller, and we're the data processor. You can export all your data at any time, and we provide clear data processing agreements for your records. Client consent is tracked and documented within the system.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-integration" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Can I integrate with my existing systems?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Notes is designed to be your complete practice management system, so you may not need other tools. However, we understand some professionals work with commissioners or organisations that require specific systems. Our Practice plan includes API access for custom integrations. We can export data in standard formats (CSV, PDF) for sharing with commissioners or other professionals. If you have specific integration requirements, contact our team at <a href="mailto:integrations@gracecompanion.co.uk" className="text-sky-blue hover:underline">integrations@gracecompanion.co.uk</a>.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-trial" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does the free trial work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                All Grace Notes plans include a 14-day free trial with full access to all features, no credit card required upfront. You can add clients, complete assessments, try the mobile app, and generate AI-powered notes to see if Grace Notes fits your workflow. We provide onboarding support during your trial to help you get the most from the platform. If you decide it's not right for you, simply don't subscribe, no questions asked. Most professionals know within a week whether Grace Notes will transform their practice.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prof-multiple-roles" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Can I have accounts for both Grace Notes and other Grace products?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Yes, but you'll need separate email addresses for each product. Grace Notes (for independent practitioners), Grace Facility (organisation portal), and Grace Companion (personal/family use) all use the same authentication system, meaning each requires a unique email address. Many professionals have multiple roles: you might be an independent practitioner using Grace Notes for your private clients, work part-time for a care facility using Grace Facility, and also use Grace Companion personally for an elderly relative. Simply register each product with a different email address. For example: <code>professional@yourpractice.co.uk</code> for Grace Notes, <code>yourname@carefacility.co.uk</code> for organisation work, and <code>personal@gmail.com</code> for family use. This separation helps maintain professional boundaries and data protection compliance across your different roles.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="technical">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="tech-pwa" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What is a Progressive Web App?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                A Progressive Web App (PWA) is a website that can be installed on your device and works like a native app. Grace Companion is a PWA, which means you don't need to download it from an app store. Simply visit our website, and your browser will offer to "Add to Home Screen" or "Install." Once installed, Grace appears as an icon on your home screen, works offline for basic functions, and can send push notifications just like apps from the app store.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-install" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How do I install Grace as an app?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                <strong>On iPhone/iPad:</strong> Open Safari, visit Grace Companion, tap the Share button, and select "Add to Home Screen."<br/><br/>
                <strong>On Android:</strong> Open Chrome, visit Grace Companion, and tap the popup that says "Add Grace to Home screen" or tap the menu and select "Install app."<br/><br/>
                <strong>On Desktop:</strong> Open Chrome or Edge, visit Grace Companion, and click the install icon in the address bar or look for "Install Grace Companion" in the browser menu.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-offline" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Does it work offline?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Partially. Once installed, you can view your scheduled reminders and previously loaded information without internet. However, conversations with Grace, receiving new reminders, and syncing with family members require an internet connection. If you lose connection temporarily, the app will sync automatically when connection is restored. This is especially useful in areas with spotty coverage.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-ai" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                What AI technology powers Grace?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace uses OpenAI's GPT-4 for natural language understanding and conversation. Voice cloning is powered by ElevenLabs, which creates realistic synthetic voices. Text-to-speech uses industry-leading AI voices for clear, natural-sounding reminders. For care organizations, we use AI to assist with care planning, assessment analysis, and clinical documentation. All AI features are designed to augment human care, not replace it. Staff always review and approve AI suggestions.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-voice-dictation" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does voice dictation work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Voice dictation allows you to speak naturally instead of typing. Click the microphone icon on any text field, speak your message, and Grace automatically converts your speech to text. The AI cleans up filler words, corrects grammar, and formats the text professionally. This is especially useful for care staff who need to document quickly while providing hands-on care. Voice dictation works in care notes, care plan descriptions, assessment notes, and messages.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-sms-calls" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How are SMS and phone call reminders delivered?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                We use Twilio, a secure telecommunications platform, to deliver SMS and phone call reminders. When a reminder is due, the system automatically sends a text message or places a phone call to the designated number. Phone calls include a voice message reading the reminder text, optionally using a family member's cloned voice. This works on any mobile or landline phone, so even elders without smartphones can receive reminders. All communications are logged for reference and compliance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-escalation" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                How does reminder escalation work?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                When setting up reminders, family members can set an escalation threshold (typically 3 missed attempts). If a reminder is not acknowledged after reaching this threshold, the system automatically alerts designated emergency contacts in priority order. Alerts are sent via SMS and phone calls explaining which reminder was missed and asking them to check on their loved one. This provides an important safety net if someone is unable to respond to reminders due to illness or emergency.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-browsers" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Which browsers are supported?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Grace Companion works best on modern browsers: Chrome, Edge, Safari, and Firefox. For the best experience and full PWA features, we recommend Chrome on Android and Safari on iOS. Internet Explorer is not supported. Voice features require microphone permissions, which you'll be prompted to grant when first using voice commands or conversation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-data-storage" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Where is my data stored?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                All data is stored in UK-based secure servers using Supabase, a PostgreSQL database platform. Data is encrypted both in transit (HTTPS) and at rest. We comply with UK GDPR requirements and healthcare data protection standards. Voice recordings used for cloning are stored securely and can be deleted at any time. Conversation histories are retained according to your preferences and regulatory requirements, with automatic deletion options available. We never sell or share your data with third parties.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-api" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Does Grace integrate with other systems?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                Currently, Grace is a standalone system. However, we're developing API integrations with common care management software, electronic health records, and medication management systems. If you're a care organisation interested in integration with your existing systems, please contact <a href="mailto:integrations@gracecompanion.co.uk" className="text-sky-blue hover:underline">integrations@gracecompanion.co.uk</a> to discuss your requirements.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech-authentication" className="border-b border-deep-navy/10 pb-4">
              <AccordionTrigger className="text-left text-lg font-semibold text-deep-navy hover:text-sky-blue">
                Why can't I use the same email for multiple Grace products?
              </AccordionTrigger>
              <AccordionContent className="text-deep-navy/80 leading-relaxed pt-4">
                All Grace products (Grace Companion, Grace Facility, Grace Notes, and Admin Portal) share the same authentication system built on Supabase. This authentication system enforces a unique email constraint, meaning one email address can only be registered once across the entire platform. This is a technical limitation of the underlying infrastructure, not a business restriction. The three products serve different purposes and user types: Grace Companion is for individuals and families, Grace Facility is for care organisations and their staff, and Grace Notes is for independent care professionals. While they share authentication, each maintains separate data and features appropriate to its purpose. If you need access to multiple products, simply use different email addresses for each registration. The Gmail plus (+) trick is useful here: <code>yourname+personal@gmail.com</code>, <code>yourname+organisation@gmail.com</code>, and <code>yourname+professional@gmail.com</code> all deliver to the same inbox but are treated as unique addresses.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

          <div className="mt-12 pt-8 border-t border-deep-navy/10">
            <h3 className="text-xl font-bold text-deep-navy mb-4">More Information</h3>
            <p className="text-deep-navy/80 leading-relaxed mb-6">
              Explore our comprehensive documentation to learn more about Grace Companion's features and technical capabilities.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Link href="/features" className="block">
                <Card className="p-6 border-2 border-sky-blue/30 hover:border-sky-blue transition-all hover:shadow-md">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-sky-blue/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                    </div>
                    <h4 className="text-lg font-bold text-deep-navy">Complete Feature Guide</h4>
                  </div>
                  <p className="text-sm text-deep-navy/70">
                    Browse all features organized by category with role-based filtering
                  </p>
                </Card>
              </Link>

              <Link href="/system-overview" className="block">
                <Card className="p-6 border-2 border-mint-green/30 hover:border-mint-green transition-all hover:shadow-md">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-mint-green/20 flex items-center justify-center">
                      <Code className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                    </div>
                    <h4 className="text-lg font-bold text-deep-navy">System Overview</h4>
                  </div>
                  <p className="text-sm text-deep-navy/70">
                    Technical architecture, security details, and platform specifications
                  </p>
                </Card>
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-deep-navy/10">
            <h3 className="text-xl font-bold text-deep-navy mb-4">Still have questions?</h3>
            <p className="text-deep-navy/80 leading-relaxed mb-4">
              We're here to help! Contact our friendly support team and we'll get back to you promptly.
            </p>
            <Link href="/contact">
              <button className="bg-sky-blue hover:bg-sky-blue/90 text-white px-6 py-3 rounded-[16px] font-semibold transition-all duration-200">
                Contact Support
              </button>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
