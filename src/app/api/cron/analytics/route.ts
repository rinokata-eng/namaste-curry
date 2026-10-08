import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { supabase } from '@/lib/supabaseClient';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function GET(request: Request) {
  // CRON保護用セキュリティチェック（任意設定）
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. 全ユーザー数・直近新規登録数の集計
    const { data: profiles } = await supabase.from('profiles').select('created_at');
    const totalUsers = profiles?.length || 0;
    const newUsers24h = profiles?.filter(p => new Date(p.created_at) >= new Date(yesterday)).length || 0;
    const newUsers7d = profiles?.filter(p => new Date(p.created_at) >= new Date(sevenDaysAgo)).length || 0;

    // 2. レシピ総数・獲得エンゲージメント集計
    const { data: recipes } = await supabase.from('recipes').select('pv_count, likes_count');
    const totalRecipes = recipes?.length || 0;
    const totalPv = recipes?.reduce((sum, r) => sum + (r.pv_count || 0), 0) || 0;
    const totalLikes = recipes?.reduce((sum, r) => sum + (r.likes_count || 0), 0) || 0;

    // 3. お問い合わせ総数
    const { data: inquiries } = await supabase.from('contact_inquiries').select('id');
    const totalInquiries = inquiries?.length || 0;

    const reportDate = today.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

    const msg = {
      to: process.env.SENDGRID_FROM_EMAIL!,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `【NAMASTE日次レポート】${reportDate} のアナリティクス速報`,
      text: `
こんにちは！NAMASTEのデイリーアナリティクスレポートです。

■ 👤 ユーザー数の推移
---------------------------------
・累計バルマ（ユーザー）数 : ${totalUsers} 名
・過去24時間の新規登録   : +${newUsers24h} 名
・過去7日間の新規登録    : +${newUsers7d} 名

■ 🍛 レシピ & エンゲージメント
---------------------------------
・累計レシピ投稿数       : ${totalRecipes} 件
・通算総PV (閲覧数)      : ${totalPv} PV
・通算総いいね数         : ${totalLikes} いいね

■ ✉️ お問い合わせ
---------------------------------
・累計お問い合わせ件数   : ${totalInquiries} 件

今日もお疲れ様でした！
管理者コンソール: http://localhost:3000/admin (本番URL)
      `,
    };

    await sgMail.send(msg);

    return NextResponse.json({ success: true, date: reportDate, stats: { totalUsers, newUsers24h, totalPv } });
  } catch (error: any) {
    console.error('Analytics Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
