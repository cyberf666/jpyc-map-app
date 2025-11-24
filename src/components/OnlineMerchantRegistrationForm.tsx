// src/components/OnlineMerchantRegistrationForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';

// サービス種別選択肢
const SERVICE_TYPES = ['EC', 'サブスク', 'NFT', 'ゲーム', '寄付', 'その他'];

// JPYCの使い道選択肢
const JPYC_USE_CASES = ['決済', 'チャージ', '投げ銭', 'NFT購入', '会費', 'その他'];

// プラットフォーム選択肢
const PLATFORMS = ['Web', 'スマホアプリ', 'Discord', 'メタバース', 'その他'];

// タグ候補
const TAG_SUGGESTIONS = [
  'ショッピング',
  'ゲーム',
  'NFT',
  'DeFi',
  'メタバース',
  '寄付',
  'サブスク',
  '教育',
  'エンタメ',
  '金融',
];

interface MerchantFormData {
  // STEP1
  name: string;
  url: string;
  description: string;
  serviceType: string;
  serviceTypeOther: string;
  country: string;
  // STEP2
  jpycUseCase: string;
  jpycUseCaseOther: string;
  platforms: string[];
  platformOther: string;
  tags: string[];
  customTag: string;
}

const initialFormData: MerchantFormData = {
  name: '',
  url: '',
  description: '',
  serviceType: '',
  serviceTypeOther: '',
  country: '',
  jpycUseCase: '',
  jpycUseCaseOther: '',
  platforms: [],
  platformOther: '',
  tags: [],
  customTag: '',
};

export default function OnlineMerchantRegistrationForm() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<MerchantFormData>(initialFormData);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (field: 'platforms' | 'tags', value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const addCustomTag = () => {
    if (formData.customTag.trim() && !formData.tags.includes(formData.customTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, prev.customTag.trim()],
        customTag: '',
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('サービス名を入力してください');
      return false;
    }
    if (!formData.url.trim()) {
      setError('URLを入力してください');
      return false;
    }
    if (!formData.serviceType) {
      setError('サービス種別を選択してください');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    const useCase = formData.jpycUseCase === 'その他' ? formData.jpycUseCaseOther : formData.jpycUseCase;
    if (!useCase.trim()) {
      setError('JPYCの使い道を選択または入力してください');
      return false;
    }
    if (formData.platforms.length === 0) {
      setError('プラットフォームを1つ以上選択してください');
      return false;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      setError('確認チェックを入れてください');
      return;
    }
    if (!user) {
      setError('ログインが必要です');
      return;
    }
    if (!supabase) {
      setError('Supabaseが設定されていません');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // JPYCの使い道を決定
      const jpycUseCase =
        formData.jpycUseCase === 'その他'
          ? formData.jpycUseCaseOther.trim()
          : formData.jpycUseCase;

      // プラットフォームを結合
      const platforms = formData.platforms.filter((p) => p !== 'その他');
      if (formData.platforms.includes('その他') && formData.platformOther.trim()) {
        platforms.push(formData.platformOther.trim());
      }

      // descriptionに「その他」の内容を追記
      let description = formData.description.trim();
      if (formData.serviceType === 'その他' && formData.serviceTypeOther.trim()) {
        const otherNote = `【サービス種別補足】${formData.serviceTypeOther.trim()}`;
        description = description ? `${description}\n\n${otherNote}` : otherNote;
      }

      const { error: insertError } = await supabase.from('online_merchants').insert({
        name: formData.name.trim(),
        url: formData.url.trim(),
        description: description || null,
        service_type: formData.serviceType,
        country: formData.country.trim() || null,
        jpyc_use_case: jpycUseCase,
        platforms,
        tags: formData.tags.length > 0 ? formData.tags : null,
        status: 'pending',
        created_by: user.id,
      });

      if (insertError) throw insertError;

      setSubmitted(true);
    } catch (err) {
      console.error('登録エラー:', err);
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setStep(1);
    setConfirmed(false);
    setSubmitted(false);
    setError(null);
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          登録申請が完了しました
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          管理者の承認後、一覧に表示されます。
        </p>
        <button
          onClick={resetForm}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          別のサービスを登録する
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* ステップインジケーター */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? 'bg-blue-600 text-white'
                    : s < step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 sm:w-24 h-1 mx-2 ${
                    s < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between max-w-md mx-auto mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>基本情報</span>
          <span>JPYC情報</span>
          <span>確認</span>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: 基本情報 */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              STEP1: 基本情報
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                サービス名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="例: CryptoMall"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                概要説明（任意）
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="サービスの概要を入力してください..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                サービス種別 <span className="text-red-500">*</span>
              </label>
              <select
                name="serviceType"
                value={formData.serviceType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">選択してください</option>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {formData.serviceType === 'その他' && (
                <input
                  type="text"
                  name="serviceTypeOther"
                  value={formData.serviceTypeOther}
                  onChange={handleInputChange}
                  placeholder="サービス種別を入力（備考として保存）"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                国・地域（任意）
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="例: 日本"
              />
            </div>
          </div>
        )}

        {/* STEP 2: JPYC利用情報 */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              STEP2: JPYC利用情報
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                JPYCの使い道 <span className="text-red-500">*</span>
              </label>
              <select
                name="jpycUseCase"
                value={formData.jpycUseCase}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">選択してください</option>
                {JPYC_USE_CASES.map((useCase) => (
                  <option key={useCase} value={useCase}>
                    {useCase}
                  </option>
                ))}
              </select>
              {formData.jpycUseCase === 'その他' && (
                <input
                  type="text"
                  name="jpycUseCaseOther"
                  value={formData.jpycUseCaseOther}
                  onChange={handleInputChange}
                  placeholder="具体的な使い道を入力"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                プラットフォーム <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {PLATFORMS.map((platform) => (
                  <label key={platform} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.platforms.includes(platform)}
                      onChange={() => handleCheckboxChange('platforms', platform)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{platform}</span>
                  </label>
                ))}
                {formData.platforms.includes('その他') && (
                  <input
                    type="text"
                    name="platformOther"
                    value={formData.platformOther}
                    onChange={handleInputChange}
                    placeholder="プラットフォーム名を入力"
                    className="ml-6 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                タグ（任意・複数可）
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {TAG_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleCheckboxChange('tags', tag)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300'
                        : 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* 選択中のタグ */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags
                    .filter((t) => !TAG_SUGGESTIONS.includes(t))
                    .map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}

              {/* カスタムタグ追加 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  name="customTag"
                  value={formData.customTag}
                  onChange={handleInputChange}
                  placeholder="カスタムタグを追加"
                  className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 確認 & 同意 */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              STEP3: 確認 & 同意
            </h3>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">基本情報</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">サービス名</dt>
                  <dd className="text-gray-900 dark:text-white">{formData.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">サービス種別</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formData.serviceType}
                    {formData.serviceType === 'その他' && formData.serviceTypeOther && (
                      <span className="text-gray-500 dark:text-gray-400">（{formData.serviceTypeOther}）</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 dark:text-gray-400">URL</dt>
                  <dd className="text-gray-900 dark:text-white break-all">{formData.url}</dd>
                </div>
                {formData.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500 dark:text-gray-400">概要説明</dt>
                    <dd className="text-gray-900 dark:text-white">{formData.description}</dd>
                  </div>
                )}
                {formData.country && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">国・地域</dt>
                    <dd className="text-gray-900 dark:text-white">{formData.country}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">JPYC利用情報</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">JPYCの使い道</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formData.jpycUseCase === 'その他'
                      ? formData.jpycUseCaseOther
                      : formData.jpycUseCase}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">プラットフォーム</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formData.platforms
                      .map((p) => (p === 'その他' ? formData.platformOther : p))
                      .filter(Boolean)
                      .join(', ')}
                  </dd>
                </div>
                {formData.tags.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500 dark:text-gray-400">タグ</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <label className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                JPYC対応をサイトやサービス内で確認しました
              </span>
            </label>
          </div>
        )}

        {/* ナビゲーションボタン */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              戻る
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : '登録申請する'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
