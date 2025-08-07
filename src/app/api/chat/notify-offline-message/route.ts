import { NextRequest, NextResponse } from 'next/server';
import { sendOfflineMessageNotificationEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, fromName, messageText, conversationUrl } = body;
    console.log("Received body:", body);
    if (!to || !fromName || !messageText) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }


    await sendOfflineMessageNotificationEmail(
      to,
      fromName,
      messageText,
      conversationUrl
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending offline message notification email:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
