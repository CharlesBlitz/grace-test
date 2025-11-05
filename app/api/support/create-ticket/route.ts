import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const {
      subject,
      description,
      category,
      priority = 'medium',
      userId,
      organizationId,
      practitionerId,
      userEmail,
      userName,
    } = body;

    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, description, or category' },
        { status: 400 }
      );
    }

    if (!userId && !organizationId && !practitionerId && !userEmail) {
      return NextResponse.json(
        { error: 'At least one user identifier must be provided' },
        { status: 400 }
      );
    }

    const ticketData: any = {
      subject,
      description,
      category,
      priority,
      status: 'new',
      user_id: userId || null,
      organization_id: organizationId || null,
      practitioner_id: practitionerId || null,
      user_email: userEmail || null,
      user_name: userName || null,
    };

    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticketData)
      .select('id, ticket_number')
      .single();

    if (error) {
      console.error('Database error creating ticket:', error);
      return NextResponse.json(
        { error: 'Failed to create support ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: data.id,
        ticketNumber: data.ticket_number,
      },
      message: 'Support ticket created successfully',
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
