// HoloCore.tsx - animated holographic core visualization.
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

export const HoloCore: React.FC<{ size?: number }> = ({ size = 100 }) => {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, {
      toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: false,
    }));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: false }),
    ]));
    loop.start();
    pulseLoop.start();
    return () => { loop.stop(); pulseLoop.stop(); };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.05] });
  const glow = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.primary, COLORS.secondary],
  });

  return (
    <View style={[styles.wrap, { height: size, width: size }]}>
      <Animated.View style={[styles.ring, {
        width: size, height: size, borderRadius: size / 2,
        borderColor: glow, transform: [{ rotate }, { scale }],
      }]} />
      <Animated.View style={[styles.ring2, {
        width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3,
        borderColor: glow, transform: [{ rotate: rotate as any }, { scale }],
      }]} />
      <Animated.View style={[styles.core, {
        width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125,
        backgroundColor: glow, transform: [{ scale }],
      }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  ring: { position: 'absolute', borderWidth: 2, opacity: 0.8 },
  ring2: { position: 'absolute', borderWidth: 1, opacity: 0.6 },
  core: { opacity: 0.9 },
});
