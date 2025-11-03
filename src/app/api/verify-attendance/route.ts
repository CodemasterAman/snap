
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const supabaseUrl = 'https://zpsexwlosrwlrelrrwls.supabase.co/functions/v1/verify-attendance';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc2V4d2xvc3J3bHJlbHJyd2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzExNjEsImV4cCI6MjA3NzMwNzE2MX0.aR1tdJpvZ7hVS0zq493KbUom_KroL_eH29IgFLgwfIE';

  try {
    const supabaseResponse = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!supabaseResponse.ok) {
      const errorResult = await supabaseResponse.json();
      return NextResponse.json({ message: errorResult.message || 'Verification failed.' }, { status: supabaseResponse.status });
    }

    const result = await supabaseResponse.json();
    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ message: 'An internal server error occurred.', error: error.message }, { status: 500 });
  }
}
