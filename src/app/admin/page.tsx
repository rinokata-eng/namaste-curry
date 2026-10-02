'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type UserProfile = {
  id: string
  username?: string
  email?: string
  rank?: string
  role?: string
  status?: string
  recipe_count?: number
  like_count?: number
  last_login_at?: string
  created_at?: string
}

type RecipeItem = {
  id: string
  title: string
  description?: string
  user_id?: string
  created_at?: string
  author_name?: string
  like_count?: number
  bookmark_count?: number
}

type InquiryItem = {
  id: string
  name?: string
  email?: string
  category?: string
  message?: string
  created_at?: string
}

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'recipes' | 'inquiries'>('users')
  
  const [users, setUsers] = useState<UserProfile[]>([])
  const [recipes, setRecipes] = useState<RecipeItem[]>([])
  const [inquiries, setInquiries] = useState<InquiryItem[]>([])
  
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const RANKS = ['見習い', '一人前', 'ベテラン', '達人', 'マハラジャ']

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (json.users) setUsers(json.users)

      const { data: recipeData, error: recipeErr } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (!recipeErr && recipeData) {
        const formattedRecipes = await Promise.all(
          recipeData.map(async (recipe) => {
            let authorName = recipe.author_name || '名無しバルマ'
            if (recipe.profile_id && !recipe.author_name) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', recipe.profile_id)
                .single()
              if (prof?.username) authorName = prof.username
            }

            const { count: likeCount } = await supabase
              .from('recipe_likes')
              .select('*', { count: 'exact', head: true })
              .eq('recipe_id', recipe.id)

            const { count: bookmarkCount } = await supabase
              .from('recipe_bookmarks')
              .select('*', { count: 'exact', head: true })
              .eq('recipe_id', recipe.id)

            return {
              ...recipe,
              author_name: authorName,
              like_count: likeCount || 0,
              bookmark_count: bookmarkCount || 0,
            }
          })
        )
        setRecipes(formattedRecipes)
      }

      const { data: inquiryData, error: inquiryErr } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (!inquiryErr && inquiryData) {
        setInquiries(inquiryData)
      }

    } catch (err: any) {
      console.error('データ取得エラー:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRank = async (userId: string, newRank: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ rank: newRank }).eq('id', userId)
      if (error) throw error
      setMessage(`ユーザーランクを [${newRank}] に更新しました。`)
      fetchAllData()
    } catch (err: any) {
      alert('更新失敗: ' + err.message)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) throw error
      setMessage(`ユーザー権限を [${newRole}] に更新しました。`)
      fetchAllData()
    } catch (err: any) {
      alert('更新失敗: ' + err.message)
    }
  }

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
      if (error) throw error
      setMessage(`ユーザーのステータスを [${newStatus === 'suspended' ? '利用停止' : '利用中'}] に変更しました。`)
      fetchAllData()
    } catch (err: any) {
      alert('ステータス変更失敗: ' + err.message)
    }
  }

  const handleDeleteUser = async (userId: string, username?: string) => {
    if (!confirm(`本当にバルマ「${username || userId}」を削除しますか？`)) return
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error
      setMessage('バルマユーザーを削除しました。')
      fetchAllData()
    } catch (err: any) {
      alert('削除失敗: ' + err.message)
    }
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('本当にこのレシピを削除しますか？')) return
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
      if (error) throw error
      setMessage('レシピを削除しました。')
      fetchAllData()
    } catch (err: any) {
      alert('削除失敗: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-md border border-amber-500/30">ADMIN MODE</span>
              <h1 className="text-2xl font-bold text-white">NAMASTE 管理者コンソール</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">お問い合わせ管理、レシピ管理、バルマユーザー管理を一元管理します。</p>
          </div>
          <Link className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition text-sm border border-slate-700" href="/">
            トップへ戻る
          </Link>
        </div>

        {message && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-sm font-medium">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition border ${
              activeTab === 'users' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            👥 バルマユーザー管理 ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition border ${
              activeTab === 'recipes' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            🍛 レシピ管理 ({recipes.length})
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition border ${
              activeTab === 'inquiries' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            ✉️ お問い合わせ一覧 ({inquiries.length}件)
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-slate-200 text-lg">
              {activeTab === 'users' && 'バルマユーザー一覧'}
              {activeTab === 'recipes' && '登録レシピ一覧（詳細・統計）'}
              {activeTab === 'inquiries' && 'お問い合わせ内容一覧'}
            </h2>
            <button onClick={fetchAllData} className="text-sm text-amber-400 hover:text-amber-300 font-medium transition flex items-center gap-1">
              🔄 リロード
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">読み込み中...</div>
          ) : (
            <>
              {activeTab === 'users' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                        <th className="p-4">ユーザー名 / ID</th>
                        <th className="p-4">ステータス</th>
                        <th className="p-4">管理権限</th>
                        <th className="p-4">バルマランク</th>
                        <th className="p-4">投稿 / イイネ</th>
                        <th className="p-4">最終ログイン / 登録</th>
                        <th className="p-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {users.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">ユーザーがいません。</td></tr>
                      ) : (
                        users.map((u) => {
                          const isSuspended = u.status === 'suspended'
                          return (
                            <tr key={u.id} className={`hover:bg-slate-800/40 transition ${isSuspended ? 'opacity-50 bg-rose-950/10' : ''}`}>
                              <td className="p-4">
                                <div className="font-bold text-white flex items-center gap-2">
                                  {u.username || '名無しのユーザー'}
                                  {isSuspended && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">利用停止中</span>}
                                </div>
                                <div className="text-xs text-slate-500 font-mono">{u.id}</div>
                              </td>
                              <td className="p-4">
                                <select
                                  value={u.status || 'active'}
                                  onChange={(e) => handleUpdateStatus(u.id, e.target.value)}
                                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold focus:outline-none ${
                                    isSuspended ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                  }`}
                                >
                                  <option value="active" className="bg-slate-900 text-emerald-300">🟢 利用中</option>
                                  <option value="suspended" className="bg-slate-900 text-rose-300">🔴 利用停止</option>
                                </select>
                              </td>
                              <td className="p-4">
                                <select
                                  value={u.role || 'user'}
                                  onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold focus:outline-none ${
                                    (u.role || 'user') === 'admin' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  <option value="admin" className="bg-slate-900 text-rose-300">admin (管理者)</option>
                                  <option value="user" className="bg-slate-900 text-slate-300">user (一般)</option>
                                </select>
                              </td>
                              <td className="p-4">
                                <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
                                  {u.rank || '見習い'}
                                </span>
                              </td>
                              <td className="p-4 text-xs">
                                <div className="font-semibold text-slate-200">投稿: {u.recipe_count ?? 0}件</div>
                                <div className="font-semibold text-rose-400">❤️ {u.like_count ?? 0}</div>
                              </td>
                              <td className="p-4 text-xs space-y-1">
                                <div className="text-slate-300">イン: {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '未記録'}</div>
                                <div className="text-slate-500">登録: {u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</div>
                              </td>
                              <td className="p-4 text-right space-x-2 flex items-center justify-end">
                                <select
                                  value={u.rank || '見習い'}
                                  onChange={(e) => handleUpdateRank(u.id, e.target.value)}
                                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 focus:outline-none"
                                >
                                  {RANKS.map((rank) => (
                                    <option key={rank} value={rank} className="bg-slate-900 text-slate-200">{rank}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="px-3 py-1.5 bg-rose-500/20 text-rose-300 font-bold rounded-xl text-xs hover:bg-rose-500/30 transition border border-rose-500/30"
                                >
                                  削除
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'recipes' && (
                <div className="p-6 space-y-4">
                  {recipes.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">登録されたレシピがありません。</div>
                  ) : (
                    recipes.map((r) => (
                      <div key={r.id} className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-white">{r.title}</h3>
                            <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
                              投稿: {r.author_name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{r.description || '説明文なし'}</p>
                          <div className="text-xs text-slate-500 pt-1">
                            登録日時: {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 self-end md:self-center">
                          <div className="flex items-center gap-4 text-sm font-semibold">
                            <span className="text-rose-400 flex items-center gap-1">❤️ いいね: {r.like_count}</span>
                            <span className="text-amber-400 flex items-center gap-1">⭐ お気に入り: {r.bookmark_count}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteRecipe(r.id)}
                            className="px-4 py-2 bg-rose-500/20 text-rose-300 font-bold rounded-xl text-xs hover:bg-rose-500/30 transition border border-rose-500/30"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'inquiries' && (
                <div className="p-6 space-y-4">
                  {inquiries.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">お問い合わせはありません。</div>
                  ) : (
                    inquiries.map((inq) => (
                      <div key={inq.id} className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/30">
                              {inq.category || 'お問い合わせ'}
                            </span>
                            <span className="text-sm font-bold text-slate-200">{inq.name || '匿名'} ({inq.email || 'メールなし'})</span>
                          </div>
                          <span className="text-xs text-slate-400">
                            問い合わせ日時: {inq.created_at ? new Date(inq.created_at).toLocaleString() : '-'}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl text-slate-300 text-sm border border-slate-800 whitespace-pre-wrap">
                          {inq.message || '内容がありません。'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
