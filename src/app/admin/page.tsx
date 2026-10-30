'use me';
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

type Profile = {
  id: string;
  display_name: string;
  role: string;
  level: string;
  recipe_count: number;
  total_likes: number;
  last_sign_in_at?: string;
  created_at: string;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status?: string;
  admin_reply?: string;
  created_at: string;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'profiles' | 'inquiries'>('inquiries');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profData) setProfiles(profData);

      const { data: inqData } = await supabase.from('contact_inquiries').select('*').order('created_at', { ascending: false });
      if (inqData) setInquiries(inqData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateInquiryStatus = async (inquiryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contact_inquiries')
        .update({ status: newStatus })
        .eq('id', inquiryId);

      if (error) throw error;
      setInquiries(prev => prev.map(item => item.id === inquiryId ? { ...item, status: newStatus } : item));
    } catch (err) {
      alert('ステータスの更新に失敗しました');
    }
  };

  const handleSendReply = async (inquiryId: string, userEmail: string, replyMessage: string) => {
    if (!replyMessage.trim()) return alert('返信内容を入力してください');
    try {
      const res = await fetch('/api/admin/reply-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, userEmail, replyMessage, status: 'completed' }),
      });
      if (!res.ok) throw new Error('送信失敗');
      alert('返信メールを送信し、ステータスを対応完了に更新しました！');
      setInquiries(prev => prev.map(item => item.id === inquiryId ? { ...item, status: 'completed', admin_reply: replyMessage } : item));
    } catch (err) {
      alert('メール送信に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <span className="bg-amber-500 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-md mr-3">ADMIN MODE</span>
            <h1 className="text-2xl font-bold inline-block">NAMASTE 管理者コンソール</h1>
          </div>
          <a href="/" className="bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-lg font-medium transition">
            トップへ戻る
          </a>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'inquiries' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            ✉️ お問い合わせ ({inquiries.length})
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'profiles' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            👥 パルマ管理 ({profiles.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">データを読み込み中...</div>
        ) : activeTab === 'inquiries' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">お問い合わせ一覧</h2>
              <button onClick={fetchData} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg">再読み込み</button>
            </div>
            {inquiries.length === 0 ? (
              <div className="bg-slate-900/50 p-8 text-center text-slate-500 rounded-xl">お問い合わせはありません。</div>
            ) : (
              inquiries.map((inquiry) => (
                <div key={inquiry.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mb-4 shadow-md">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-bold text-amber-400 text-lg mr-2">{inquiry.name || '名称未設定'}</span>
                      <span className="text-sm text-slate-400">({inquiry.email})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{new Date(inquiry.created_at).toLocaleString('ja-JP')}</span>
                      <select
                        value={inquiry.status || 'unresponded'}
                        onChange={(e) => handleUpdateInquiryStatus(inquiry.id, e.target.value)}
                        className="bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="unresponded">🔴 未対応</option>
                        <option value="in_progress">🟡 継続対応中</option>
                        <option value="completed">🟢 対応完了</option>
                      </select>
                    </div>
                  </div>

                  <div className="inline-block bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-md mb-2 font-medium">
                    {inquiry.category || 'お問い合わせ'}
                  </div>
                  <p className="text-slate-200 text-sm whitespace-pre-wrap bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 mb-4">
                    {inquiry.message}
                  </p>

                  {inquiry.admin_reply && (
                    <div className="mb-4 bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-3">
                      <div className="text-xs font-bold text-emerald-400 mb-1">送信済み返信内容:</div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{inquiry.admin_reply}</p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <textarea
                      id={"reply-" + inquiry.id}
                      placeholder="ユーザーへ送信する返信メッセージを入力..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2.5 focus:outline-none focus:border-amber-500 mb-2 resize-y"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const textarea = document.getElementById("reply-" + inquiry.id) as HTMLTextAreaElement;
                          if (textarea && textarea.value) {
                            handleSendReply(inquiry.id, inquiry.email, textarea.value);
                          } else {
                            alert('返信メッセージを入力してください');
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition"
                      >
                        ✉️ メールで返信する
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">パルマ（ユーザー）一覧</h2>
              <button onClick={fetchData} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg">再読み込み</button>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">名前</th>
                    <th className="p-3">権限</th>
                    <th className="p-3">ランク</th>
                    <th className="p-3">投稿/いいね</th>
                    <th className="p-3">登録日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {profiles.map((prof) => (
                    <tr key={prof.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-medium text-amber-400">{prof.display_name || '未設定'}</td>
                      <td className="p-3 text-xs">{prof.role === 'admin' ? '👑 管理者' : '一般'}</td>
                      <td className="p-3 text-xs">{prof.level || '見習い'}</td>
                      <td className="p-3 text-xs">{prof.recipe_count || 0}件 / ❤️ {prof.total_likes || 0}</td>
                      <td className="p-3 text-xs text-slate-500">{new Date(prof.created_at).toLocaleDateString('ja-JP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
