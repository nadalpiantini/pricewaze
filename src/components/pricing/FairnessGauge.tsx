'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface FairnessGaugeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

/**
 * FairnessGauge - Waze-style speedometer for Fairness Score
 *
 * Score interpretation (inverted - lower is better for buyers):
 * 0-30:  Great Deal (Green) - Property is underpriced
 * 31-50: Fair Price (Yellow/Green) - Reasonable market value
 * 51-70: Slightly High (Orange) - Above market
 * 71-100: Overpriced (Red) - Significantly above market
 */
export function FairnessGauge({
  score,
  size = 'md',
  showLabel = true,
  label,
  animated = true,
  className,
}: FairnessGaugeProps) {
  // Clamp score between 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  // Size configurations
  const sizes = {
    sm: { width: 120, height: 70, strokeWidth: 8, fontSize: 18, labelSize: 10 },
    md: { width: 180, height: 100, strokeWidth: 12, fontSize: 28, labelSize: 12 },
    lg: { width: 240, height: 130, strokeWidth: 16, fontSize: 36, labelSize: 14 },
  };

  const config = sizes[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const centerX = config.width / 2;
  const centerY = config.height - 10;

  // Calculate the arc path for the gauge background
  const describeArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  // Color segments (from left to right: green -> yellow -> orange -> red)
  const segments = useMemo(() => [
    { start: 180, end: 234, color: '#22c55e' },  // Green (0-30)
    { start: 234, end: 270, color: '#eab308' },  // Yellow (31-50)
    { start: 270, end: 306, color: '#f97316' },  // Orange (51-70)
    { start: 306, end: 360, color: '#ef4444' },  // Red (71-100)
  ], []);

  // Calculate needle angle (180° = 0 score, 360° = 100 score)
  const needleAngle = 180 + (clampedScore / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius - 10;
  const needleX = centerX + needleLength * Math.cos(needleRad);
  const needleY = centerY + needleLength * Math.sin(needleRad);

  // Get score color
  const getScoreColor = () => {
    if (clampedScore <= 30) return '#22c55e';
    if (clampedScore <= 50) return '#eab308';
    if (clampedScore <= 70) return '#f97316';
    return '#ef4444';
  };

  // Get score label
  const getScoreLabel = () => {
    if (label) return label;
    if (clampedScore <= 30) return 'Great Deal';
    if (clampedScore <= 50) return 'Fair Price';
    if (clampedScore <= 70) return 'Slightly High';
    return 'Overpriced';
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="overflow-visible"
      >
        {/* Background track */}
        <path
          d={describeArc(180, 360)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Color segments */}
        {segments.map((segment, i) => (
          <path
            key={i}
            d={describeArc(segment.start, segment.end)}
            fill="none"
            stroke={segment.color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}

        {/* Needle */}
        <g
          style={animated ? {
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${centerX}px ${centerY}px`,
            transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          } : {}}
        >
          <line
            x1={centerX}
            y1={centerY}
            x2={animated ? centerX + needleLength : needleX}
            y2={animated ? centerY : needleY}
            stroke="hsl(var(--foreground))"
            strokeWidth={3}
            strokeLinecap="round"
            style={animated ? { transform: 'rotate(-180deg)', transformOrigin: `${centerX}px ${centerY}px` } : {}}
          />
        </g>

        {/* Actual needle (non-animated fallback) */}
        {!animated && (
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke="hsl(var(--foreground))"
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={size === 'lg' ? 8 : size === 'md' ? 6 : 4}
          fill="hsl(var(--foreground))"
        />

        {/* Score text */}
        <text
          x={centerX}
          y={centerY - (size === 'lg' ? 30 : size === 'md' ? 22 : 16)}
          textAnchor="middle"
          className="font-bold"
          style={{
            fontSize: config.fontSize,
            fill: getScoreColor(),
          }}
        >
          {Math.round(clampedScore)}
        </text>

        {/* Min/Max labels */}
        <text
          x={config.strokeWidth}
          y={centerY + 14}
          textAnchor="start"
          className="font-medium"
          style={{ fontSize: config.labelSize - 2, fill: 'hsl(var(--muted-foreground))' }}
        >
          0
        </text>
        <text
          x={config.width - config.strokeWidth}
          y={centerY + 14}
          textAnchor="end"
          className="font-medium"
          style={{ fontSize: config.labelSize - 2, fill: 'hsl(var(--muted-foreground))' }}
        >
          100
        </text>
      </svg>

      {/* Label below gauge */}
      {showLabel && (
        <span
          className="font-semibold mt-1"
          style={{
            fontSize: config.labelSize,
            color: getScoreColor(),
          }}
        >
          {getScoreLabel()}
        </span>
      )}
    </div>
  );
}

/**
 * Compact horizontal gauge variant for inline use
 */
export function FairnessGaugeInline({
  score,
  showLabel = true,
  className,
}: {
  score: number;
  showLabel?: boolean;
  className?: string;
}) {
  const clampedScore = Math.max(0, Math.min(100, score));

  const getColor = () => {
    if (clampedScore <= 30) return 'bg-green-500';
    if (clampedScore <= 50) return 'bg-yellow-500';
    if (clampedScore <= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (clampedScore <= 30) return 'Great Deal';
    if (clampedScore <= 50) return 'Fair';
    if (clampedScore <= 70) return 'High';
    return 'Overpriced';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor())}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      <span className="text-sm font-bold min-w-[32px]">{Math.round(clampedScore)}</span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{getLabel()}</span>
      )}
    </div>
  );
}

/**
 * Mini gauge for cards/lists
 */
export function FairnessGaugeMini({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const clampedScore = Math.max(0, Math.min(100, score));

  const getColor = () => {
    if (clampedScore <= 30) return 'text-green-500 border-green-500/30 bg-green-500/10';
    if (clampedScore <= 50) return 'text-yellow-600 border-yellow-500/30 bg-yellow-500/10';
    if (clampedScore <= 70) return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
    return 'text-red-500 border-red-500/30 bg-red-500/10';
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm',
        getColor(),
        className
      )}
    >
      {Math.round(clampedScore)}
    </div>
  );
}
