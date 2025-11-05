"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, MessageSquare, Send, Settings, History, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function CommunicationsPage() {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("This is a test message from Grace Companion");
  const [testType, setTestType] = useState<"sms" | "voice">("sms");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSMS: 0,
    totalCalls: 0,
    successRate: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    loadCommunicationLogs();
    loadStats();
  }, []);

  async function loadCommunicationLogs() {
    const { data: smsData } = await supabase
      .from("sms_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: callData } = await supabase
      .from("voice_call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (smsData) setSmsLogs(smsData);
    if (callData) setCallLogs(callData);
  }

  async function loadStats() {
    const { count: smsCount } = await supabase
      .from("sms_logs")
      .select("*", { count: "exact", head: true });

    const { count: callCount } = await supabase
      .from("voice_call_logs")
      .select("*", { count: "exact", head: true });

    const { count: successCount } = await supabase
      .from("sms_logs")
      .select("*", { count: "exact", head: true })
      .in("status", ["sent", "delivered"]);

    const rate = smsCount ? Math.round(((successCount || 0) / smsCount) * 100) : 0;

    setStats({
      totalSMS: smsCount || 0,
      totalCalls: callCount || 0,
      successRate: rate,
    });
  }

  async function handleTestSend() {
    if (!testPhone || !testMessage) {
      setResult({ success: false, error: "Please provide phone number and message" });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const endpoint = testType === "sms" ? "twilio-send-sms" : "twilio-make-call";
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: testPhone,
            message: testMessage,
            messageType: "general",
          }),
        }
      );

      const data = await response.json();
      setResult(data);

      if (data.success) {
        loadCommunicationLogs();
        loadStats();
      }
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SMS & Voice Communications</h1>
          <p className="text-slate-600">Manage and monitor Twilio SMS and voice communications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SMS Sent</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSMS}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls Made</CardTitle>
              <Phone className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="test" className="space-y-6">
          <TabsList>
            <TabsTrigger value="test">Test Communications</TabsTrigger>
            <TabsTrigger value="sms-logs">SMS Logs</TabsTrigger>
            <TabsTrigger value="call-logs">Call Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Test SMS & Voice</CardTitle>
                <CardDescription>
                  Send test messages or make test calls to verify your Twilio integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Communication Type</Label>
                  <Select value={testType} onValueChange={(v) => setTestType(v as "sms" | "voice")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS Message</SelectItem>
                      <SelectItem value="voice">Voice Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+44XXXXXXXXXX or 07XXXXXXXXX"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter phone number in international format or UK mobile format
                  </p>
                </div>

                <div>
                  <Label>Message</Label>
                  <Textarea
                    rows={4}
                    placeholder="Enter your test message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                  />
                </div>

                {result && (
                  <Alert variant={result.success ? "default" : "destructive"}>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {result.success
                        ? `${testType === "sms" ? "SMS sent" : "Call initiated"} successfully! SID: ${result.sid}`
                        : `Error: ${result.error}`}
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={handleTestSend} disabled={sending} className="w-full">
                  {sending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test {testType === "sms" ? "SMS" : "Call"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms-logs">
            <Card>
              <CardHeader>
                <CardTitle>SMS Logs</CardTitle>
                <CardDescription>Recent SMS messages sent through the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {smsLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between border-b pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.status === "sent" || log.status === "delivered" ? "default" : "destructive"}>
                            {log.status}
                          </Badge>
                          <span className="text-sm text-slate-600">{log.message_type}</span>
                        </div>
                        <p className="text-sm font-medium">{log.to_number}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{log.message_body}</p>
                        {log.error_message && (
                          <p className="text-xs text-red-600">{log.error_message}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="call-logs">
            <Card>
              <CardHeader>
                <CardTitle>Voice Call Logs</CardTitle>
                <CardDescription>Recent voice calls made through the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {callLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between border-b pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.status === "completed" ? "default" : "secondary"}>
                            {log.status}
                          </Badge>
                          <span className="text-sm text-slate-600">{log.call_type}</span>
                        </div>
                        <p className="text-sm font-medium">{log.to_number}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{log.message_content}</p>
                        {log.duration > 0 && (
                          <p className="text-xs text-slate-500">Duration: {log.duration}s</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Communication Settings</CardTitle>
                <CardDescription>Configure your Twilio integration settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Twilio credentials are configured via environment variables. Your Twilio phone number is active and ready to use.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Webhook Configuration</h3>
                  <p className="text-sm text-slate-600">
                    Configure your Twilio phone number to send incoming SMS to:
                  </p>
                  <code className="block bg-slate-100 p-2 rounded text-xs">
                    {process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/twilio-sms-webhook
                  </code>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Supported Features</h3>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                    <li>Outbound SMS messages</li>
                    <li>Outbound voice calls</li>
                    <li>Inbound SMS processing</li>
                    <li>Two-way SMS conversations</li>
                    <li>Emergency alert keywords</li>
                    <li>Automatic response handling</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
