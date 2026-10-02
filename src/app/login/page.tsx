'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const loginEmail = email.trim()

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('ユーザー情報の取得に失敗しました。')
      }

      const userId = authData.user.id

      const isAdminUser =
        loginEmail === 'rinokata0921+admin@gmail.com' ||
        loginEmail.includes('+admin') ||
        authData.user.user_metadata?.role === 'admin'

      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!profileData) {
        const fallbackUsername = isAdminUser
          ? '管理者事務局'
          : authData.user.user_metadata?.username || loginEmail.split('@')[0]

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              username: fallbackUsername,
              rank: isAdminUser ? 'マハラジャ' : '見習い',
              role: isAdminUser ? 'admin' : 'user',
            },
          ])
          .select()
          .single()

        if (!createError) {
          profileData = newProfile
        }
      }

      if (isAdminUser && profileData && profileData.role !== 'admin') {
        await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', userId)
      }

      const userData = {
        id: userId,
        email: loginEmail,
        username: profileData?.username || (isAdminUser ? '管理者事務局' : loginEmail.split('@')[0]),
        rank: profileData?.rank || (isAdminUser ? 'マハラジャ' : '見習い'),
        role: isAdminUser ? 'admin' : (profileData?.role || 'user'),
        avatar_url: profileData?.avatar_url || '',
        bio: profileData?.bio || '',
      }

      localStorage.setItem('namaste_user', JSON.stringify(userData))

      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)

      alert(`おかえりなさい、${userData.username}さん！`)
      router.push(isAdminUser ? '/admin' : '/')
      router.refresh()
    } catch (err: any) {
      if (err.message.includes('Email not confirmed')) {
        alert('メールアドレスの確認が完了していません。受信トレイの確認リンクをクリックしてください。')
      } else {
        alert('ログインに失敗しました: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // パスワードリセットメール送信
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) return

    setResetLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      })

      if (error) throw error

      setResetSent(true)
    } catch (err: any) {
      alert('リセットメールの送信に失敗しました: ' + err.message)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 relative">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
          ← トップへ戻る
        </Link>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-amber-200 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-amber-900">🔑 バルマログイン</h1>
            <p className="text-xs text-amber-700">おかえりなさい！アカウント情報を入力してください</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">メールアドレス</label>
              <input
                type="email"
                required
                placeholder="例: namaste@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">パスワード</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email)
                    setResetSent(false)
                    setShowResetModal(true)
                  }}
                  className="text-[11px] text-amber-700 hover:underline font-semibold"
                >
                  パスワードをお忘れですか？
                </button>
              </div>
              <input
                type="password"
                required
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-2xl shadow-md transition text-sm disabled:opacity-50 mt-2"
            >
              {loading ? 'ログイン処理中...' : 'ログインする'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-500">
              まだアカウントをお持ちでないですか？{' '}
              <Link href="/users/new" className="text-amber-700 font-bold hover:underline">
                新規バルマ登録はこちら
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* パスワードリセットモーダル */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-amber-200 space-y-4">
            <div className="flex justify-between items-center border-b border-amber-100 pb-2">
              <h3 className="font-bold text-sm text-amber-900">🔒 パスワード再設定</h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {resetSent ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <div className="text-2xl">✉️</div>
                <h4 className="font-bold text-xs text-emerald-900">再設定用リンクを送信しました！</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>{resetEmail}</strong> 宛にメールをお送りしました。メール内のリンクから新しいパスワードを設定してください。
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
                </p>
                <input
                  type="email"
                  required
                  placeholder="例: namaste@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {resetLoading ? '送信中...' : '再設定用メールを送信'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
