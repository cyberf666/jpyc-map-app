// src/components/OnlineMerchantsTab.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { OnlineMerchant } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { dummyOnlineMerchants } from '@/lib/dummyData';

// ダミーデータを使用するかどうかのフラグ（Supabase未設定時はtrue）
const USE_DUMMY_DATA = false;

export default function OnlineMerchantsTab() {
  const [merchants, setMerchants] = useState<OnlineMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');

  // データを取得
  useEffect(() => {
    async function fetchMerchants() {
      try {
        setLoading(true);

        if (USE_DUMMY_DATA || !supabase) {
          // ダミーデータを使用
          setMerchants(dummyOnlineMerchants);
        } else {
          // Supabaseから取得
          const { data, error } = await supabase
            .from('online_merchants')
            .select('*')
            .eq('status', 'approved');

          if (error) throw error;
          setMerchants(data || []);
        }
      } catch (err) {
        setError('オンライン事業者データの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchMerchants();
  }, []);

  // サービスタイプの一覧を取得
  const serviceTypes = useMemo(() => {
    const types = new Set(merchants.map((m) => m.service_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [merchants]);

  // フィルタリング
  const filteredMerchants = useMemo(() => {
    return merchants.filter((merchant) => {
      // 検索クエリでフィルタ
      const matchesSearch =
        !searchQuery ||
        merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // サービスタイプでフィルタ
      const matchesType =
        selectedServiceType === 'all' || merchant.service_type === selectedServiceType;

      return matchesSearch && matchesType;
    });
  }, [merchants, searchQuery, selectedServiceType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 検索・フィルター */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 検索ボックス */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="サービス名、説明、タグで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* サービスタイプフィルター */}
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              サービスタイプ
            </label>
            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">すべて</option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 結果件数 */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {filteredMerchants.length}件のサービスが見つかりました
      </div>

      {/* カード一覧 */}
      {filteredMerchants.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500">
          <p>条件に一致するサービスが見つかりませんでした</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMerchants.map((merchant) => (
            <div
              key={merchant.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* カードヘッダー */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {merchant.name}
                  </h3>
                  {merchant.service_type && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs rounded-full">
                      {merchant.service_type}
                    </span>
                  )}
                </div>

                {merchant.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {merchant.description}
                  </p>
                )}
              </div>

              {/* カードボディ */}
              <div className="p-6 space-y-4">
                {/* JPYCの使い方 */}
                {merchant.jpyc_use_case && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      JPYC利用方法
                    </span>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {merchant.jpyc_use_case}
                    </p>
                  </div>
                )}

                {/* プラットフォーム */}
                {merchant.platforms && merchant.platforms.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      対応プラットフォーム
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {merchant.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* タグ */}
                {merchant.tags && merchant.tags.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      タグ
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {merchant.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200 text-xs rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 国 */}
                {merchant.country && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    対応国: {merchant.country}
                  </div>
                )}
              </div>

              {/* カードフッター */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                <a
                  href={merchant.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  サイトを訪問
                  <svg
                    className="ml-2 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
