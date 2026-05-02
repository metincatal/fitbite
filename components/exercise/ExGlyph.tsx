import React from 'react';
import Svg, { Path, Circle, Line, Rect, Ellipse } from 'react-native-svg';

export const EXERCISE_GLYPHS: Record<string, string> = {
  running:        'run',
  walking:        'walk',
  cycling:        'bike',
  swimming:       'wave',
  elliptical:     'orbit',
  dance:          'reach',
  rowing_machine: 'row',
  stair_climbing: 'stairs',
  jump_rope:      'rope',
  free_weights:   'barbell',
  bodyweight:     'flex',
  kettlebell:     'kbell',
  crossfit:       'fire',
  football:       'pitch',
  basketball:     'court',
  tennis:         'racquet',
  volleyball:     'net',
  table_tennis:   'paddle',
  badminton:      'shuttle',
  yoga:           'lotus',
  pilates:        'arc',
  tai_chi:        'spiral',
  meditation:     'dot',
  stretching:     'reach',
  hiking:         'mountain',
  mountain_bike:  'mtb',
  skiing:         'ski',
  hiit:           'bolt',
  boxing:         'glove',
  gymnastics:     'spring',
  general_sport:  'medal',
};

export const GROUP_GLYPHS: Record<string, string> = {
  cardio:   'pulse',
  strength: 'barbell',
  sport:    'pitch',
  mindBody: 'lotus',
  outdoor:  'mountain',
  other:    'bolt',
};

export function ExGlyph({ kind, size = 22, color = '#17201A', strokeWidth = 1.3 }: {
  kind: string; size?: number; color?: string; strokeWidth?: number;
}) {
  const p = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'pulse': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M2 12h4l2-6 4 12 3-9 2 3h5" {...p} />
      </Svg>
    );
    case 'weight': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Line x1={3} y1={12} x2={21} y2={12} {...p} />
        <Rect x={2} y={9} width={2} height={6} rx={0.5} {...p} />
        <Rect x={20} y={9} width={2} height={6} rx={0.5} {...p} />
        <Rect x={6} y={7} width={3} height={10} rx={0.6} {...p} />
        <Rect x={15} y={7} width={3} height={10} rx={0.6} {...p} />
      </Svg>
    );
    case 'arc': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 18 A 9 9 0 0 1 21 18" {...p} />
        <Circle cx={12} cy={18} r={1.4} fill={color} stroke="none" />
      </Svg>
    );
    case 'lotus': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 5 Q 9 11 12 16 Q 15 11 12 5 Z" {...p} />
        <Path d="M5 11 Q 8 10 12 16" {...p} />
        <Path d="M19 11 Q 16 10 12 16" {...p} />
        <Path d="M3 18 H 21" {...p} />
      </Svg>
    );
    case 'mountain': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 19 L 9 9 L 13 14 L 16 10 L 21 19 Z" {...p} />
        <Path d="M9 9 L 11 11" {...p} />
      </Svg>
    );
    case 'bolt': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M13 3 L 5 14 H 11 L 9 21 L 17 10 H 11 Z" {...p} />
      </Svg>
    );
    case 'run': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={14} cy={5} r={1.6} {...p} />
        <Path d="M7 21 L 10 15 L 8 11 L 13 9 L 17 13 L 21 12" {...p} />
        <Path d="M10 15 L 6 14" {...p} />
      </Svg>
    );
    case 'walk': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={13} cy={5} r={1.5} {...p} />
        <Path d="M9 21 L 11 15 L 9 11 L 13 9 L 16 13 L 18 15" {...p} />
      </Svg>
    );
    case 'bike': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={6} cy={17} r={3} {...p} />
        <Circle cx={18} cy={17} r={3} {...p} />
        <Path d="M6 17 L 11 11 L 14 11 L 18 17" {...p} />
        <Circle cx={14} cy={5} r={1.4} {...p} />
        <Path d="M14 6 L 14 11" {...p} />
      </Svg>
    );
    case 'wave': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M2 8 Q 5 5 8 8 T 14 8 T 20 8 T 22 8" {...p} />
        <Path d="M2 13 Q 5 10 8 13 T 14 13 T 20 13 T 22 13" {...p} />
        <Path d="M2 18 Q 5 15 8 18 T 14 18 T 20 18 T 22 18" {...p} />
      </Svg>
    );
    case 'orbit': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Ellipse cx={12} cy={12} rx={9} ry={4} {...p} />
        <Circle cx={12} cy={12} r={2} fill={color} stroke="none" />
      </Svg>
    );
    case 'row': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 19 L 21 5" {...p} />
        <Circle cx={6} cy={16} r={2} {...p} />
        <Path d="M14 12 L 19 17" {...p} />
      </Svg>
    );
    case 'stairs': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 20 H 7 V 16 H 11 V 12 H 15 V 8 H 19 V 4" {...p} />
        <Path d="M19 4 H 23" {...p} />
      </Svg>
    );
    case 'rope': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 4 Q 5 14 12 14 Q 19 14 19 4" {...p} />
        <Path d="M9 18 H 15" {...p} />
      </Svg>
    );
    case 'barbell': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Line x1={3} y1={12} x2={21} y2={12} {...p} />
        <Rect x={3} y={9} width={2} height={6} rx={0.5} {...p} />
        <Rect x={19} y={9} width={2} height={6} rx={0.5} {...p} />
        <Rect x={7} y={7} width={3} height={10} rx={0.5} {...p} />
        <Rect x={14} y={7} width={3} height={10} rx={0.5} {...p} />
      </Svg>
    );
    case 'flex': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 17 Q 9 9 14 11 Q 18 12 18 7" {...p} />
        <Circle cx={14} cy={11} r={2.5} {...p} />
      </Svg>
    );
    case 'kbell': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M9 4 H 15 V 6 A 6 6 0 1 1 9 6 Z" {...p} />
      </Svg>
    );
    case 'fire': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 3 Q 7 9 9 14 Q 7 18 12 21 Q 17 18 15 14 Q 17 9 12 3 Z" {...p} />
        <Path d="M12 11 Q 10 14 12 17 Q 14 14 12 11" {...p} />
      </Svg>
    );
    case 'pitch': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} {...p} />
        <Path d="M12 5 L 14 9 L 18 9 L 15 12 L 16 16 L 12 13 L 8 16 L 9 12 L 6 9 L 10 9 Z" {...p} />
      </Svg>
    );
    case 'court': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} {...p} />
        <Path d="M3 12 H 21" {...p} />
        <Path d="M12 3 V 21" {...p} />
      </Svg>
    );
    case 'racquet': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={9} cy={9} r={5.5} {...p} />
        <Path d="M5.5 12.5 L 3 21" {...p} />
        <Path d="M6 8 H 12 M6 10 H 12 M9 5 V 13" {...p} />
      </Svg>
    );
    case 'net': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 12 H 21" {...p} />
        <Path d="M6 8 V 16 M10 8 V 16 M14 8 V 16 M18 8 V 16" {...p} />
        <Path d="M3 8 H 21 M3 16 H 21" {...p} />
      </Svg>
    );
    case 'paddle': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={9} cy={9} r={5} {...p} />
        <Path d="M5.5 12.5 L 3 19" {...p} />
        <Circle cx={18} cy={14} r={1} fill={color} stroke="none" />
      </Svg>
    );
    case 'shuttle': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M14 4 L 20 10 L 12 18 L 6 12 Z" {...p} />
        <Path d="M9 9 L 14 4 M11 11 L 17 5 M14 14 L 20 8" {...p} />
      </Svg>
    );
    case 'spiral': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 12 m -1 0 a 1 1 0 1 0 2 0 a 4 4 0 1 0 -7 -3 a 7 7 0 1 0 13 4" {...p} />
      </Svg>
    );
    case 'dot': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={2} fill={color} stroke="none" />
        <Circle cx={12} cy={12} r={6} {...p} opacity={0.4} />
        <Circle cx={12} cy={12} r={10} {...p} opacity={0.2} />
      </Svg>
    );
    case 'reach': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={5} r={1.5} {...p} />
        <Path d="M12 6.5 V 14 L 7 21 M12 14 L 17 21 M5 11 L 19 11" {...p} />
      </Svg>
    );
    case 'mtb': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={6} cy={17} r={3} {...p} />
        <Circle cx={18} cy={17} r={3} {...p} />
        <Path d="M6 17 L 12 11 L 18 17" {...p} />
        <Path d="M3 9 L 8 9" {...p} />
      </Svg>
    );
    case 'ski': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 19 L 21 5" {...p} />
        <Path d="M5 18 L 21 4" {...p} />
        <Circle cx={14} cy={9} r={1.4} {...p} />
      </Svg>
    );
    case 'glove': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M7 4 H 14 Q 18 4 18 9 V 14 Q 18 19 13 19 H 9 Q 5 19 5 15 V 8 Q 5 4 9 4" {...p} />
        <Path d="M5 9 L 14 9" {...p} />
      </Svg>
    );
    case 'spring': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 4 H 19 M5 8 H 19 M5 12 H 19 M5 16 H 19 M5 20 H 19" {...p} />
      </Svg>
    );
    case 'medal': return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={15} r={5} {...p} />
        <Path d="M8 4 L 12 11 L 16 4" {...p} />
      </Svg>
    );
    default: return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={5} {...p} />
      </Svg>
    );
  }
}
