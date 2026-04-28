import React, { useEffect, useRef } from 'react';
import Svg, { Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import { Accelerometer } from 'expo-sensors';
import { Colors } from '../../lib/constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Runs on UI thread. All inputs passed as arguments — no captured closure state.
function buildWavePath(
  surfaceY: number,
  phase: number,
  tiltOffset: number,
  splashAmp: number,
  splashFront: number,
  width: number,
  height: number,
): string {
  'worklet';
  const ambientAmp = 2.5;
  // tiltOffset > 0 → phone tilts left → water accumulates on LEFT (lower SVG y on left side)
  let d = 'M 0 ' + (surfaceY - tiltOffset);
  for (let x = 6; x <= width; x += 6) {
    const norm = x / width;
    // tiltOffset > 0: left side lower SVG y (more water), right side higher SVG y (less water)
    const tiltY = tiltOffset * (2 * norm - 1);
    let y =
      surfaceY +
      tiltY +
      Math.sin(x * 0.07 + phase) * ambientAmp +
      Math.sin(x * 0.13 - phase * 0.8 + 1.0) * (ambientAmp * 0.35);

    // Traveling wave from the left: Gaussian crest at the front + decaying ripple wake
    if (splashAmp > 0.1) {
      const d2f = x - splashFront; // negative = behind front, positive = ahead

      // Leading Gaussian crest (~±20px wide) that sweeps right with the front
      const crest = splashAmp * 1.5 * Math.exp(-(d2f * d2f) / 800);

      // Oscillating wake behind the front, decays spatially with distance
      const wakeAmp = d2f < 0 ? splashAmp * 0.55 * Math.exp(d2f * 0.018) : 0;
      const wake = wakeAmp * Math.sin(-d2f * 0.18 + phase * 2.5);

      y -= crest + wake; // subtract → raises water surface (lower SVG y = higher water)
    }

    d += ' L ' + x + ' ' + y;
  }
  return d + ' L ' + width + ' ' + height + ' L 0 ' + height + ' Z';
}

interface TideProps {
  glasses: number;
  goal?: number;
  width?: number;
  height?: number;
}

export function Tide({ glasses, goal = 8, width = 340, height = 86 }: TideProps) {
  const pct = Math.min(1, glasses / goal);
  const targetSurfaceY = height - pct * (height - 8);

  const phase = useSharedValue(0);
  const tilt = useSharedValue(0);
  const splashAmp = useSharedValue(0);
  // splashFront starts off-screen left so no accidental wave on mount
  const splashFront = useSharedValue(-200);
  const level = useSharedValue(targetSurfaceY);
  const prevGlasses = useRef(glasses);

  // Continuous gentle wave — 0→2π cycles seamlessly (sin is 2π-periodic)
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, []);

  // Smooth water-level change
  useEffect(() => {
    level.value = withSpring(targetSurfaceY, { damping: 20, stiffness: 120 });
  }, [targetSurfaceY]);

  // Big wave sweeping from left when a glass is added
  useEffect(() => {
    if (glasses > prevGlasses.current) {
      cancelAnimation(splashFront);
      cancelAnimation(splashAmp);
      // Reset front to left edge, set full amplitude
      splashFront.value = 0;
      splashAmp.value = 9;
      // Front sweeps across in 680ms with ease-out (fast start, decelerates)
      splashFront.value = withTiming(width + 80, {
        duration: 680,
        easing: Easing.out(Easing.quad),
      });
      // Amplitude decays over 1600ms — physics continues after the wave passes
      splashAmp.value = withTiming(0, {
        duration: 1600,
        easing: Easing.out(Easing.quad),
      });
    }
    prevGlasses.current = glasses;
  }, [glasses]);

  // Accelerometer → underdamped spring gives realistic liquid inertia / sloshing
  useEffect(() => {
    let sub: ReturnType<typeof Accelerometer.addListener> | undefined;
    Accelerometer.isAvailableAsync().then((ok) => {
      if (!ok) return;
      Accelerometer.setUpdateInterval(50); // 20 Hz
      sub = Accelerometer.addListener(({ x }) => {
        tilt.value = withSpring(
          Math.max(-1, Math.min(1, x)) * 22,
          { damping: 9, stiffness: 65, mass: 1.2 },
        );
      });
    });
    return () => sub?.remove();
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    d: buildWavePath(
      level.value,
      phase.value,
      tilt.value,
      splashAmp.value,
      splashFront.value,
      width,
      height,
    ),
  }));

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ borderRadius: 18, overflow: 'hidden' }}
    >
      <Defs>
        <LinearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.sky} stopOpacity={0.4} />
          <Stop offset="1" stopColor={Colors.sky} stopOpacity={0.85} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={Colors.surfaceSecondary} />

      {Array.from({ length: goal - 1 }).map((_, i) => {
        const x = ((i + 1) / goal) * width;
        return (
          <Line
            key={i}
            x1={x} y1={6} x2={x} y2={height - 6}
            stroke={Colors.line} strokeWidth={0.8} strokeDasharray="2 3"
          />
        );
      })}

      <AnimatedPath animatedProps={animatedProps} fill="url(#tideGrad)" />

      <SvgText
        x={14} y={20}
        fontSize={10} fill={Colors.ink3}
        fontFamily="Menlo, Courier, monospace" letterSpacing={1.2}
      >
        SU · GELGİT
      </SvgText>
      <SvgText x={14} y={height - 14} fontSize={22} fill={Colors.ink} fontFamily="Georgia, serif">
        {glasses}
      </SvgText>
      <SvgText
        x={14 + 22 * 0.6 + 4} y={height - 14}
        fontSize={13} fill={Colors.ink3} fontFamily="Georgia, serif"
      >
        {` / ${goal} bardak`}
      </SvgText>
    </Svg>
  );
}
