'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// 確実に画面前面（下側）へ表示される視認性の高いカスタムツールチップ
function Tooltip({ label, info }: { label: string; info: string }) {
  return (
    <span className="relative group inline-flex items-center gap-1 cursor-help py-1">
      <span className="font-bold">{label}</span>
      <span className="text-[10px] text-amber-400 bg-amber-500/20 border border-amber-500/40 w-4 h-4 rounded-full flex items-center justify-center font-bold">?</span>
      
      {/* ホバー時に下側に表示されるくっきりとした吹き出し */}
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:block w-52 p-2.5 bg-slate-900 text-amber-200 text-[11px] rounded-xl border border-amber-500/50 shadow-2xl z-[9999] pointer-events-none font-normal leading-relaxed text-left whitespace-normal">
        {info}
      </span>
    </span>
  )
}

export default function AdminConsolePage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [follows, setFollows] = useState<any[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // タブ管理
  const [activeTab, setActiveTab] = useState<'users_manage' | 'users_analytics' | 'recipes' | 'analytics' | 'inquiries'>('users_manage')

  // レシピフィルター＆ソート
  const [recipeSortKey, setRecipeSortKey] = useState<string>('created_at')
  const [recipeGenreFilter, setRecipeGenreFilter] = useState<string>('all')
  const [recipeSearchQuery, setRecipeSearchQuery] = useState<string>('')

  // バルマ分析ソート
  const [userSortKey, setUserSortKey] = useState<string>('total_likes')

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    setLoading(true)
    const [
      { data: rData },
      { data: pData },
      { data: inqData },
      { data: eData },
      { data: fData },
      { data: bData }
    ] = await Promise.all([
      supabase.from('recipes').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('inquiries').select('*').order('created_at', { ascending: false }),
      supabase.from('recipe_evaluations').select('*'),
      supabase.from('follows').select('*'),
      supabase.from('recipe_bookmarks').select('*')
    ])

    const recipesList = rData || []
    const profilesList = pData || []
    const evalsList = eData || []
    const followsList = fData || []
    const bookmarksList = bData || []

    setInquiries(inqData || [])
    setEvaluations(evalsList)
    setFollows(followsList)
    setBookmarks(bookmarksList)

    // レシピデータ拡張
    const processedRecipes = recipesList.map((r: any) => {
      const rEvals = evalsList.filter((e: any) => e.recipe_id === r.id)
      const bmCount = bookmarksList.filter((b: any) => b.recipe_id === r.id).length

      const calcAvg = (key: string) => {
        if (rEvals.length === 0) return 3
        return Math.round((rEvals.reduce((a, b) => a + (b[key] || 3), 0) / rEvals.length) * 10) / 10
      }

      const pv = r.pv_count || 0
      const likes = r.likes_count || 0
      const engagementRate = pv > 0 ? Math.round(((likes + bmCount) / pv) * 1000) / 10 : 0

      return {
        ...r,
        pv_count: pv,
        likes_count: likes,
        bookmarks_count: bmCount,
        engagement_rate: engagementRate,
        eval_count: rEvals.length,
        avg_taste: calcAvg('score_taste'),
        avg_effort: calcAvg('score_effort'),
        avg_ingredients: calcAvg('score_ingredients'),
        avg_spiciness: calcAvg('score_spiciness'),
        avg_style: calcAvg('score_style'),
        author_display: r.author_name || 'たかのり'
      }
    })

    setRecipes(processedRecipes)

    // バルマデータ拡張
    const processedUsers = profilesList.map((u: any) => {
      const userRecipes = processedRecipes.filter((r: any) => r.profile_id === u.id)
      const postCount = userRecipes.length
      const totalLikes = userRecipes.reduce((sum: number, r: any) => sum + (r.likes_count || 0), 0)
      const totalPv = userRecipes.reduce((sum: number, r: any) => sum + (r.pv_count || 0), 0)
      const followersCount = followsList.filter((f: any) => f.following_id === u.id).length

      let rank = u.balma_rank || '見習い'
      if (!u.balma_rank) {
        if (postCount >= 10 || totalLikes >= 50) rank = 'マハラジャ'
        else if (postCount >= 3) rank = 'シェフ'
      }

      return {
        ...u,
        status: u.status || '利用中',
        role: u.role || 'user(一般)',
        balma_rank: rank,
        post_count: postCount,
        total_likes: totalLikes,
        total_pv: totalPv,
        followers_count: followersCount,
      }
    })

    setUsers(processedUsers)
    setLoading(false)
  }

  const handleUpdateProfile = async (userId: string, updates: Record<string, any>) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error) {
      alert('更新に失敗しました: ' + error.message)
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u))
    }
  }

  const handleDeleteRecipe = async (recipeId: string, title: string) => {
    if (!confirm(`本当に「${title}」を削除しますか？\nこの操作は取り消せません。`)) return

    const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
    if (error) {
      alert('削除に失敗しました: ' + error.message)
    } else {
      alert('レシピを削除しました。')
      setRecipes(recipes.filter(r => r.id !== recipeId))
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`本当にバルマ「${username || 'ユーザー'}」を削除しますか？\nこのバルマの投稿レシピや関連データも影響を受けます。`)) return

    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) {
      alert('削除に失敗しました: ' + error.message)
    } else {
      alert('バルマを削除しました。')
      setUsers(users.filter(u => u.id !== userId))
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }

  const filteredRecipes = recipes
    .filter((r) => {
      const matchGenre = recipeGenreFilter === 'all' || r.genre === recipeGenreFilter
      const matchSearch = r.title?.includes(recipeSearchQuery) || r.author_display?.includes(recipeSearchQuery)
      return matchGenre && matchSearch
    })
    .sort((a, b) => {
      if (recipeSortKey === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return (b[recipeSortKey] || 0) - (a[recipeSortKey] || 0)
    })

  const sortedUsers = [...users].sort((a, b) => {
    if (userSortKey === 'created_at') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
    return (b[userSortKey] || 0) - (a[userSortKey] || 0)
  })

  const genres = ['スパイスカレー', '欧風カレー', 'キーマカレー', 'インドカレー', 'スープカレー', 'その他']
  const genreStats = genres.map((g) => {
    const list = recipes.filter((r) => r.genre === g)
    const count = list.length
    const avgPv = count > 0 ? Math.round(list.reduce((sum, r) => sum + r.pv_count, 0) / count) : 0
    const avgLikes = count > 0 ? Math.round((list.reduce((sum, r) => sum + r.likes_count, 0) / count) * 10) / 10 : 0
    const avgTaste = count > 0 ? Math.round((list.reduce((sum, r) => sum + r.avg_taste, 0) / count) * 10) / 10 : 3
    return { genre: g, count, avgPv, avgLikes, avgTaste }
  })

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-200 p-10 flex justify-center items-center text-sm">
        管理コンソールデータを読み込み中... 👳‍♂️
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-500/30 font-bold">
                ADMIN MODE
              </span>
              <h1 className="text-2xl font-black text-white">NAMASTE 管理者コンソール</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">お問い合わせ管理、レシピ管理、バルマ管理を一元管理します。（項目名横の「?」にカーソルを合わせると説明が出ます）</p>
          </div>
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition font-bold">
            トップへ戻る
          </Link>
        </div>

        {/* メインタブ切り替えボタン */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('users_manage')}
            className={`py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'users_manage' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            👥 バルマ管理 ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('users_analytics')}
            className={`py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'users_analytics' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📈 バルマ分析
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'recipes' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🍛 レシピ管理・分析 ({recipes.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'analytics' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📊 トレンド分析
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'inquiries' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ✉️ お問い合わせ ({inquiries.length})
          </button>
        </div>

        {/* --- TAB 1: バルマ管理 --- */}
        {activeTab === 'users_manage' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
              <h2 className="text-sm font-bold text-slate-200">バルマ一覧</h2>
              <button
                onClick={loadAdminData}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition font-bold flex items-center gap-1.5 cursor-pointer"
              >
                🔄 リロード
              </button>
            </div>

            <div className="bg-slate-900/60 rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 relative z-20">
                  <tr>
                    <th className="p-3"><Tooltip label="バルマ名 / ID" info="バルマ（ユーザー）の表示名およびデータベース上の一意なID" /></th>
                    <th className="p-3"><Tooltip label="ステータス" info="アカウントの利用状態（利用中 / 停止中）" /></th>
                    <th className="p-3"><Tooltip label="管理権限" info="システム上の操作権限（一般ユーザー / 管理者）" /></th>
                    <th className="p-3 text-center"><Tooltip label="バルマランク" info="投稿数や獲得いいね数に応じた称号（見習い / シェフ / マハラジャ）" /></th>
                    <th className="p-3 text-center"><Tooltip label="投稿 / イネ" info="投稿したレシピ件数と全レシピの獲得いいね合計" /></th>
                    <th className="p-3"><Tooltip label="最終ログイン / 登録" info="最後のログイン日時および新規登録日時" /></th>
                    <th className="p-3 text-center"><Tooltip label="操作" info="ランク変更やアカウントの削除操作" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 space-y-1">
                        <Link href={`/users/${u.id}`} className="font-bold text-white hover:text-amber-400 transition">
                          {u.username || 'たかのり'}
                        </Link>
                        <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">{u.id}</p>
                      </td>

                      <td className="p-3">
                        <select
                          value={u.status || '利用中'}
                          onChange={(e) => handleUpdateProfile(u.id, { status: e.target.value })}
                          className="bg-slate-950 text-emerald-400 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] font-bold outline-none cursor-pointer"
                        >
                          <option value="利用中">🟢 利用中</option>
                          <option value="停止中">🔴 停止中</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <select
                          value={u.role || 'user(一般)'}
                          onChange={(e) => handleUpdateProfile(u.id, { role: e.target.value })}
                          className="bg-slate-950 text-slate-300 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] font-bold outline-none cursor-pointer"
                        >
                          <option value="user(一般)">user (一般)</option>
                          <option value="admin(管理者)">admin (管理者)</option>
                        </select>
                      </td>

                      <td className="p-3 text-center">
                        <span className="inline-block bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-[11px] font-bold">
                          {u.balma_rank}
                        </span>
                      </td>

                      <td className="p-3 text-center space-y-0.5">
                        <p className="text-slate-300 font-bold">投稿: {u.post_count}件</p>
                        <p className="text-rose-400 font-bold">❤️ {u.total_likes}</p>
                      </td>

                      <td className="p-3 text-[10px] text-slate-400 space-y-0.5 leading-tight">
                        <p>イン: {formatDate(u.last_login_at || u.created_at)}</p>
                        <p>登録: {formatDate(u.created_at)}</p>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <select
                            value={u.balma_rank}
                            onChange={(e) => handleUpdateProfile(u.id, { balma_rank: e.target.value })}
                            className="bg-slate-950 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
                          >
                            <option value="見習い">見習い</option>
                            <option value="シェフ">シェフ</option>
                            <option value="マハラジャ">マハラジャ</option>
                          </select>

                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-800/80 transition font-bold text-[11px] cursor-pointer"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2: バルマ分析 --- */}
        {activeTab === 'users_analytics' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-wrap gap-2 items-center text-xs">
              <span className="text-slate-400 font-bold">並び替え:</span>
              {[
                { key: 'total_likes', label: '❤️ 獲得いいね総数順' },
                { key: 'post_count', label: '📝 投稿レシピ数順' },
                { key: 'total_pv', label: '👀 レシピ総PV順' },
                { key: 'followers_count', label: '👥 フォロワー数順' },
                { key: 'created_at', label: '🕒 登録日順' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setUserSortKey(item.key)}
                  className={`px-3 py-1.5 rounded-lg border transition font-bold cursor-pointer ${
                    userSortKey === item.key
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-900/60 rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 relative z-20">
                  <tr>
                    <th className="p-3"><Tooltip label="バルマ名 / ID" info="バルマの表示名および一意のID" /></th>
                    <th className="p-3 text-center"><Tooltip label="バルマランク" info="実績に応じた階級称号（見習い / シェフ / マハラジャ）" /></th>
                    <th className="p-3 text-center"><Tooltip label="📝 投稿数" info="このバルマが作成・投稿したレシピの件数" /></th>
                    <th className="p-3 text-center"><Tooltip label="❤️ 獲得いいね総数" info="投稿した全レシピで獲得した『いいね』の総合計" /></th>
                    <th className="p-3 text-center"><Tooltip label="👀 投稿レシピ総PV" info="投稿した全レシピが開かれた通算アクセス回数の合計" /></th>
                    <th className="p-3 text-center"><Tooltip label="👥 フォロワー数" info="このバルマをフォローしているファンの人数" /></th>
                    <th className="p-3 text-center"><Tooltip label="バルマカード" info="公開マイページへのリンク" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {sortedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 space-y-1">
                        <p className="font-bold text-white">{u.username || 'たかのり'}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">{u.id}</p>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {u.balma_rank}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-amber-400">{u.post_count} 件</td>
                      <td className="p-3 text-center font-bold text-rose-400">{u.total_likes}</td>
                      <td className="p-3 text-center font-bold text-cyan-400">{u.total_pv} PV</td>
                      <td className="p-3 text-center font-bold text-emerald-400">{u.followers_count} 人</td>
                      <td className="p-3 text-center">
                        <Link href={`/users/${u.id}`} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg transition font-bold text-[11px]">
                          マイページ表示 ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 3: レシピ管理・分析 --- */}
        {activeTab === 'recipes' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-wrap gap-3 items-center justify-between text-xs">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-slate-400 font-bold">並び替え:</span>
                {[
                  { key: 'created_at', label: '🕒 登録日時順' },
                  { key: 'pv_count', label: '👀 PV順' },
                  { key: 'likes_count', label: '❤️ いいね順' },
                  { key: 'bookmarks_count', label: '⭐ 保存順' },
                  { key: 'engagement_rate', label: '🔥 反応率順' },
                  { key: 'avg_taste', label: '🌶️ 本格度順' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setRecipeSortKey(item.key)}
                    className={`px-3 py-1.5 rounded-lg border transition font-bold cursor-pointer ${
                      recipeSortKey === item.key
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={recipeGenreFilter}
                  onChange={(e) => setRecipeGenreFilter(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 font-bold outline-none cursor-pointer"
                >
                  <option value="all">全ジャンル</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="レシピ名・投稿者検索..."
                  value={recipeSearchQuery}
                  onChange={(e) => setRecipeSearchQuery(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 font-bold outline-none placeholder-slate-500"
                />
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 relative z-20">
                  <tr>
                    <th className="p-3"><Tooltip label="レシピ名 / 投稿者" info="レシピのタイトルおよび投稿者の表示名" /></th>
                    <th className="p-3"><Tooltip label="ジャンル" info="カレーの分類カテゴリ（スパイス、欧風、キーマ等）" /></th>
                    <th className="p-3 text-center"><Tooltip label="👀 PV" info="詳細ページが開かれた通算回数（ページビュー）" /></th>
                    <th className="p-3 text-center"><Tooltip label="❤️ いいね" info="ユーザーから押された『いいね』の総数" /></th>
                    <th className="p-3 text-center"><Tooltip label="⭐ 保存" info="マイページにお気に入り保存された回数" /></th>
                    <th className="p-3 text-center"><Tooltip label="🔥 反応率" info="閲覧(PV)に対して『いいね・保存』がされた高評価確率 [(いいね+保存)÷PV×100]" /></th>
                    <th className="p-3 text-center"><Tooltip label="🌶 本格度" info="バルマアンケートによる平均本格度スコア (1:家庭的 ↔ 5:本格的)" /></th>
                    <th className="p-3 text-center"><Tooltip label="管理操作" info="レシピ詳細ページの確認および削除操作" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredRecipes.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 space-y-0.5">
                        <p className="font-bold text-white">{r.title}</p>
                        <p className="text-[11px] text-slate-400">投稿者: {r.author_display}</p>
                      </td>
                      <td className="p-3">
                        <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full text-[11px]">
                          {r.genre}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-amber-400">{r.pv_count}</td>
                      <td className="p-3 text-center font-bold text-rose-400">{r.likes_count}</td>
                      <td className="p-3 text-center font-bold text-yellow-400">{r.bookmarks_count}</td>
                      <td className="p-3 text-center font-bold text-cyan-400">{r.engagement_rate}%</td>
                      <td className="p-3 text-center font-bold text-emerald-400">{r.avg_taste} / 5</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/recipes/${r.id}`} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition font-bold text-[11px]">
                            詳細 ↗
                          </Link>
                          <button
                            onClick={() => handleDeleteRecipe(r.id, r.title)}
                            className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-800/80 transition font-bold text-[11px] cursor-pointer"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: トレンド分析 --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                <Tooltip label="総閲覧数 (PV)" info="サイト全体の全レシピの通算閲覧数合計" />
                <p className="text-2xl font-black text-amber-400">{recipes.reduce((a, b) => a + b.pv_count, 0)} <span className="text-xs font-normal text-slate-400">PV</span></p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                <Tooltip label="総いいね数" info="全レシピで押されたいいねの総数" />
                <p className="text-2xl font-black text-rose-400">{recipes.reduce((a, b) => a + b.likes_count, 0)} <span className="text-xs font-normal text-slate-400">いいね</span></p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                <Tooltip label="総お気に入り保存数" info="マイページにブックマーク保存された全総数" />
                <p className="text-2xl font-black text-yellow-400">{bookmarks.length} <span className="text-xs font-normal text-slate-400">保存</span></p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                <Tooltip label="印象アンケート回答総数" info="バルマたちから寄せられた5項目傾向アンケートの回答総数" />
                <p className="text-2xl font-black text-cyan-400">{evaluations.length} <span className="text-xs font-normal text-slate-400">回答</span></p>
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>🍛</span> ジャンル別エンゲージメント＆傾向分析
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {genreStats.map((st, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-400 text-xs">{st.genre}</span>
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{st.count} 件</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-900 text-slate-300">
                      <div><Tooltip label="平均PV" info="1レシピあたりの平均閲覧数" />: <span className="font-bold text-white">{st.avgPv}</span></div>
                      <div><Tooltip label="平均いいね" info="1レシピあたりの平均獲得いいね数" />: <span className="font-bold text-rose-300">{st.avgLikes}</span></div>
                      <div><Tooltip label="本格度" info="平均本格度評価 (1:家庭的 ↔ 5:本格的)" />: <span className="font-bold text-amber-300">{st.avgTaste}/5</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: お問い合わせ一覧 --- */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4">
            {inquiries.length === 0 ? (
              <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                お問い合わせメッセージはありません。
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.map((inq) => (
                  <div key={inq.id} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-amber-400">{inq.name} ({inq.email})</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(inq.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{inq.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
