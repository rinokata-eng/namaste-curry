import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    console.log('--- SendGrid Request ---');
    console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
    console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
    console.log('Data received:', { name, email, message });

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: '必須項目が入力されていません。' },
        { status: 400 }
      );
    }

    const msg = {
      to: process.env.SENDGRID_FROM_EMAIL!,
      from: process.env.SENDGRID_FROM_EMAIL!,
      replyTo: email,
      subject: `【NAMASTE】お問い合わせがありました（${name}様）`,
      text: `
バルマ名: ${name}
メールアドレス: ${email}

【お問い合わせ内容】
${message}
      `,
    };

    const res = await sgMail.send(msg);
    console.log('SendGrid Response Status:', res[0].statusCode);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('SendGrid Error details:', error?.response?.body || error);
    return NextResponse.json(
      { error: error?.response?.body?.errors?.[0]?.message || 'メールの送信に失敗しました。' },
      { status: 500 }
    );
  }
}
