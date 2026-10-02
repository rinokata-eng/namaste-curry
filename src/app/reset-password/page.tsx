'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      alert('パスワードが一致しません。')
      return
    }

    if (newPassword.length < 6) {
      alert('パスワードは6文字以上で入力してください。')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      alert('パスワードを正常に変更しました！新しいパスワードでログインしてください。')
      router.push('/login')
    } catch (err: any) {
      alert('パスワードの更新に失敗しました: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-md border border-amber-200 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-amber-900">🔑 新しいパスワードの設定</h1>
          <p className="text-xs text-amber-700">新しく設定するパスワードを入力してください</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">新しいパスワード</label>
            <input
              type="password"
              required
              placeholder="6文字以上のパスワード"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">新しいパスワード (確認用)</label>
            <input
              type="password"
              required
              placeholder="もう一度入力してください"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-2xl shadow-md transition text-sm disabled:opacity-50 mt-2"
          >
            {loading ? '更新中...' : 'パスワードを変更して保存'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link href="/login" className="text-xs text-amber-700 font-bold hover:underline">
            ← ログイン画面へ戻る
          </Link>
        </div>
      </div>
    </main>
  )
}
