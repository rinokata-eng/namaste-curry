import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { inquiryId, userEmail, replyMessage, status } = await req.json();

    if (!inquiryId || !replyMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SendGridでユーザーへメール送信
    if (process.env.SENDGRID_API_KEY && userEmail) {
      const msg = {
        to: userEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@namaste-recipe.vercel.app',
        subject: '【NAMASTE】お問い合わせへの回答のご案内',
        text: `NAMASTEをご利用いただきありがとうございます。\n\nお問い合わせいただいた件について、管理者より回答いたします。\n\n----------------------------------------\n${replyMessage}\n----------------------------------------\n\n引き続きNAMASTEをよろしくお願いいたします。`,
      };
      await sgMail.send(msg);
    }

    // DBのステータスと返信内容を更新
    const { error } = await supabase
      .from('contact_inquiries')
      .update({
        status: status || 'completed',
        admin_reply: replyMessage,
        replied_at: new Date().toISOString(),
      })
      .eq('id', inquiryId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Reply API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
