'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import type {
  GamificationStats,
  Badge,
  Achievement,
  UserBadge,
  UserAchievement,
  PointsHistory,
  AwardPointsRequest,
  AwardBadgeRequest,
  UpdateAchievementRequest,
} from '@/types/gamification';

// Fetch user gamification stats
async function fetchGamificationStats(userId: string): Promise<GamificationStats> {
  const res = await fetch(`/api/gamification/stats?user_id=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch gamification stats');
  return res.json();
}

// Fetch all badges
async function fetchBadges(): Promise<Badge[]> {
  const res = await fetch('/api/gamification/badges');
  if (!res.ok) throw new Error('Failed to fetch badges');
  return res.json();
}

// Fetch user badges
async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  const res = await fetch(`/api/gamification/user-badges?user_id=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user badges');
  return res.json();
}

// Fetch all achievements
async function fetchAchievements(): Promise<Achievement[]> {
  const res = await fetch('/api/gamification/achievements');
  if (!res.ok) throw new Error('Failed to fetch achievements');
  return res.json();
}

// Fetch user achievements
async function fetchUserAchievements(userId: string): Promise<UserAchievement[]> {
  const res = await fetch(`/api/gamification/user-achievements?user_id=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user achievements');
  return res.json();
}

// Fetch points history
async function fetchPointsHistory(userId: string, limit = 20): Promise<PointsHistory[]> {
  const res = await fetch(`/api/gamification/points-history?user_id=${userId}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch points history');
  return res.json();
}

// Award points
async function awardPoints(data: AwardPointsRequest): Promise<void> {
  const res = await fetch('/api/gamification/award-points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to award points');
}

// Award badge
async function awardBadge(data: AwardBadgeRequest): Promise<UserBadge> {
  const res = await fetch('/api/gamification/award-badge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to award badge');
  return res.json();
}

// Update achievement
async function updateAchievement(data: UpdateAchievementRequest): Promise<{ completed: boolean }> {
  const res = await fetch('/api/gamification/update-achievement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update achievement');
  return res.json();
}

// Calculate trust score
async function calculateTrustScore(userId: string): Promise<{ trust_score: number }> {
  const res = await fetch(`/api/gamification/calculate-trust-score?user_id=${userId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to calculate trust score');
  return res.json();
}

export function useGamificationStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['gamification-stats', userId],
    queryFn: () => fetchGamificationStats(userId!),
    enabled: !!userId,
  });
}

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: fetchBadges,
  });
}

export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-badges', userId],
    queryFn: () => fetchUserBadges(userId!),
    enabled: !!userId,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: fetchAchievements,
  });
}

export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-achievements', userId],
    queryFn: () => fetchUserAchievements(userId!),
    enabled: !!userId,
  });
}

export function usePointsHistory(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['points-history', userId, limit],
    queryFn: () => fetchPointsHistory(userId!, limit),
    enabled: !!userId,
  });
}

export function useAwardPoints() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: awardPoints,
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['gamification-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['points-history', user.id] });
      }
    },
  });
}

export function useAwardBadge() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: awardBadge,
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['gamification-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['user-badges', user.id] });
      }
    },
  });
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: updateAchievement,
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['gamification-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['user-achievements', user.id] });
      }
    },
  });
}

export function useCalculateTrustScore() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (userId: string) => calculateTrustScore(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-stats', userId] });
    },
  });
}

