export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
  category: 'onboarding' | 'engagement' | 'expertise' | 'social';
  points_reward: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'engagement' | 'expertise' | 'social';
  requirement_type: 'count' | 'streak' | 'value' | 'combo';
  requirement_value: number;
  points_reward: number;
  badge_reward_id: string | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  completed_at: string | null;
  achievement?: Achievement;
}

export interface PointsHistory {
  id: string;
  user_id: string;
  points: number;
  source: 'badge' | 'achievement' | 'action' | 'bonus';
  source_id: string | null;
  description: string;
  created_at: string;
}

export interface GamificationStats {
  total_points: number;
  trust_score: number;
  level: number;
  badges_count: number;
  achievements_count: number;
  completed_achievements_count: number;
  recent_badges: UserBadge[];
  recent_achievements: UserAchievement[];
}

export interface AwardPointsRequest {
  points: number;
  source: 'badge' | 'achievement' | 'action' | 'bonus';
  source_id?: string;
  description: string;
}

export interface AwardBadgeRequest {
  badge_code: string;
}

export interface UpdateAchievementRequest {
  achievement_code: string;
  progress_increment?: number;
}

