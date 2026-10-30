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

    // 1. inquiry_messages テーブルに管理者メッセージを追加
    const { error: msgError } = await supabase
      .from('inquiry_messages')
      .insert({
        inquiry_id: inquiryId,
        sender_type: 'admin',
        message: replyMessage,
      });

    if (msgError) throw msgError;

    // 2. contact_inquiries のステータスを更新
    const { error: inqError } = await supabase
      .from('contact_inquiries')
      .update({
        status: status || 'completed',
        admin_reply: replyMessage,
        replied_at: new Date().toISOString(),
      })
      .eq('id', inquiryId);

    if (inqError) throw inqError;

    // 3. ユーザーへ回答到着の通知メールを送信
    if (process.env.SENDGRID_API_KEY && userEmail) {
      const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@namaste-recipe.vercel.app';
      const msg = {
        to: userEmail,
        from: {
          email: senderEmail,
          name: 'NAMASTE 運営事務局',
        },
        replyTo: {
          email: senderEmail,
          name: 'NAMASTE 運営事務局（送信専用）',
        },
        subject: '【NAMASTE】お問い合わせへの新しい回答が届きました',
        text: `NAMASTEをご利用いただきありがとうございます。

お問い合わせいただいた件について、管理者より新しい回答が追加されました。

----------------------------------------
${replyMessage}
----------------------------------------

※このメールアドレスは送信専用です。
※連続してご質問・ご返信がある場合は、NAMASTE内のマイページ（お問い合わせ履歴）よりメッセージをお送りいただけます。

----------------------------------------
NAMASTE 運営事務局
`,
      };
      await sgMail.send(msg);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Reply API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
