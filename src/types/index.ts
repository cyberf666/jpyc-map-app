// src/types/index.ts

// 実店舗の型定義
export interface Shop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  jpyc_networks: string[] | null;
  payment_methods: string[] | null;
  url: string | null;
  tags: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
}

// オンライン事業者の型定義
export interface OnlineMerchant {
  id: string;
  name: string;
  description: string | null;
  service_type: string | null;
  url: string;
  platforms: string[] | null;
  jpyc_use_case: string | null;
  country: string | null;
  tags: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// タブの型定義
export type TabType = 'shops' | 'online';

// 位置情報の型定義
export interface Location {
  lat: number;
  lng: number;
}
