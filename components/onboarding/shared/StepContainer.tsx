import React from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Spacing } from '../../../lib/constants';

interface StepContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function StepContainer({ children, scrollable = true }: StepContainerProps) {
  const content = (
    <View style={styles.inner}>
      {children}
    </View>
  );

  const kvBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  if (!scrollable) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={kvBehavior}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={kvBehavior}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
