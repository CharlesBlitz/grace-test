'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Heart, Share2, Image as ImageIcon, Plus, User, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PhotoShare {
  id: string;
  elder_id: string;
  photo_url: string;
  caption: string | null;
  shared_with_nok_ids: string[];
  reaction_count: number;
  reactions: Record<string, any>;
  taken_at: string;
  location: string | null;
  activity_type: string | null;
  created_at: string;
  elder_name?: string;
}

interface Contact {
  id: string;
  name: string;
}

export default function PhotosPage() {
  const { profile } = useAuth();
  const [photos, setPhotos] = useState<PhotoShare[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPhoto, setShowNewPhoto] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadPhotos();
      loadContacts();
    }
  }, [profile]);

  const loadPhotos = async () => {
    try {
      let query;
      if (profile?.role === 'elder') {
        query = supabase
          .from('photo_shares')
          .select('*')
          .eq('elder_id', profile.id);
      } else if (profile?.role === 'nok') {
        query = supabase
          .from('photo_shares')
          .select('*')
          .contains('shared_with_nok_ids', [profile.id]);
      }

      const { data, error } = await query!.order('created_at', { ascending: false });

      if (error) throw error;

      const elderIds = Array.from(new Set(data?.map(p => p.elder_id) || []));
      const { data: elders } = await supabase
        .from('users')
        .select('id, name')
        .in('id', elderIds);

      const elderMap = new Map(elders?.map(e => [e.id, e.name]) || []);

      const photosWithNames = data?.map(photo => ({
        ...photo,
        elder_name: elderMap.get(photo.elder_id),
      })) || [];

      setPhotos(photosWithNames);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (profile?.role !== 'elder') return;

    try {
      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('nok_id')
        .eq('elder_id', profile.id);

      if (relationships && relationships.length > 0) {
        const nokIds = relationships.map((r) => r.nok_id);
        const { data: noks } = await supabase
          .from('users')
          .select('id, name')
          .in('id', nokIds);

        setContacts(noks || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sharePhoto = async () => {
    if (!photoPreview) {
      toast.error('Please take or select a photo first');
      return;
    }

    try {
      const { error } = await supabase.from('photo_shares').insert({
        elder_id: profile?.id,
        photo_url: photoPreview,
        caption: caption || null,
        shared_with_nok_ids: selectedContacts,
        reaction_count: 0,
        reactions: {},
        location: null,
        activity_type: null,
      });

      if (error) throw error;

      await supabase.from('activity_log').insert({
        elder_id: profile?.id,
        activity_type: 'photo_share',
        activity_title: 'Shared a Photo',
        activity_description: caption || 'Shared a moment with family',
        completed_at: new Date().toISOString(),
        icon: 'camera',
        color: 'sky-blue',
      });

      toast.success('Photo shared! Your photo has been shared with your family');

      setShowNewPhoto(false);
      setCaption('');
      setPhotoPreview(null);
      setSelectedContacts([]);
      loadPhotos();
    } catch (error: any) {
      toast.error(error.message || 'Error sharing photo');
    }
  };

  const toggleReaction = async (photoId: string, reactionType: string) => {
    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      const reactions = { ...photo.reactions };
      const userId = profile?.id || 'anonymous';

      if (reactions[reactionType]?.includes(userId)) {
        reactions[reactionType] = reactions[reactionType].filter((id: string) => id !== userId);
      } else {
        if (!reactions[reactionType]) reactions[reactionType] = [];
        reactions[reactionType].push(userId);
      }

      const reactionCount = Object.values(reactions).reduce((acc, users) => acc + (users as string[]).length, 0);

      await supabase
        .from('photo_shares')
        .update({ reactions, reaction_count: reactionCount })
        .eq('id', photoId);

      loadPhotos();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading photos...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>

          {profile?.role === 'elder' && (
            <Button
              onClick={() => setShowNewPhoto(true)}
              size="lg"
              className="bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[16px]"
            >
              <Camera className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Share Photo
            </Button>
          )}
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <Camera className="w-10 h-10 text-sky-blue" strokeWidth={1.5} />
              <div>
                <h1 className="text-4xl font-bold text-deep-navy">Photo Gallery</h1>
                <p className="text-xl text-deep-navy/70">Share special moments with your family</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {photos.length === 0 ? (
          <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
            <ImageIcon className="w-16 h-16 text-deep-navy/40 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-2xl font-bold text-deep-navy mb-2">No Photos Yet</h3>
            <p className="text-lg text-deep-navy/70 mb-6">
              {profile?.role === 'elder'
                ? 'Start sharing photos with your family'
                : 'No photos have been shared with you yet'}
            </p>
            {profile?.role === 'elder' && (
              <Button
                onClick={() => setShowNewPhoto(true)}
                className="bg-mint-green hover:bg-mint-green/90 text-deep-navy"
              >
                <Camera className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Share First Photo
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <Card key={photo.id} className="bg-white rounded-[20px] shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                <div className="aspect-square bg-soft-gray/20 relative">
                  <img
                    src={photo.photo_url || '/placeholder.png'}
                    alt={photo.caption || 'Shared photo'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-sky-blue/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-sky-blue" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-deep-navy text-sm">{photo.elder_name}</p>
                      <p className="text-xs text-deep-navy/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        {formatDate(photo.created_at)}
                      </p>
                    </div>
                  </div>

                  {photo.caption && (
                    <p className="text-deep-navy/80 mb-3">{photo.caption}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => toggleReaction(photo.id, 'love')}
                      variant="ghost"
                      size="sm"
                      className="flex-1 rounded-[12px] hover:bg-coral-red/10"
                    >
                      <Heart className="w-5 h-5 text-coral-red mr-1" strokeWidth={1.5} />
                      <span className="text-sm">{(photo.reactions?.love as string[] || []).length}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-[12px]"
                    >
                      <Share2 className="w-5 h-5" strokeWidth={1.5} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showNewPhoto} onOpenChange={setShowNewPhoto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Share a Photo</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <Label htmlFor="photo-input" className="text-lg font-semibold text-deep-navy mb-3 block">
                  Take or Choose Photo
                </Label>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                <label htmlFor="photo-input">
                  <div className="aspect-square bg-soft-gray/20 rounded-[16px] flex items-center justify-center cursor-pointer hover:bg-soft-gray/30 transition-colors border-2 border-dashed border-deep-navy/20">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-[16px]" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-16 h-16 mx-auto mb-3 text-deep-navy/40" strokeWidth={1.5} />
                        <p className="text-deep-navy/60">Tap to take photo</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div>
                <Label htmlFor="caption" className="text-lg font-semibold text-deep-navy mb-3 block">
                  Caption (Optional)
                </Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's happening in this photo?"
                  className="h-24 text-lg rounded-[12px]"
                />
              </div>

              <div>
                <Label className="text-lg font-semibold text-deep-navy mb-3 block">Share With</Label>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <Button
                      key={contact.id}
                      onClick={() => {
                        setSelectedContacts((prev) =>
                          prev.includes(contact.id)
                            ? prev.filter((id) => id !== contact.id)
                            : [...prev, contact.id]
                        );
                      }}
                      variant={selectedContacts.includes(contact.id) ? 'default' : 'outline'}
                      className="w-full justify-start rounded-[12px]"
                    >
                      <User className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      {contact.name}
                      {selectedContacts.includes(contact.id) && (
                        <span className="ml-auto">✓</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowNewPhoto(false);
                    setCaption('');
                    setPhotoPreview(null);
                    setSelectedContacts([]);
                  }}
                  variant="outline"
                  className="flex-1 rounded-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sharePhoto}
                  disabled={!photoPreview}
                  className="flex-1 bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[12px]"
                >
                  <Share2 className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Share
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
