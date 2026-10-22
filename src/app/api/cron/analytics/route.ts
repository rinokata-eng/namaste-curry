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
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { count: todayInquiries } = await supabase
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday);

    const { count: weeklyInquiries } = await supabase
      .from("contact_inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    const { count: todayRecipes } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday);

    const { count: weeklyRecipes } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    const { count: totalRecipes } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const dateStr = now.toISOString().split("T")[0];
    const emailText = "NAMASTE Analytics Report (" + dateStr + ")\n\nInquiries Today: " + (todayInquiries || 0) + "\nInquiries 7 Days: " + (weeklyInquiries || 0) + "\n\nRecipes Today: " + (todayRecipes || 0) + "\nRecipes 7 Days: " + (weeklyRecipes || 0) + "\nTotal Active Recipes: " + (totalRecipes || 0);

    const sendgridKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!sendgridKey || !fromEmail) {
      return NextResponse.json({ error: "SendGrid configuration missing" }, { status: 500 });
    }

    sgMail.setApiKey(sendgridKey);
    await sgMail.send({
      to: fromEmail,
      from: fromEmail,
      subject: "【NAMASTE】日次アナリティクスレポート（" + dateStr + "）",
      text: emailText,
    });

    return NextResponse.json({ success: true, message: "Analytics email sent successfully" });
  } catch (err: any) {
    console.error("Analytics Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
