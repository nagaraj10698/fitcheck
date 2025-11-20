/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // null represents the base model layer
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  gems: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: number;
}