import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    })

    // Auth ユーザー一覧からメールアドレスを正確にマッピング
    let authUsersMap: Record<string, string> = {}
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
      if (authData && authData.users) {
        authData.users.forEach((u) => {
          if (u.id && u.email) {
            authUsersMap[u.id] = u.email
          }
        })
      }
    } catch (e) {
      // 権限エラー時はスキップ
    }

    // profiles データの取得
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileError) throw profileError

    // 各ユーザーのレシピ数、イイネ数、メールアドレスを統合
    const formattedUsers = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: recipes } = await supabaseAdmin
          .from('recipes')
          .select('id')
          .eq('user_id', profile.id)

        const recipeCount = recipes ? recipes.length : 0

        let totalLikes = 0
        if (recipes && recipes.length > 0) {
          const recipeIds = recipes.map((r) => r.id)
          const { count: likeCount } = await supabaseAdmin
            .from('recipe_likes')
            .select('*', { count: 'exact', head: true })
            .in('recipe_id', recipeIds)

          if (likeCount !== null) {
            totalLikes = likeCount
          }
        }

        return {
          ...profile,
          email: authUsersMap[profile.id] || profile.email || 'メール未登録',
          recipe_count: recipeCount,
          like_count: totalLikes,
        }
      })
    )

    return NextResponse.json({ users: formattedUsers })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
