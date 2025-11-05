import Link from 'next/link';
import { Heart, Shield, Phone, Info, HelpCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-deep-navy text-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-grace-red-500" strokeWidth={1.5} fill="currentColor" />
              <h3 className="text-xl font-bold">Grace Companion</h3>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Care with heart and hand - supporting elders, families, and care facilities with compassionate technology.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" strokeWidth={2} />
              About
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-white/70 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-white/70 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-white/70 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/system-overview" className="text-white/70 hover:text-white transition-colors">
                  System Overview
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/70 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" strokeWidth={2} />
              Support
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/support" className="text-white/70 hover:text-white transition-colors">
                  Submit Support Ticket
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-white/70 hover:text-white transition-colors">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-white/70 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" strokeWidth={2} />
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/70 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="text-white/70 hover:text-white transition-colors">
                  Accessibility
                </Link>
              </li>
              <li>
                <Link href="/safety" className="text-white/70 hover:text-white transition-colors">
                  Safety & Security
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4" strokeWidth={2} />
              Emergency Resources
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <span className="font-semibold text-coral-red">Emergency:</span> 999
              </li>
              <li>
                <span className="font-semibold text-white">NHS 111:</span> Medical advice
              </li>
              <li>
                <span className="font-semibold text-white">Age UK:</span> 0800 678 1602
              </li>
              <li>
                <span className="font-semibold text-white">Samaritans:</span> 116 123
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/60 text-center md:text-left">
              &copy; {new Date().getFullYear()} Grace Companion. All rights reserved.
            </p>
            <div className="bg-coral-red/10 border border-coral-red/30 rounded-lg px-4 py-2">
              <p className="text-xs text-white/80 text-center">
                <span className="font-semibold text-coral-red">Important:</span> This is not a medical device.
                In an emergency, call 999 immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
