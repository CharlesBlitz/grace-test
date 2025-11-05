'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/authContext';
import { languageDetection } from '@/lib/languageDetection';
import { Globe, ChevronLeft, Save, Trash2, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function LanguageSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Language preferences state
  const [primaryLanguage, setPrimaryLanguage] = useState('en');
  const [primaryLanguageName, setPrimaryLanguageName] = useState('English');
  const [primaryDialect, setPrimaryDialect] = useState('');
  const [secondaryLanguages, setSecondaryLanguages] = useState<string[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [selectedLanguageToAdd, setSelectedLanguageToAdd] = useState('');

  const supportedLanguages = languageDetection.getSupportedLanguages();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadLanguagePreferences();
  }, [user]);

  const loadLanguagePreferences = async () => {
    if (!user?.id) return;

    try {
      const preferences = await languageDetection.getUserLanguagePreferences(user.id);
      if (preferences) {
        setPrimaryLanguage(preferences.primary_language);
        setPrimaryLanguageName(preferences.primary_language_name);
        setPrimaryDialect(preferences.primary_dialect || '');
        setSecondaryLanguages(preferences.secondary_languages || []);
        setAutoDetectEnabled(preferences.auto_detect_enabled);
      }
    } catch (error) {
      console.error('Error loading language preferences:', error);
      toast.error('Failed to load language preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await languageDetection.updateUserLanguagePreferences(user.id, {
        primary_language: primaryLanguage,
        primary_language_name: primaryLanguageName,
        primary_dialect: primaryDialect || undefined,
        secondary_languages: secondaryLanguages,
        auto_detect_enabled: autoDetectEnabled,
      });

      toast.success('Language preferences saved successfully');
    } catch (error) {
      console.error('Error saving language preferences:', error);
      toast.error('Failed to save language preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryLanguageChange = (value: string) => {
    const language = supportedLanguages.find((l) => l.code === value);
    if (language) {
      setPrimaryLanguage(language.code);
      setPrimaryLanguageName(language.name);
    }
  };

  const handleAddSecondaryLanguage = () => {
    if (selectedLanguageToAdd && !secondaryLanguages.includes(selectedLanguageToAdd)) {
      setSecondaryLanguages([...secondaryLanguages, selectedLanguageToAdd]);
      setSelectedLanguageToAdd('');
    }
  };

  const handleRemoveSecondaryLanguage = (languageCode: string) => {
    setSecondaryLanguages(secondaryLanguages.filter((lang) => lang !== languageCode));
  };

  const getLanguageName = (code: string): string => {
    return supportedLanguages.find((l) => l.code === code)?.name || code;
  };

  const availableLanguagesToAdd = supportedLanguages.filter(
    (lang) => lang.code !== primaryLanguage && !secondaryLanguages.includes(lang.code)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-deep-navy flex items-center gap-3">
              <Globe className="h-8 w-8" />
              Language Settings
            </h1>
            <p className="text-deep-navy/70 mt-1">
              Configure your language preferences for voice conversations
            </p>
          </div>
        </div>

        {/* Primary Language */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Language</CardTitle>
            <CardDescription>
              Your main language for conversations with Grace Companion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-language">Select Primary Language</Label>
              <Select value={primaryLanguage} onValueChange={handlePrimaryLanguageChange}>
                <SelectTrigger id="primary-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialect">Dialect (Optional)</Label>
              <input
                id="dialect"
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., British, American, Regional"
                value={primaryDialect}
                onChange={(e) => setPrimaryDialect(e.target.value)}
              />
              <p className="text-sm text-gray-600">
                Specify a dialect or regional variant for more natural speech
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Secondary Languages</CardTitle>
            <CardDescription>
              Additional languages you speak that Grace should recognize
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Secondary Languages */}
            {secondaryLanguages.length > 0 && (
              <div className="space-y-2">
                <Label>Your Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {secondaryLanguages.map((langCode) => (
                    <Badge key={langCode} variant="secondary" className="pl-3 pr-1 py-1">
                      {getLanguageName(langCode)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-2"
                        onClick={() => handleRemoveSecondaryLanguage(langCode)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Secondary Language */}
            {availableLanguagesToAdd.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="add-language">Add Another Language</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedLanguageToAdd}
                    onValueChange={setSelectedLanguageToAdd}
                  >
                    <SelectTrigger id="add-language" className="flex-1">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguagesToAdd.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddSecondaryLanguage}
                    disabled={!selectedLanguageToAdd}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            )}

            {secondaryLanguages.length === 0 && (
              <p className="text-sm text-gray-600">
                No secondary languages added yet. Adding secondary languages helps Grace
                understand you better if you switch between languages.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Auto-Detection Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Automatic Language Detection</CardTitle>
            <CardDescription>
              Let Grace automatically detect which language you're speaking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-detect">Enable Auto-Detection</Label>
                <p className="text-sm text-gray-600">
                  Grace will automatically switch languages when she detects you speaking in a
                  different language
                </p>
              </div>
              <Switch
                id="auto-detect"
                checked={autoDetectEnabled}
                onCheckedChange={setAutoDetectEnabled}
              />
            </div>

            {autoDetectEnabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Auto-detection is enabled</p>
                    <p>
                      Grace will listen for all your configured languages and automatically
                      respond in the language you're speaking. This is especially helpful if you
                      naturally switch between languages during conversation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Benefits Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Why Configure Multiple Languages?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>For you:</strong> Speak naturally in your preferred language, especially
              during moments of stress or confusion.
            </p>
            <p>
              <strong>For your family:</strong> They'll receive alerts when you switch to your
              native language, which can indicate distress or confusion.
            </p>
            <p>
              <strong>For emergency situations:</strong> Grace can detect emergency phrases in
              all your languages and alert help immediately.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving} size="lg" className="flex-1">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Language Preferences
              </>
            )}
          </Button>
          <Link href="/settings">
            <Button variant="outline" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
