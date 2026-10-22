import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. お問い合わせ集計
    const { count: todayInquiries } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    const { count: weeklyInquiries } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    // 2. レシピ＆エンゲージメント集計
    const { count: todayPV } = await supabase
      .from('recipe_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    const { count: weeklyPV } = await supabase
      .from('recipe_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: todayRecipes } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    const { count: weeklyRecipes } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    // 3. メール本文の作成
    const dateStr = now.toISOString().split('T')[0];
    const emailText = `
NAMASTE 運営事務局様

本日のサイト利用状況をお知らせします。（${dateStr}）

----------------------------------------
■ お問い合わせ (Inquiries)
----------------------------------------
・本日の新規件数： ${todayInquiries || 0} 件
・直近7日間の件数： ${weeklyInquiries || 0} 件

----------------------------------------
■ レシピエンゲージメント (Engagement)
----------------------------------------
・本日閲覧数 (PV)： ${todayPV || 0} 回
・直近7日間の閲覧数 (PV)： ${weeklyPV || 0} 回
・本日の新規レシピ投稿： ${todayRecipes || 0} 件
・直近7日間の新規レシピ投稿： ${weeklyRecipes || 0} 件

----------------------------------------
管理画面はこちら：
https://namaste-curry-seven.vercel.app/admin
    `.trim();

    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: process.env.SENDGRID_FROM_EMAIL!,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `【NAMASTE】日次アナリティクスレポート（${dateStr}）`,
      text: emailText,
    });

    return NextResponse.json({ success: true, message: 'Analytics email sent successfully' });
  } catch (err: any) {
    console.error('Analytics Cron Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
