'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Phone, Mail, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';

interface Elder {
  id: string;
  name: string;
}

interface EscalationContact {
  id: string;
  contact_name: string;
  phone_number: string;
  email: string;
  priority_order: number;
  notification_methods: string[];
  active: boolean;
}

export default function EscalationContactsPage() {
  const { profile } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [contacts, setContacts] = useState<EscalationContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EscalationContact | null>(null);

  const [formData, setFormData] = useState({
    contact_name: '',
    phone_number: '',
    email: '',
    priority_order: 1,
    notification_methods: ['sms'],
  });

  useEffect(() => {
    if (profile?.id) {
      fetchElders();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedElder) {
      fetchContacts();
    }
  }, [selectedElder]);

  const fetchElders = async () => {
    try {
      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('elder_id')
        .eq('nok_id', profile?.id);

      if (relationships && relationships.length > 0) {
        const elderIds = relationships.map((r) => r.elder_id);
        const { data: eldersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', elderIds);

        if (eldersData && eldersData.length > 0) {
          setElders(eldersData);
          setSelectedElder(eldersData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching elders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    if (!selectedElder) return;

    try {
      const { data } = await supabase
        .from('escalation_contacts')
        .select('*')
        .eq('elder_id', selectedElder.id)
        .order('priority_order', { ascending: true });

      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElder || !profile?.id) return;

    if (!formData.phone_number && !formData.email) {
      alert('Please provide at least a phone number or email address.');
      return;
    }

    try {
      const contactData = {
        elder_id: selectedElder.id,
        nok_id: profile.id,
        contact_name: formData.contact_name,
        phone_number: formData.phone_number || null,
        email: formData.email || null,
        priority_order: formData.priority_order,
        notification_methods: formData.notification_methods,
        active: true,
      };

      if (editingContact) {
        const { error } = await supabase
          .from('escalation_contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('escalation_contacts')
          .insert(contactData);

        if (error) throw error;
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact. Please try again.');
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this escalation contact?')) return;

    try {
      const { error } = await supabase
        .from('escalation_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact. Please try again.');
    }
  };

  const handleEdit = (contact: EscalationContact) => {
    setEditingContact(contact);
    setFormData({
      contact_name: contact.contact_name,
      phone_number: contact.phone_number || '',
      email: contact.email || '',
      priority_order: contact.priority_order,
      notification_methods: contact.notification_methods || ['sms'],
    });
    setIsDialogOpen(true);
  };

  const toggleActive = async (contact: EscalationContact) => {
    try {
      const { error } = await supabase
        .from('escalation_contacts')
        .update({ active: !contact.active })
        .eq('id', contact.id);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error('Error toggling contact:', error);
      alert('Failed to update contact status.');
    }
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      contact_name: '',
      phone_number: '',
      email: '',
      priority_order: contacts.length + 1,
      notification_methods: ['sms'],
    });
  };

  const toggleNotificationMethod = (method: string) => {
    const current = formData.notification_methods;
    if (current.includes(method)) {
      setFormData({
        ...formData,
        notification_methods: current.filter((m) => m !== method),
      });
    } else {
      setFormData({
        ...formData,
        notification_methods: [...current, method],
      });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-deep-navy text-xl py-12">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/nok-dashboard">
            <Button variant="ghost" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[16px]">
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Escalation Contact' : 'Add Escalation Contact'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="e.g., John Smith"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+1234567890"
                  />
                  <p className="text-sm text-deep-navy/60 mt-1">Include country code (e.g., +1 for US)</p>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="priority_order">Priority Order</Label>
                  <Input
                    id="priority_order"
                    type="number"
                    min="1"
                    value={formData.priority_order}
                    onChange={(e) =>
                      setFormData({ ...formData, priority_order: parseInt(e.target.value) || 1 })
                    }
                  />
                  <p className="text-sm text-deep-navy/60 mt-1">
                    Lower numbers are contacted first (1 = first contact)
                  </p>
                </div>

                <div>
                  <Label className="mb-3 block">Alert Methods</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="method_sms"
                        checked={formData.notification_methods.includes('sms')}
                        onCheckedChange={() => toggleNotificationMethod('sms')}
                        disabled={!formData.phone_number}
                      />
                      <label htmlFor="method_sms" className="cursor-pointer">
                        SMS Text Message
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="method_call"
                        checked={formData.notification_methods.includes('call')}
                        onCheckedChange={() => toggleNotificationMethod('call')}
                        disabled={!formData.phone_number}
                      />
                      <label htmlFor="method_call" className="cursor-pointer">
                        Phone Call
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="method_email"
                        checked={formData.notification_methods.includes('email')}
                        onCheckedChange={() => toggleNotificationMethod('email')}
                        disabled={!formData.email}
                      />
                      <label htmlFor="method_email" className="cursor-pointer">
                        Email
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-mint-green hover:bg-mint-green/90 text-deep-navy"
                    disabled={formData.notification_methods.length === 0}
                  >
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center">
            Emergency Contacts
          </h1>
          {selectedElder && (
            <p className="text-body text-deep-navy/70 text-center mt-2">
              These people will be alerted if {selectedElder.name} misses important reminders
            </p>
          )}
        </Card>

        <Alert className="mb-6 bg-sky-blue/20 border-sky-blue">
          <AlertTriangle className="w-5 h-5 text-sky-blue" />
          <AlertDescription className="text-deep-navy">
            Contacts are alerted in priority order when reminders are missed. Make sure phone numbers include
            country codes (e.g., +1 for US).
          </AlertDescription>
        </Alert>

        {elders.length > 1 && (
          <Card className="bg-white rounded-[20px] shadow-md p-6 mb-6">
            <Label className="text-deep-navy font-semibold mb-3 block">Select Elder</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {elders.map((elder) => (
                <Button
                  key={elder.id}
                  onClick={() => setSelectedElder(elder)}
                  variant={selectedElder?.id === elder.id ? 'default' : 'outline'}
                  className="justify-start h-auto py-4 px-6 rounded-[16px]"
                >
                  <div className="text-left">
                    <p className="font-semibold">{elder.name}</p>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {contacts.length === 0 ? (
            <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
              <p className="text-lg text-deep-navy/70 mb-4">No emergency contacts set up yet</p>
              <p className="text-sm text-deep-navy/60">
                Add contacts who should be alerted if {selectedElder?.name} misses reminders
              </p>
            </Card>
          ) : (
            contacts.map((contact, index) => (
              <Card
                key={contact.id}
                className={`rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow ${
                  contact.active ? 'bg-white' : 'bg-soft-gray/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-8 h-8 rounded-full bg-mint-green/20 text-mint-green font-bold flex items-center justify-center">
                        {contact.priority_order}
                      </span>
                      <h3 className="text-xl font-semibold text-deep-navy">{contact.contact_name}</h3>
                      {!contact.active && (
                        <span className="px-2 py-1 bg-soft-gray text-deep-navy/60 rounded text-xs">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 ml-11">
                      {contact.phone_number && (
                        <p className="text-deep-navy/70 flex items-center">
                          <Phone className="w-4 h-4 mr-2" />
                          {contact.phone_number}
                        </p>
                      )}
                      {contact.email && (
                        <p className="text-deep-navy/70 flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          {contact.email}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {contact.notification_methods.map((method) => (
                          <span
                            key={method}
                            className="px-3 py-1 bg-sky-blue/20 text-sky-blue rounded-full text-sm"
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(contact)}
                      title={contact.active ? 'Deactivate' : 'Activate'}
                    >
                      <div
                        className={`w-5 h-5 rounded ${
                          contact.active ? 'bg-mint-green' : 'bg-soft-gray'
                        }`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
                      <Edit className="w-5 h-5 text-sky-blue" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                      <Trash2 className="w-5 h-5 text-coral-red" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
