import React, { useEffect, useRef } from 'react';
import { Animated, View, Platform } from 'react-native';
import Svg, { Line as SvgLine, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Reanimated, {
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
import { WaterLog } from '../../types';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

function buildWavePath(
  surfaceY: number,
  phase: number,
  tiltOffset: number,
  splashAmp: number,
  splashFront: number,
  width: number,
  height: number,
  overflowExtra: number,
): string {
  'worklet';
  const ambientAmp = 2.5 + overflowExtra * 6;
  let d = 'M 0 ' + (surfaceY - tiltOffset);
  for (let x = 6; x <= width; x += 6) {
    const norm = x / width;
    const tiltY = tiltOffset * (2 * norm - 1);
    let y =
      surfaceY +
      tiltY +
      Math.sin(x * 0.07 + phase) * ambientAmp +
      Math.sin(x * 0.13 - phase * 0.8 + 1.0) * (ambientAmp * 0.35);

    if (splashAmp > 0.1) {
      const d2f = x - splashFront;
      const crest = splashAmp * 1.5 * Math.exp(-(d2f * d2f) / 800);
      const wakeAmp = d2f < 0 ? splashAmp * 0.55 * Math.exp(d2f * 0.018) : 0;
      const wake = wakeAmp * Math.sin(-d2f * 0.18 + phase * 2.5);
      y -= crest + wake;
    }

    d += ' L ' + x + ' ' + y;
  }
  return d + ' L ' + width + ' ' + height + ' L 0 ' + height + ' Z';
}

// ── Drip particle for overflow animation ──────────────────────────────────────
function AnimDrip({
  left,
  poolHeight,
  color,
  delay,
  isActive,
  duration,
}: {
  left: number;
  poolHeight: number;
  color: string;
  delay: number;
  isActive: boolean;
  duration: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive) {
      animRef.current = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ),
      ]);
      animRef.current.start();
    } else {
      animRef.current?.stop();
      anim.setValue(0);
    }
    return () => animRef.current?.stop();
  }, [isActive]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, poolHeight + 28] });
  const opacity = anim.interpolate({ inputRange: [0, 0.12, 0.72, 1], outputRange: [0, 0.92, 0.55, 0] });
  const scaleY = anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.6, 1.5, 1.0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: left - 3,
        top: 0,
        width: 6,
        height: 11,
        borderRadius: 3,
        backgroundColor: color,
        transform: [{ translateY }, { scaleY }],
        opacity,
      }}
    />
  );
}

// ── Public interface ──────────────────────────────────────────────────────────
interface TideProps {
  waterMl: number;
  goalMl: number;
  bonusMl?: number;
  stepBonusMl?: number;
  waterLogs?: WaterLog[];
  width?: number;
  height?: number;
}

export function Tide({
  waterMl,
  goalMl,
  bonusMl = 0,
  stepBonusMl = 0,
  waterLogs = [],
  width = 340,
  height = 86,
}: TideProps) {
  const effectiveGoal = goalMl + bonusMl + stepBonusMl;
  const pct = Math.min(1, waterMl / Math.max(1, effectiveGoal));
  const isOverflow = waterMl > effectiveGoal;
  // overflowExtra: 0–1 scale of how far past the goal we are
  const overflowExtra = isOverflow
    ? Math.min(1, (waterMl - effectiveGoal) / Math.max(1, effectiveGoal * 0.25))
    : 0;

  const targetSurfaceY = height - pct * (height - 8);

  const phase = useSharedValue(0);
  const tilt = useSharedValue(0);
  const splashAmp = useSharedValue(0);
  const splashFront = useSharedValue(-200);
  const level = useSharedValue(targetSurfaceY);
  const overflow = useSharedValue(overflowExtra);
  const prevWaterMl = useRef(waterMl);

  // Continuous wave — period = LCM(2π, 2.5π) = 10π so both sine components
  // complete integer cycles on every repeat, eliminating the visible phase jump.
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(Math.PI * 10, {
        duration: 15000, // 3 s per 2π-equivalent cycle × 5 cycles
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, []); // no deps — never restart, amplitude already reflects overflow via overflowExtra

  // Smooth water-level change
  useEffect(() => {
    level.value = withSpring(targetSurfaceY, { damping: 20, stiffness: 120 });
    overflow.value = withSpring(overflowExtra, { damping: 14, stiffness: 90 });
  }, [targetSurfaceY, overflowExtra]);

  // Splash wave when water is added
  useEffect(() => {
    if (waterMl > prevWaterMl.current) {
      cancelAnimation(splashFront);
      cancelAnimation(splashAmp);
      splashFront.value = 0;
      splashAmp.value = 9;
      splashFront.value = withTiming(width + 80, { duration: 680, easing: Easing.out(Easing.quad) });
      splashAmp.value = withTiming(0, { duration: 1600, easing: Easing.out(Easing.quad) });
    }
    prevWaterMl.current = waterMl;
  }, [waterMl]);

  // Accelerometer tilt → realistic liquid inertia
  useEffect(() => {
    let sub: ReturnType<typeof Accelerometer.addListener> | undefined;
    Accelerometer.isAvailableAsync().then((ok) => {
      if (!ok) return;
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener(({ x }) => {
        tilt.value = withSpring(Math.max(-1, Math.min(1, x)) * 22, {
          damping: 9,
          stiffness: 65,
          mass: 1.2,
        });
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
      overflow.value,
    ),
  }));

  // ── Log divider lines ────────────────────────────────────────────────────
  // Calculate cumulative positions for each log entry to show as layers
  const logDividers: { y: number }[] = [];
  if (waterLogs.length > 1 && waterMl > 0) {
    const waterFillH = Math.max(0, height - targetSurfaceY);
    let cumMl = 0;
    let lastY = height;
    const MIN_GAP = 12; // px — skip lines that are too close

    for (let i = 0; i < waterLogs.length - 1; i++) {
      cumMl += waterLogs[i].amount_ml;
      if (cumMl >= waterMl) break;
      const lineY = height - (cumMl / waterMl) * waterFillH;
      if (
        lineY > targetSurfaceY + 7 &&
        lineY < height - 6 &&
        lastY - lineY >= MIN_GAP
      ) {
        logDividers.push({ y: lineY });
        lastY = lineY;
      }
    }
  }

  // Dashed line at original goalMl level when exercise bonus raises the bar
  const baseLevelY =
    bonusMl > 0 ? height - (goalMl / Math.max(1, effectiveGoal)) * (height - 8) : null;

  // ── Text formatting ──────────────────────────────────────────────────────
  const fmt = (ml: number) => (ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}`);
  const mlText = fmt(waterMl);
  const goalText = fmt(effectiveGoal);
  // Approximate x offset for goal text (Georgia at fontSize 20 ≈ 12px/char)
  const goalTextX = 14 + mlText.length * 12 + 5;

  const dripExtension = isOverflow ? 30 : 0;

  return (
    <View style={{ position: 'relative', width, height: height + dripExtension }}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ borderRadius: 18, overflow: 'hidden' }}
      >
        <Defs>
          <LinearGradient id="tideGrad2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.sky} stopOpacity={isOverflow ? 0.65 : 0.38} />
            <Stop offset="1" stopColor={Colors.sky} stopOpacity={isOverflow ? 1.0 : 0.82} />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Rect x={0} y={0} width={width} height={height} fill={Colors.surfaceSecondary} />

        {/* Base goal level indicator (when exercise bonus applies) */}
        {baseLevelY !== null && baseLevelY > 5 && baseLevelY < height - 5 && (
          <SvgLine
            x1={0}
            y1={baseLevelY}
            x2={width}
            y2={baseLevelY}
            stroke={Colors.primary}
            strokeWidth={1}
            strokeDasharray="5 4"
            strokeOpacity={0.3}
          />
        )}

        {/* Wave fill */}
        <AnimatedPath animatedProps={animatedProps} fill="url(#tideGrad2)" />

        {/* Log layer dividers — rendered above wave for visibility */}
        {logDividers.map((d, i) => (
          <SvgLine
            key={i}
            x1={0}
            y1={d.y}
            x2={width}
            y2={d.y}
            stroke="white"
            strokeWidth={1}
            strokeDasharray="4 6"
            strokeOpacity={0.28}
          />
        ))}

        {/* Status label — top left */}
        <SvgText
          x={14}
          y={20}
          fontSize={9}
          fill={isOverflow ? Colors.terracotta : Colors.ink3}
          fontFamily={MONO}
          letterSpacing={1.2}
          fontWeight={isOverflow ? '700' : '400'}
        >
          {isOverflow ? 'DOLU · TAŞIYOR' : 'SU · GELGİT'}
        </SvgText>

        {/* Exercise bonus badge — top right */}
        {bonusMl > 0 && (
          <SvgText
            x={width - 12}
            y={20}
            fontSize={9}
            fill={Colors.primary}
            fontFamily={MONO}
            letterSpacing={0.7}
            textAnchor="end"
            fontWeight="600"
          >
            {`EGZ.+${bonusMl}ml`}
          </SvgText>
        )}
        {/* Step bonus badge — top right, below exercise badge if both visible */}
        {stepBonusMl > 0 && (
          <SvgText
            x={width - 12}
            y={bonusMl > 0 ? 32 : 20}
            fontSize={9}
            fill={Colors.ink3}
            fontFamily={MONO}
            letterSpacing={0.7}
            textAnchor="end"
            fontWeight="600"
          >
            {`ADIM.+${stepBonusMl}ml`}
          </SvgText>
        )}

        {/* Amount — bottom left */}
        <SvgText
          x={14}
          y={height - 10}
          fontSize={20}
          fill={Colors.ink}
          fontFamily="Georgia, serif"
        >
          {mlText}
        </SvgText>
        <SvgText
          x={goalTextX}
          y={height - 10}
          fontSize={11}
          fill={Colors.ink3}
          fontFamily="Georgia, serif"
        >
          {`/ ${goalText}`}
        </SvgText>

        {/* Unit — bottom right */}
        <SvgText
          x={width - 12}
          y={height - 10}
          fontSize={9}
          fill={Colors.ink3}
          fontFamily={MONO}
          textAnchor="end"
          letterSpacing={0.8}
        >
          ML
        </SvgText>
      </Svg>

      {/* Overflow drip particles */}
      {isOverflow && (
        <>
          <AnimDrip
            left={12}
            poolHeight={height}
            color={Colors.sky + 'CC'}
            delay={0}
            isActive={isOverflow}
            duration={880}
          />
          <AnimDrip
            left={width - 12}
            poolHeight={height}
            color={Colors.sky + 'BB'}
            delay={370}
            isActive={isOverflow}
            duration={1060}
          />
          <AnimDrip
            left={Math.round(width * 0.38)}
            poolHeight={height}
            color={Colors.sky + 'AA'}
            delay={650}
            isActive={isOverflow}
            duration={940}
          />
        </>
      )}
    </View>
  );
}
