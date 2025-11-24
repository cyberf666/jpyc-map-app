// src/components/ShopsTab.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Shop, Location } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { dummyShops } from '@/lib/dummyData';

// Leafletはクライアントサイドのみで動作するため、dynamic importを使用
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
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// ダミーデータを使用するかどうかのフラグ（Supabase未設定時はtrue）
const USE_DUMMY_DATA = false;

// 2点間の距離を計算（Haversine formula、km単位）
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 地球の半径（km）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ShopsTab() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [searchRadius, setSearchRadius] = useState(10); // km
  const [mapReady, setMapReady] = useState(false);

  // 現在地を取得
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error('位置情報の取得に失敗しました:', err);
          // デフォルトは東京駅
          setUserLocation({ lat: 35.6812, lng: 139.7671 });
        }
      );
    } else {
      // Geolocation非対応の場合、東京駅をデフォルトに
      setUserLocation({ lat: 35.6812, lng: 139.7671 });
    }
  }, []);

  // 店舗データを取得
  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true);

        if (USE_DUMMY_DATA || !supabase) {
          // ダミーデータを使用
          setShops(dummyShops);
        } else {
          // Supabaseから取得
          const { data, error } = await supabase
            .from('shops')
            .select('*')
            .eq('status', 'approved');

          if (error) throw error;
          setShops(data || []);
        }
      } catch (err) {
        setError('店舗データの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchShops();
  }, []);

  // Leafletアイコンの設定とマップの準備
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // デフォルトアイコンの設定
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

  // 周辺の店舗をフィルタリング
  const nearbyShops = useMemo(() => {
    if (!userLocation) return shops;

    return shops
      .map((shop) => ({
        ...shop,
        distance: calculateDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng),
      }))
      .filter((shop) => shop.distance <= searchRadius)
      .sort((a, b) => a.distance - b.distance);
  }, [shops, userLocation, searchRadius]);

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
      {/* 検索半径の設定 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          検索半径: {searchRadius}km
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={searchRadius}
          onChange={(e) => setSearchRadius(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1km</span>
          <span>50km</span>
        </div>
      </div>

      {/* 地図 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="h-[400px] w-full">
          {mapReady && userLocation ? (
            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {nearbyShops.map((shop) => (
                <Marker
                  key={shop.id}
                  position={[shop.lat, shop.lng]}
                  eventHandlers={{
                    click: () => setSelectedShop(shop),
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-lg">{shop.name}</h3>
                      <p className="text-sm text-gray-600">{shop.address}</p>
                      {shop.jpyc_networks && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {shop.jpyc_networks.map((network) => (
                            <span
                              key={network}
                              className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {network}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <p className="text-gray-500">地図を読み込み中...</p>
            </div>
          )}
        </div>
      </div>

      {/* 店舗一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            周辺の店舗 ({nearbyShops.length}件)
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {nearbyShops.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>周辺に対応店舗が見つかりませんでした</p>
              <p className="text-sm mt-1">検索半径を広げてみてください</p>
            </div>
          ) : (
            nearbyShops.map((shop) => (
              <div
                key={shop.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  selectedShop?.id === shop.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => setSelectedShop(shop)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {shop.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {shop.address}
                    </p>

                    {/* 対応ネットワーク */}
                    {shop.jpyc_networks && shop.jpyc_networks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {shop.jpyc_networks.map((network) => (
                          <span
                            key={network}
                            className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded"
                          >
                            {network}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 決済方法 */}
                    {shop.payment_methods && shop.payment_methods.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {shop.payment_methods.map((method) => (
                          <span
                            key={method}
                            className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded"
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* タグ */}
                    {shop.tags && shop.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {shop.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 text-xs rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 text-right">
                    {'distance' in shop && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {(shop as Shop & { distance: number }).distance.toFixed(1)}km
                      </span>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-green-600">👍 {shop.upvotes}</span>
                      <span className="text-red-600">👎 {shop.downvotes}</span>
                    </div>
                  </div>
                </div>

                {shop.url && (
                  <div className="mt-3">
                    <a
                      href={shop.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      詳細を見る →
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
