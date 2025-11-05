import {
  Heart,
  Brain,
  Footprints,
  Users,
  Utensils,
  Pill,
  Activity,
  Droplet,
  Sparkles,
  Stethoscope,
  Wind,
  Shield,
  LucideIcon,
} from 'lucide-react';

export const careDomainIcons: Record<string, LucideIcon> = {
  health: Heart,
  cognitive: Brain,
  mobility: Footprints,
  social: Users,
  nutrition: Utensils,
  medication: Pill,
  activity: Activity,
  hygiene: Droplet,
  therapy: Sparkles,
  assessment: Stethoscope,
  wellness: Wind,
  safety: Shield,
};

export const taskTypeIcons: Record<string, LucideIcon> = {
  medication: Pill,
  hygiene: Droplet,
  activity: Activity,
  therapy: Sparkles,
  assessment: Stethoscope,
  nutrition: Utensils,
  meal: Utensils,
  social: Users,
  other: Activity,
};

export const careDomainColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  health: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-600',
  },
  cognitive: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: 'text-purple-600',
  },
  mobility: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
  social: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-600',
  },
  nutrition: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: 'text-orange-600',
  },
  medication: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: 'text-teal-600',
  },
  activity: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    icon: 'text-cyan-600',
  },
  hygiene: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    icon: 'text-sky-600',
  },
  therapy: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    icon: 'text-pink-600',
  },
  assessment: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: 'text-slate-600',
  },
  wellness: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
  },
  safety: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'text-amber-600',
  },
};

export function getDomainIcon(category: string): LucideIcon {
  return careDomainIcons[category.toLowerCase()] || Activity;
}

export function getTaskTypeIcon(taskType: string): LucideIcon {
  return taskTypeIcons[taskType.toLowerCase()] || Activity;
}

export function getDomainColors(category: string) {
  return careDomainColors[category.toLowerCase()] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: 'text-gray-600',
  };
}
