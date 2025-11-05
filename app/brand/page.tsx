'use client';

import { Card } from '@/components/ui/card';
import GraceLogo from '@/components/GraceLogo';
import GraceLogoLockup from '@/components/GraceLogoLockup';
import GraceIcon from '@/components/GraceIcon';
import { Heart, Hand, Palette, Type, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function BrandGuidelinesPage() {
  const brandColors = [
    { name: 'Grace Red', hex: '#E85A4F', usage: 'Primary brand color, heart symbol, key CTAs' },
    { name: 'Grace Tan', hex: '#D4A574', usage: 'Supporting color, hand symbol, warm accents' },
    { name: 'Sky Blue', hex: '#A7D8F0', usage: 'Background gradients, calm interactions' },
    { name: 'Warm Cream', hex: '#FFF7E6', usage: 'Page backgrounds, light surfaces' },
    { name: 'Mint Green', hex: '#BDE8CA', usage: 'Success states, wellness features' },
    { name: 'Deep Navy', hex: '#0E2A47', usage: 'Text, headers, professional elements' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-warm-cream to-white p-6">
      <div className="max-w-6xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-grace-red-500 hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-5xl font-bold text-deep-navy mb-4">
            Grace Companion Brand Guidelines
          </h1>
          <p className="text-xl text-deep-navy/70">
            Care with Heart & Hand - Visual identity guidelines and usage standards
          </p>
        </div>

        <div className="space-y-8">
          {/* Logo Section */}
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 bg-grace-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-grace-red-500" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-deep-navy mb-2">Our Logo</h2>
                <p className="text-deep-navy/70">
                  The Grace Companion logo features a warm red heart supported by a caring beige hand -
                  symbolizing compassionate care, human touch, and unwavering support.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="flex flex-col items-center gap-4 p-6 bg-soft-gray/20 rounded-2xl">
                <GraceLogo size="large" variant="color" />
                <div className="text-center">
                  <h3 className="font-semibold text-deep-navy mb-1">Primary Logo</h3>
                  <p className="text-sm text-deep-navy/60">Use on light backgrounds</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 p-6 bg-soft-gray/20 rounded-2xl">
                <GraceLogo size="large" variant="monochrome" />
                <div className="text-center">
                  <h3 className="font-semibold text-deep-navy mb-1">Monochrome</h3>
                  <p className="text-sm text-deep-navy/60">Single color applications</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 p-6 bg-deep-navy rounded-2xl">
                <GraceLogo size="large" variant="color" />
                <div className="text-center">
                  <h3 className="font-semibold text-white mb-1">On Dark</h3>
                  <p className="text-sm text-white/60">Dark background usage</p>
                </div>
              </div>
            </div>

            {/* Logo Lockups */}
            <h3 className="text-2xl font-bold text-deep-navy mb-6">Logo Lockups</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center gap-4 p-6 bg-soft-gray/20 rounded-2xl">
                <GraceLogoLockup size="medium" layout="horizontal" showTagline />
                <div className="text-center">
                  <h4 className="font-semibold text-deep-navy mb-1">Horizontal Lockup</h4>
                  <p className="text-sm text-deep-navy/60">Preferred for headers and wide spaces</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 p-6 bg-soft-gray/20 rounded-2xl">
                <GraceLogoLockup size="medium" layout="vertical" showTagline />
                <div className="text-center">
                  <h4 className="font-semibold text-deep-navy mb-1">Vertical Lockup</h4>
                  <p className="text-sm text-deep-navy/60">Use in square or tall layouts</p>
                </div>
              </div>
            </div>

            {/* App Icon */}
            <div className="mt-8 pt-8 border-t border-soft-gray">
              <h3 className="text-2xl font-bold text-deep-navy mb-6">App Icon</h3>
              <div className="flex items-center gap-6">
                <GraceIcon size={80} variant="color" />
                <div>
                  <h4 className="font-semibold text-deep-navy mb-2">Simplified Icon</h4>
                  <p className="text-deep-navy/70 mb-4">
                    Optimized version for favicons, app icons, and small applications.
                    Maintains clarity at sizes as small as 16x16 pixels.
                  </p>
                  <div className="flex gap-4">
                    <GraceIcon size={48} variant="color" />
                    <GraceIcon size={32} variant="color" />
                    <GraceIcon size={16} variant="color" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Logo Usage Guidelines */}
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold text-deep-navy mb-6">Logo Usage Guidelines</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-deep-navy mb-1">Always maintain clear space</h4>
                    <p className="text-sm text-deep-navy/70">
                      Keep at least the height of the heart as clear space around the logo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-deep-navy mb-1">Use approved color variations</h4>
                    <p className="text-sm text-deep-navy/70">
                      Stick to full color or monochrome versions only
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-deep-navy mb-1">Scale proportionally</h4>
                    <p className="text-sm text-deep-navy/70">
                      Always maintain the aspect ratio when resizing
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-grace-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-deep-navy mb-1">Do not alter the colors</h4>
                    <p className="text-sm text-deep-navy/70">
                      Never change the red heart or tan hand to other colors
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-grace-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-deep-navy mb-1">Do not rotate or distort</h4>
                    <p className="text-sm text-deep-navy/70">
                      Keep the logo upright and properly proportioned
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-grace-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-deep-navy mb-1">Do not add effects</h4>
                    <p className="text-sm text-deep-navy/70">
                      No drop shadows, outlines, or additional effects
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-grace-red-50 border-2 border-grace-red-200 rounded-xl p-6">
              <h4 className="font-semibold text-deep-navy mb-2 flex items-center gap-2">
                <Heart className="w-5 h-5 text-grace-red-500" />
                Minimum Size Requirements
              </h4>
              <p className="text-deep-navy/70">
                <strong>Digital:</strong> 32px minimum height for logo only, 40px for lockup with text<br />
                <strong>Print:</strong> 0.5 inch (12.7mm) minimum height for clear reproduction
              </p>
            </div>
          </Card>

          {/* Brand Colors */}
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 bg-grace-tan-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Palette className="w-6 h-6 text-grace-tan-500" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-deep-navy mb-2">Brand Colors</h2>
                <p className="text-deep-navy/70">
                  Our color palette is warm, approachable, and accessible. Colors are chosen to
                  convey compassion, trust, and clarity.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandColors.map((color) => (
                <div key={color.hex} className="space-y-3">
                  <div
                    className="h-32 rounded-xl shadow-md border-2 border-soft-gray/30"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div>
                    <h4 className="font-semibold text-deep-navy mb-1">{color.name}</h4>
                    <p className="text-sm font-mono text-deep-navy/80 mb-2">{color.hex}</p>
                    <p className="text-sm text-deep-navy/60">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-soft-gray">
              <h3 className="text-2xl font-bold text-deep-navy mb-4">Color Scales</h3>
              <p className="text-deep-navy/70 mb-6">
                Extended color scales for Grace Red and Grace Tan provide flexibility for UI states,
                hover effects, and hierarchical information.
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-deep-navy mb-3">Grace Red Scale</h4>
                  <div className="flex gap-1">
                    {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                      <div key={shade} className="flex-1">
                        <div
                          className={`h-16 rounded-lg mb-1`}
                          style={{ backgroundColor: `var(--grace-red-${shade})` }}
                        />
                        <p className="text-xs text-center text-deep-navy/60">{shade}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-deep-navy mb-3">Grace Tan Scale</h4>
                  <div className="flex gap-1">
                    {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                      <div key={shade} className="flex-1">
                        <div
                          className={`h-16 rounded-lg mb-1`}
                          style={{ backgroundColor: `var(--grace-tan-${shade})` }}
                        />
                        <p className="text-xs text-center text-deep-navy/60">{shade}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Typography */}
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 bg-sky-blue/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Type className="w-6 h-6 text-deep-navy" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-deep-navy mb-2">Typography</h2>
                <p className="text-deep-navy/70">
                  Clear, readable typography that prioritizes accessibility and warmth.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-heading-lg font-bold text-deep-navy mb-4 font-sans">
                  Nunito - Primary Font
                </h3>
                <p className="text-body text-deep-navy/80 mb-4">
                  Nunito is our primary typeface for UI elements, body text, and most content.
                  It's friendly, highly legible, and performs well at all sizes.
                </p>
                <div className="bg-soft-gray/20 rounded-xl p-6 space-y-2">
                  <p className="text-4xl font-sans">Aa Bb Cc Dd Ee</p>
                  <p className="text-2xl font-sans">1234567890</p>
                </div>
              </div>

              <div>
                <h3 className="text-heading-lg font-bold text-deep-navy mb-4 font-serif">
                  Alegreya - Secondary Font
                </h3>
                <p className="text-body text-deep-navy/80 mb-4">
                  Alegreya adds warmth and personality to headings and special emphasis.
                  Use sparingly for impact.
                </p>
                <div className="bg-soft-gray/20 rounded-xl p-6 space-y-2">
                  <p className="text-4xl font-serif">Aa Bb Cc Dd Ee</p>
                  <p className="text-2xl font-serif">1234567890</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-deep-navy mb-4">Type Scale</h4>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-4">
                    <span className="text-sm text-deep-navy/60 w-24">Heading L</span>
                    <h1 className="text-heading-lg font-bold text-deep-navy">28px / 1.75rem</h1>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-sm text-deep-navy/60 w-24">Heading M</span>
                    <h2 className="text-heading-md font-bold text-deep-navy">26px / 1.625rem</h2>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-sm text-deep-navy/60 w-24">Heading S</span>
                    <h3 className="text-heading-sm font-bold text-deep-navy">24px / 1.5rem</h3>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-sm text-deep-navy/60 w-24">Body</span>
                    <p className="text-body text-deep-navy">18px / 1.125rem</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-sm text-deep-navy/60 w-24">Small</span>
                    <p className="text-sm text-deep-navy">14px / 0.875rem</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Brand Voice */}
          <Card className="bg-gradient-to-br from-grace-red-50 to-grace-tan-50 rounded-[24px] shadow-lg p-8 md:p-12 border-2 border-grace-red-200">
            <h2 className="text-3xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Hand className="w-8 h-8 text-grace-tan-500" />
              Brand Voice & Personality
            </h2>
            <p className="text-lg text-deep-navy/80 mb-6">
              Grace Companion speaks with compassion, clarity, and patience. We're a supportive companion,
              never patronizing, always respectful of dignity and autonomy.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6">
                <h4 className="font-semibold text-deep-navy mb-2">Compassionate</h4>
                <p className="text-sm text-deep-navy/70">
                  We understand challenges and respond with empathy, never judgment.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6">
                <h4 className="font-semibold text-deep-navy mb-2">Clear & Simple</h4>
                <p className="text-sm text-deep-navy/70">
                  We communicate in plain language, avoiding jargon and complexity.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6">
                <h4 className="font-semibold text-deep-navy mb-2">Patient</h4>
                <p className="text-sm text-deep-navy/70">
                  We never rush. Repetition is welcome. Every question matters.
                </p>
              </div>
            </div>
          </Card>

          {/* Download Assets */}
          <Card className="bg-deep-navy text-white rounded-[24px] shadow-lg p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Need Brand Assets?</h2>
            <p className="text-white/80 mb-6 max-w-2xl mx-auto">
              For press inquiries, partnership materials, or approved brand usage,
              please contact our team for access to high-resolution assets and additional guidelines.
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
