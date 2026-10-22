import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase URL or Key is missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. お問い合わせ集計
    const { count: todayInquiries } = await supabase
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday);

    const { count: yesterdayInquiries } = await supabase
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYesterday)
      .lt("created_at", startOfToday);

    const { count: weeklyInquiries } = await supabase
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    const { count: pendingInquiries } = await supabase
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: totalInquiries } = await supabase
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true });

    // 2. レシピデータから総PV数・総いいね数を直接集計
    const { data: recipeStats } = await supabase
      .from("recipes")
      .select("pv_count, likes_count")
      .is("deleted_at", null);

    const totalPV = recipeStats ? recipeStats.reduce((sum, r) => sum + (r.pv_count || 0), 0) : 0;
    const totalLikes = recipeStats ? recipeStats.reduce((sum, r) => sum + (r.likes_count || 0), 0) : 0;

    // いいねの過去ログ集計
    const { count: todayLikes } = await supabase
      .from("recipe_likes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday);

    const { count: yesterdayLikes } = await supabase
      .from("recipe_likes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYesterday)
      .lt("created_at", startOfToday);

    const { count: weeklyLikes } = await supabase
      .from("recipe_likes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    // お気に入り保存数
    const { count: totalFavorites } = await supabase
      .from("recipe_bookmarks")
      .select("*", { count: "exact", head: true });

    const { count: todayFavorites } = await supabase
      .from("recipe_bookmarks")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday);

    const { count: yesterdayFavorites } = await supabase
      .from("recipe_bookmarks")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYesterday)
      .lt("created_at", startOfToday);

    const { count: weeklyFavorites } = await supabase
      .from("recipe_bookmarks")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    // レシピ新規投稿数
    const { count: todayRecipes } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday);

    const { count: yesterdayRecipes } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYesterday)
      .lt("created_at", startOfToday);

    const { count: weeklyRecipes } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    // 3. ユーザーアクティビティ
    const { count: todayUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday);

    const { count: yesterdayUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYesterday)
      .lt("created_at", startOfToday);

    const { count: weeklyUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const formatDiff = (today: number = 0, yesterday: number = 0) => {
      const diff = today - yesterday;
      return diff >= 0 ? `+${diff}` : `${diff}`;
    };

    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

    const emailText = [
      "NAMASTE 運営事務局様",
      "",
      "本日のサイト利用状況をお知らせします。",
      "",
      "----------------------------------------",
      "■ お問い合わせ (Inquiries)",
      "----------------------------------------",
      `・新規お問い合わせ： ${todayInquiries || 0} 件\n  （前日比: ${formatDiff(todayInquiries || 0, yesterdayInquiries || 0)}件 / 過去7日間: ${weeklyInquiries || 0}件）`,
      `・未対応ステータス： ${pendingInquiries || 0} 件`,
      `・累計お問い合わせ数： ${totalInquiries || 0} 件`,
      "",
      "----------------------------------------",
      "■ レシピエンゲージメント (Engagement)",
      "----------------------------------------",
      `・総PV数（ページ閲覧）： ${totalPV} 回\n  （前日比: +0回 / 過去7日間: +0回）`,
      `・総いいね数： ${totalLikes} 件\n  （前日比: ${formatDiff(todayLikes || 0, yesterdayLikes || 0)}件 / 過去7日間: +${weeklyLikes || 0}件）`,
      `・総お気に入り保存数： ${totalFavorites || 0} 件\n  （前日比: ${formatDiff(todayFavorites || 0, yesterdayFavorites || 0)}件 / 過去7日間: +${weeklyFavorites || 0}件）`,
      `・新規レシピ投稿数： ${todayRecipes || 0} 件\n  （前日比: ${formatDiff(todayRecipes || 0, yesterdayRecipes || 0)}件 / 過去7日間: +${weeklyRecipes || 0}件）`,
      "",
      "----------------------------------------",
      "■ ユーザーアクティビティ (Users)",
      "----------------------------------------",
      `・新規会員登録： ${todayUsers || 0} 名\n  （前日比: ${formatDiff(todayUsers || 0, yesterdayUsers || 0)}名 / 過去7日間: +${weeklyUsers || 0}名）`,
      `・累計会員数： ${totalUsers || 0} 名`,
      "",
      "----------------------------------------",
      "管理画面はこちら：",
      "https://namaste-curry-seven.vercel.app/admin"
    ].join("\n");

    const sendgridKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!sendgridKey || !fromEmail) {
      return NextResponse.json({ error: "SendGrid configuration missing" }, { status: 500 });
    }

    sgMail.setApiKey(sendgridKey);
    await sgMail.send({
      to: fromEmail,
      from: fromEmail,
      subject: `【NAMASTE】日次アナリティクスレポート（${dateStr}）`,
      text: emailText,
    });

    return NextResponse.json({ success: true, message: "Analytics email sent successfully" });
  } catch (err: any) {
    console.error("Analytics Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
