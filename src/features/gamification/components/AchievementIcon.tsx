'use client';

import React from 'react';
import {
  BookOpen, Search, Calendar, MessageCircle, Footprints,
  TrendingUp, Award, Heart, Wind, TreePine, Activity,
  Shield, Eye, Sprout, Mountain, Compass, HandHeart, Sun,
} from 'lucide-react';

interface AchievementIconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Статический компонент для рендеринга иконок достижений.
 *  Не создаёт компоненты динамически — каждый кейс объявлен явно. */
export function AchievementIcon({ name, size = 24, strokeWidth = 1.5, className }: AchievementIconProps) {
  const props = { size, strokeWidth, className };
  switch (name) {
    case 'BookOpen': return <BookOpen {...props} />;
    case 'Search': return <Search {...props} />;
    case 'Calendar': return <Calendar {...props} />;
    case 'MessageCircle': return <MessageCircle {...props} />;
    case 'Footprints': return <Footprints {...props} />;
    case 'TrendingUp': return <TrendingUp {...props} />;
    case 'Award': return <Award {...props} />;
    case 'Heart': return <Heart {...props} />;
    case 'Wind': return <Wind {...props} />;
    case 'TreePine': return <TreePine {...props} />;
    case 'Activity': return <Activity {...props} />;
    case 'Shield': return <Shield {...props} />;
    case 'Eye': return <Eye {...props} />;
    case 'Sprout': return <Sprout {...props} />;
    case 'Mountain': return <Mountain {...props} />;
    case 'Compass': return <Compass {...props} />;
    case 'HandHeart': return <HandHeart {...props} />;
    case 'Sun': return <Sun {...props} />;
    default: return <Heart {...props} />;
  }
}
