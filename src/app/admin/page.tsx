'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [recipes, setRecipes] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<'recipes' | 'profiles' | 'inquiries'>('inquiries')

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    if (!stored) {
      alert('管理者権限が必要です。ログインしてください。')
      router.push('/login')
      return
    }

    const user = JSON.parse(stored)
    const isAdmin =
      user.role === 'admin' ||
      user.email === 'rinokata0921+admin@gmail.com' ||
      (user.email && user.email.includes('+admin'))

    if (!isAdmin) {
      alert('管理者権限がありません。')
      router.push('/')
      return
    }

    setCurrentUser(user)
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)

    const { data: recipeData } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (recipeData) setRecipes(recipeData)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileData) setProfiles(profileData)

    const { data: inquiryData } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (inquiryData) setInquiries(inquiryData)

    setLoading(false)
  }

  const handleDeleteRecipe = async (id: string, title: string) => {
    if (!window.confirm(`レシピ「${title}」を削除しますか？`)) return

    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) {
      alert('削除に失敗しました: ' + error.message)
      return
    }
    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  const handleDeleteUser = async (id: string, username: string) => {
    if (!window.confirm(`バルマ「${username}」のプロフィールおよび投稿データを削除しますか？`)) return

    await supabase.from('recipes').delete().eq('profile_id', id)
    const { error } = await supabase.from('profiles').delete().eq('id', id)

    if (error) {
      alert('削除に失敗しました: ' + error.message)
      return
    }

    setProfiles((prev) => prev.filter((p) => p.id !== id))
    alert(`バルマ「${username}」を削除しました。`)
  }

  const handleToggleInquiryStatus = async (inquiry: any) => {
    const nextStatus = inquiry.status === '対応済み' ? '未対応' : '対応済み'
    await supabase.from('inquiries').update({ status: nextStatus }).eq('id', inquiry.id)

    setInquiries((prev) =>
      prev.map((i) => (i.id === inquiry.id ? { ...i, status: nextStatus } : i))
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-amber-100 p-10 flex justify-center items-center text-sm">
        管理者データを読み込み中...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-10 space-y-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <h1 className="text-xl font-black text-amber-400">NAMASTE 管理者コンソール</h1>
          </div>
          <Link href="/" className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 py-2 px-4 rounded-xl font-bold">
            トップへ戻る
          </Link>
        </div>

        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'inquiries' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            ✉️ お問い合わせ一覧 ({inquiries.filter((i) => i.status === '未対応').length}件未対応)
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'recipes' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            🍛 レシピ管理 ({recipes.length})
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'profiles' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            👤 バルマユーザー管理 ({profiles.length})
          </button>
        </div>

        {activeTab === 'inquiries' && (
          <div className="space-y-4">
            {inquiries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">お問い合わせはまだ届いていません。</p>
            ) : (
              inquiries.map((inq) => (
                <div key={inq.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inq.status === '対応済み' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
                      }`}>
                        {inq.status}
                      </span>
                      <h3 className="font-bold text-sm text-amber-300 mt-1">{inq.subject}</h3>
                    </div>
                    <button
                      onClick={() => handleToggleInquiryStatus(inq)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-3 py-1 rounded-lg"
                    >
                      {inq.status === '対応済み' ? '未対応に戻す' : '対応済みにする'}
                    </button>
                  </div>

                  <div className="text-xs text-slate-400 space-x-4">
                    <span>送信者: {inq.sender_name}</span>
                    <span>返信先: {inq.sender_email}</span>
                    <span>日時: {new Date(inq.created_at).toLocaleString()}</span>
                  </div>

                  <p className="text-xs text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 whitespace-pre-wrap leading-relaxed">
                    {inq.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="space-y-3">
            {recipes.map((r) => (
              <div key={r.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs">
                <div>
                  <span className="font-bold text-amber-300">{r.title}</span>
                  <span className="text-slate-400 ml-2">(投稿: {r.author_name})</span>
                </div>
                <button
                  onClick={() => handleDeleteRecipe(r.id, r.title)}
                  className="bg-red-900/80 hover:bg-red-800 text-red-200 font-bold px-3 py-1 rounded-lg"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profiles' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profiles.map((p) => (
              <div key={p.id} className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 text-xs flex justify-between items-center">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-300">{p.username} <span className="text-slate-400 font-normal">({p.rank || '見習い'})</span></div>
                  <div className="text-slate-500 text-[10px] truncate max-w-[200px]">ID: {p.id}</div>
                  {p.role === 'admin' && (
                    <span className="inline-block text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      👑 管理者
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteUser(p.id, p.username)}
                  className="bg-red-900/80 hover:bg-red-800 text-red-200 font-bold px-3 py-1.5 rounded-lg shrink-0"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
