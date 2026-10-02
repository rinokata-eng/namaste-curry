import { supabase } from '@/lib/supabase'

// ユーザーの行動（ログイン・レシピ投稿など）に応じてランクを自動計算して更新する関数
export async function checkAndUpgradeRank(userId: string) {
  try {
    // 1. ユーザーのレシピ投稿数を取得
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id')
      .eq('user_id', userId)

    const recipeCount = recipes ? recipes.length : 0

    // 2. ユーザーが投稿したレシピが受け取った累計イイネ数を取得
    let totalLikes = 0
    if (recipes && recipes.length > 0) {
      const recipeIds = recipes.map((r) => r.id)
      const { count: likeCount } = await supabase
        .from('recipe_likes')
        .select('*', { count: 'exact', head: true })
        .in('recipe_id', recipeIds)

      if (likeCount !== null) {
        totalLikes = likeCount
      }
    }

    // 3. 現在のプロフィール情報を取得（現在のランクを確認）
    const { data: profile } = await supabase
      .from('profiles')
      .select('rank')
      .eq('id', userId)
      .single()

    const currentRank = profile?.rank || '見習い'

    // 管理者（マハラジャなど手動設定）の場合は自動で下げないなどの配慮をしつつ判定
    let newRank = '見習い'
    if (recipeCount >= 10 || totalLikes >= 30) {
      newRank = 'マハラジャ'
    } else if (recipeCount >= 5 || totalLikes >= 15) {
      newRank = '達人'
    } else if (recipeCount >= 3 || totalLikes >= 5) {
      newRank = 'ベテラン'
    } else if (recipeCount >= 1) {
      newRank = '一人前'
    }

    // ランクが上がる場合のみ、データベースを更新
    const rankHierarchy = ['見習い', '一人前', 'ベテラン', '達人', 'マハラジャ']
    const currentIndex = rankHierarchy.indexOf(currentRank)
    const newIndex = rankHierarchy.indexOf(newRank)

    if (newIndex > currentIndex) {
      await supabase
        .from('profiles')
        .update({ rank: newRank })
        .eq('id', userId)
    }
  } catch (err) {
    console.error('自動ランクアップ処理エラー:', err)
  }
}
