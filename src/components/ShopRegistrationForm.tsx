// src/components/ShopRegistrationForm.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';

// Leafletコンポーネントをdynamic importで読み込み
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

// 地図クリックイベント用コンポーネント
const MapClickHandler = dynamic(
  () => import('react-leaflet').then((mod) => {
    const { useMapEvents } = mod;
    return function MapClickHandlerInner({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
      useMapEvents({
        click: (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        },
      });
      return null;
    };
  }),
  { ssr: false }
);

// カテゴリ選択肢
const CATEGORIES = [
  'カフェ',
  'レストラン',
  'バー',
  'ショップ',
  'イベントスペース',
  'その他',
];

// JPYCの使い方選択肢
const JPYC_USE_CASES = [
  '店頭決済',
  'チケット・イベント代',
  '物販',
  '投げ銭 / チップ',
];

// 対応ネットワーク選択肢
const NETWORKS = ['Polygon', 'Ethereum', 'その他'];

// 支払い方法選択肢
const PAYMENT_METHODS = ['ウォレット送金', 'QRコード決済', '店舗側専用アプリ'];

interface ShopFormData {
  // STEP1
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  // STEP2
  jpycUseCases: string[];
  jpycUseCaseOther: string;
  networks: string[];
  networkOther: string;
  paymentMethod: string;
  url: string;
  twitter: string;
  note: string;
}

const initialFormData: ShopFormData = {
  name: '',
  address: '',
  category: '',
  lat: 35.6812,
  lng: 139.7671,
  jpycUseCases: [],
  jpycUseCaseOther: '',
  networks: [],
  networkOther: '',
  paymentMethod: '',
  url: '',
  twitter: '',
  note: '',
};

export default function ShopRegistrationForm() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ShopFormData>(initialFormData);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Leafletアイコン設定
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
        setMapReady(true);
      });
    }
  }, []);

  // 現在地取得
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }));
        },
        () => {
          // エラー時は東京駅のまま
        }
      );
    }
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (field: 'jpycUseCases' | 'networks', value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('店舗名を入力してください');
      return false;
    }
    if (!formData.address.trim()) {
      setError('住所を入力してください');
      return false;
    }
    if (!formData.category) {
      setError('カテゴリを選択してください');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (formData.jpycUseCases.length === 0 && !formData.jpycUseCaseOther.trim()) {
      setError('JPYCの使い方を1つ以上選択してください');
      return false;
    }
    if (formData.networks.length === 0 && !formData.networkOther.trim()) {
      setError('対応ネットワークを1つ以上選択してください');
      return false;
    }
    if (!formData.paymentMethod) {
      setError('支払い方法を選択してください');
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
      // タグを生成
      const tags = [formData.category];

      // JPYCの使い方を結合
      const jpycUseCases = [...formData.jpycUseCases];
      if (formData.jpycUseCaseOther.trim()) {
        jpycUseCases.push(formData.jpycUseCaseOther.trim());
      }

      // ネットワークを結合
      const networks = formData.networks.filter((n) => n !== 'その他');
      if (formData.networks.includes('その他') && formData.networkOther.trim()) {
        networks.push(formData.networkOther.trim());
      }

      const { error: insertError } = await supabase.from('shops').insert({
        name: formData.name.trim(),
        address: formData.address.trim(),
        lat: formData.lat,
        lng: formData.lng,
        jpyc_networks: networks,
        payment_methods: [formData.paymentMethod],
        url: formData.url.trim() || null,
        tags,
        status: 'pending',
        created_by: user.id,
        upvotes: 0,
        downvotes: 0,
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
          管理者の承認後、地図に表示されます。
        </p>
        <button
          onClick={resetForm}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          別の店舗を登録する
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
                店舗名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="例: Crypto Cafe Tokyo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                住所 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="例: 東京都渋谷区..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">選択してください</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                地図上で位置を選択（クリックでピン移動）
              </label>
              <div className="h-[300px] rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                {mapReady ? (
                  <MapContainer
                    center={[formData.lat, formData.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[formData.lat, formData.lng]} />
                    <MapClickHandler onMapClick={handleMapClick} />
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                    <p className="text-gray-500">地図を読み込み中...</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                緯度: {formData.lat.toFixed(6)} / 経度: {formData.lng.toFixed(6)}
              </p>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                JPYCの使い方 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {JPYC_USE_CASES.map((useCase) => (
                  <label key={useCase} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.jpycUseCases.includes(useCase)}
                      onChange={() => handleCheckboxChange('jpycUseCases', useCase)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{useCase}</span>
                  </label>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.jpycUseCaseOther.length > 0}
                    readOnly
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    name="jpycUseCaseOther"
                    value={formData.jpycUseCaseOther}
                    onChange={handleInputChange}
                    placeholder="その他（自由入力）"
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                対応ネットワーク <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {NETWORKS.map((network) => (
                  <label key={network} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.networks.includes(network)}
                      onChange={() => handleCheckboxChange('networks', network)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{network}</span>
                  </label>
                ))}
                {formData.networks.includes('その他') && (
                  <input
                    type="text"
                    name="networkOther"
                    value={formData.networkOther}
                    onChange={handleInputChange}
                    placeholder="ネットワーク名を入力"
                    className="ml-6 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                支払い方法 <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">選択してください</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                店舗URL（任意）
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
                X（Twitter）（任意）
              </label>
              <input
                type="text"
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="@username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                備考（任意）
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="その他伝えたいことがあれば..."
              />
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
                  <dt className="text-gray-500 dark:text-gray-400">店舗名</dt>
                  <dd className="text-gray-900 dark:text-white">{formData.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">カテゴリ</dt>
                  <dd className="text-gray-900 dark:text-white">{formData.category}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 dark:text-gray-400">住所</dt>
                  <dd className="text-gray-900 dark:text-white">{formData.address}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 dark:text-gray-400">位置</dt>
                  <dd className="text-gray-900 dark:text-white">
                    緯度: {formData.lat.toFixed(6)} / 経度: {formData.lng.toFixed(6)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">JPYC利用情報</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">JPYCの使い方</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {[...formData.jpycUseCases, formData.jpycUseCaseOther].filter(Boolean).join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">対応ネットワーク</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formData.networks.map((n) => (n === 'その他' ? formData.networkOther : n)).filter(Boolean).join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">支払い方法</dt>
                  <dd className="text-gray-900 dark:text-white">{formData.paymentMethod}</dd>
                </div>
                {formData.url && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">店舗URL</dt>
                    <dd className="text-gray-900 dark:text-white">{formData.url}</dd>
                  </div>
                )}
                {formData.twitter && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">X（Twitter）</dt>
                    <dd className="text-gray-900 dark:text-white">{formData.twitter}</dd>
                  </div>
                )}
                {formData.note && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500 dark:text-gray-400">備考</dt>
                    <dd className="text-gray-900 dark:text-white">{formData.note}</dd>
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
                JPYCが実際に利用可能であることを確認しました
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
