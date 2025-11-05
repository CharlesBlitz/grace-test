'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

export default function OrganizationPending() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Clock className="h-16 w-16 text-blue-600" />
              <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl">Registration Under Review</CardTitle>
          <CardDescription className="text-lg mt-2">
            Thank you for registering your organisation with Grace Companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              What Happens Next?
            </h3>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                  1
                </span>
                <span>Our team will review your organisation details and verify your facility licence</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                  2
                </span>
                <span>You'll receive an email confirmation once your account is approved (typically within 1-2 business days)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                  3
                </span>
                <span>A dedicated onboarding specialist will contact you to help set up your account</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                  4
                </span>
                <span>We'll provide training materials and schedule a live demo for your team</span>
              </li>
            </ol>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">Need Immediate Assistance?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <Mail className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-semibold mb-1">Email Us</h4>
                  <p className="text-sm text-gray-600 mb-3">Get in touch with our team</p>
                  <a
                    href="mailto:organisations@gracecompanion.com"
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    organisations@gracecompanion.com
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Phone className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-semibold mb-1">Call Us</h4>
                  <p className="text-sm text-gray-600 mb-3">Speak with our team directly</p>
                  <a href="tel:+18005551234" className="text-blue-600 hover:underline text-sm font-medium">
                    1-800-555-1234
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2">While You Wait</h3>
            <p className="text-gray-700 mb-4">
              Explore our resources to learn more about Grace Companion and prepare for your onboarding:
            </p>
            <div className="space-y-2">
              <Link href="/organization/features" className="block text-blue-600 hover:underline">
                View Platform Features →
              </Link>
              <Link href="/organization/pricing" className="block text-blue-600 hover:underline">
                Compare Subscription Plans →
              </Link>
              <Link href="/organization/demo" className="block text-blue-600 hover:underline">
                Watch Product Demo Video →
              </Link>
              <Link href="/organization/case-studies" className="block text-blue-600 hover:underline">
                Read Success Stories →
              </Link>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button asChild variant="outline">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
