import { Card } from '@/components/ui/card';
import { Heart, Users, Target, Award, Hand } from 'lucide-react';
import Link from 'next/link';
import GraceLogoLockup from '@/components/GraceLogoLockup';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            About Grace Companion
          </h1>
          <p className="text-lg text-deep-navy/70">
            Technology with heart, designed for those who need it most
          </p>
        </div>

        <div className="space-y-6">
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-16 h-16 bg-coral-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-deep-navy mb-4">Our Story</h2>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>
                    Grace Companion was born from a simple observation: whilst technology advances at breathtaking speed, the needs of our elders and those facing cognitive challenges are often left behind. We watched family members struggle to stay connected with loved ones who forget appointments, miss medications and feel increasingly isolated.
                  </p>
                  <p>
                    We knew technology could help, but not the kind that requires tapping through menus, remembering passwords, or navigating complex interfaces. What was needed was something fundamentally different: technology that meets people where they are, speaks their language, and provides support without adding stress.
                  </p>
                  <p>
                    Grace Companion is our answer. It's an AI companion designed not to replace human connection, but to support it. To help elders maintain independence whilst giving families peace of mind. To use the power of artificial intelligence in service of genuine human needs.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-mint-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-8 h-8 text-mint-green" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-deep-navy mb-4">Our Mission</h2>
                <p className="text-deep-navy/80 leading-relaxed text-lg mb-6">
                  To empower elders and individuals with cognitive challenges to live independently with dignity, whilst providing families the reassurance they need and deserve.
                </p>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>We believe that:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Everyone deserves technology that works for them, not against them</li>
                    <li>Ageing should not mean losing independence</li>
                    <li>Cognitive challenges should not lead to social isolation</li>
                    <li>Families should be able to support loved ones without constant worry</li>
                    <li>AI should be a tool for compassion, not complexity</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-sky-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-deep-navy mb-4">Our Values</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-deep-navy mb-2 text-lg">Compassion First</h3>
                    <p className="text-deep-navy/70 leading-relaxed">
                      Every feature is designed with empathy for the real challenges faced by elders and those with cognitive impairments. We prioritise kindness over cleverness.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-deep-navy mb-2 text-lg">Simplicity</h3>
                    <p className="text-deep-navy/70 leading-relaxed">
                      Technology should fade into the background, leaving only support and comfort. We ruthlessly eliminate complexity.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-deep-navy mb-2 text-lg">Privacy & Trust</h3>
                    <p className="text-deep-navy/70 leading-relaxed">
                      We handle vulnerable populations' data with the utmost care. Privacy isn't a feature; it's a responsibility we take seriously.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-deep-navy mb-2 text-lg">Dignity</h3>
                    <p className="text-deep-navy/70 leading-relaxed">
                      Everyone deserves to be treated with respect. Grace never patronises, never rushes and always listens with patience.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-deep-navy mb-2 text-lg">Accessibility</h3>
                    <p className="text-deep-navy/70 leading-relaxed">
                      We design for those who are often excluded from the digital world. Accessibility isn't compliance; it's our core purpose.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-deep-navy mb-2 text-lg">Transparency</h3>
                    <p className="text-deep-navy/70 leading-relaxed">
                      We're honest about what Grace can and cannot do. We clearly communicate limitations and never overpromise.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-coral-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-deep-navy mb-4">Our Commitment</h2>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>
                    Grace Companion is not just a product; it's a promise. We commit to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Continuously improving based on feedback from users and families</li>
                    <li>Never sacrificing privacy or security for profit</li>
                    <li>Maintaining affordable pricing so support is accessible to all</li>
                    <li>Providing patient, compassionate customer support</li>
                    <li>Being transparent about AI capabilities and limitations</li>
                    <li>Advocating for the needs of elders in the technology industry</li>
                    <li>Collaborating with healthcare professionals and dementia experts</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-grace-red-50 to-grace-tan-50 rounded-[24px] shadow-lg p-8 md:p-12 border-2 border-grace-red-200">
            <div className="flex justify-center mb-6">
              <GraceLogoLockup size="large" layout="vertical" showTagline animated />
            </div>
            <h2 className="text-3xl font-bold text-deep-navy mb-4 text-center">Our Symbol: Heart & Hand</h2>
            <p className="text-deep-navy/80 leading-relaxed text-lg text-center max-w-2xl mx-auto mb-6">
              Our logo embodies our mission: a warm <span className="text-grace-red-500 font-semibold">red heart</span> representing
              compassion, care, and emotional connection, gently supported by a <span className="text-grace-tan-500 font-semibold">caring hand</span> -
              symbolizing human touch, unwavering support, and the helping hand we extend to every user.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-start gap-3">
                <Heart className="w-8 h-8 text-grace-red-500 flex-shrink-0 mt-1" fill="currentColor" />
                <div>
                  <h3 className="font-semibold text-deep-navy mb-1">The Heart</h3>
                  <p className="text-sm text-deep-navy/70">
                    Represents love, care, health, and the emotional wellbeing at the center of everything we do.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hand className="w-8 h-8 text-grace-tan-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-deep-navy mb-1">The Hand</h3>
                  <p className="text-sm text-deep-navy/70">
                    Symbolizes human support, physical care, and the helping touch that makes a difference in daily life.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-mint-green/10 to-sky-blue/10 rounded-[24px] shadow-lg p-8 md:p-12 border-2 border-mint-green/30">
            <h2 className="text-3xl font-bold text-deep-navy mb-4 text-center">Why "Grace"?</h2>
            <p className="text-deep-navy/80 leading-relaxed text-lg text-center max-w-2xl mx-auto">
              Grace means elegance, kindness and a gift freely given. It's the patience to repeat something for the fifth time without frustration. It's the compassion to recognise when someone needs help before they ask. It's the understanding that ageing and cognitive challenges don't diminish a person's worth or need for connection.
            </p>
            <p className="text-deep-navy/80 leading-relaxed text-lg text-center max-w-2xl mx-auto mt-4">
              Grace Companion embodies these qualities in every interaction, every reminder, and every moment of support.
            </p>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Get in Touch</h2>
            <p className="text-deep-navy/80 leading-relaxed mb-6">
              We'd love to hear from you. Whether you have questions, feedback, or simply want to share your experience with Grace Companion, please reach out.
            </p>
            <Link href="/contact">
              <button className="bg-grace-red-500 hover:bg-grace-red-600 text-white px-8 py-4 rounded-[20px] text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105">
                Contact Us
              </button>
            </Link>
          </Card>
        </div>
      </div>
    </main>
  );
}
