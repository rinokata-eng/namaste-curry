'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('サービスについて');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.email) setEmail(user.email);

        const metaName =
          user.user_metadata?.baruma_name ||
          user.user_metadata?.username ||
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name;

        if (metaName) {
          setName(metaName);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          const profileName =
            profile.baruma_name ||
            profile.username ||
            profile.display_name ||
            profile.name;
          if (profileName) {
            setName(profileName);
          }
        }
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      // 1. Supabaseのcontact_inquiriesテーブルへ保存（管理画面閲覧用）
      const { error: dbError } = await supabase
        .from('contact_inquiries')
        .insert([{ name, email, category, message }]);

      if (dbError) throw dbError;

      // 2. SendGrid通知用APIの呼び出し（メール通知用）
      const fullMessage = `【種別】${category}\n\n${message}`;
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: fullMessage }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'メール送信に失敗しました');
      }

      setStatus('success');
      setMessage('');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || '送信中にエラーが発生しました。');
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← トップに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-white">お問い合わせ</h1>

      {status === 'success' && (
        <div className="p-4 mb-6 text-green-300 bg-green-900/50 border border-green-500 rounded-lg">
          お問い合わせを受け付けました。メッセージありがとうございました！
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 mb-6 text-red-300 bg-red-900/50 border border-red-500 rounded-lg">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">バルマ名</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="バルマ名"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">メールアドレス</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="example@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">お問い合わせ種別</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="サービスについて" className="bg-gray-900 text-white">サービスについて</option>
            <option value="バグ・不具合のご報告" className="bg-gray-900 text-white">バグ・不具合のご報告</option>
            <option value="ご意見・ご要望" className="bg-gray-900 text-white">ご意見・ご要望</option>
            <option value="その他" className="bg-gray-900 text-white">その他</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">お問い合わせ内容</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="お問い合わせ内容をご記入ください"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? '送信中...' : '送信する'}
        </button>
      </form>
    </main>
  );
}
