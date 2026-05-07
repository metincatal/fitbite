import React from 'react';
import { Text, View, StyleSheet, Platform } from 'react-native';
import type { TextStyle } from 'react-native';
import { Colors } from '../../lib/constants';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

type Seg = { text: string; bold: boolean; italic: boolean };

function parseInline(line: string): Seg[] {
  const segs: Seg[] = [];
  // Match **bold**, *italic*, or plain text — handles nested-edge cases minimally
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|([^*]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1] != null) segs.push({ text: m[1], bold: true, italic: false });
    else if (m[2] != null) segs.push({ text: m[2], bold: false, italic: true });
    else if (m[3] != null && m[3].length > 0) segs.push({ text: m[3], bold: false, italic: false });
  }
  return segs.length > 0 ? segs : [{ text: line, bold: false, italic: false }];
}

function InlineSpans({ segs }: { segs: Seg[] }): React.ReactNode {
  if (segs.length === 1 && !segs[0].bold && !segs[0].italic) return segs[0].text;
  return segs.map((s, i) => (
    <Text
      key={i}
      style={[
        s.bold ? styles.bold : undefined,
        s.italic ? styles.italic : undefined,
      ]}
    >
      {s.text}
    </Text>
  ));
}

interface Props {
  content: string;
  /** Override base text style (e.g. color for dark backgrounds). */
  baseStyle?: TextStyle;
}

/**
 * Lightweight markdown renderer for React Native.
 * Handles: ## headings, **bold**, *italic*, - bullets, 1. numbered lists, paragraphs.
 * No external dependencies.
 */
export function MarkdownText({ content, baseStyle }: Props) {
  const base: TextStyle = baseStyle
    ? { ...styles.base, ...baseStyle }
    : styles.base;

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // blank line → vertical gap
    if (trimmed === '') {
      nodes.push(<View key={`g${i}`} style={styles.gap} />);
      continue;
    }

    // heading: # / ## / ###
    const hm = trimmed.match(/^(#{1,3})\s+(.*)/);
    if (hm) {
      const level = hm[1].length;
      const hStyle = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
      nodes.push(
        <Text key={i} style={[base, hStyle]}>
          {hm[2]}
        </Text>
      );
      continue;
    }

    // bullet: - or •
    const bm = trimmed.match(/^[-•]\s+(.*)/);
    if (bm) {
      const segs = parseInline(bm[1]);
      nodes.push(
        <View key={i} style={styles.bulletRow}>
          <Text style={[base, styles.bulletDot]}>•</Text>
          <Text style={[base, styles.bulletBody]}>
            {InlineSpans({ segs })}
          </Text>
        </View>
      );
      continue;
    }

    // numbered list: 1. text
    const nm = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (nm) {
      const segs = parseInline(nm[2]);
      nodes.push(
        <View key={i} style={styles.bulletRow}>
          <Text style={[base, styles.bulletDot]}>{nm[1]}.</Text>
          <Text style={[base, styles.bulletBody]}>
            {InlineSpans({ segs })}
          </Text>
        </View>
      );
      continue;
    }

    // paragraph
    const segs = parseInline(trimmed);
    nodes.push(
      <Text key={i} style={[base, styles.para]}>
        {InlineSpans({ segs })}
      </Text>
    );
  }

  return <View>{nodes}</View>;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: SERIF,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
  } as TextStyle,

  bold: { fontWeight: '700' } as TextStyle,
  italic: { fontStyle: 'italic' } as TextStyle,

  h1: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 16,
    marginBottom: 6,
    lineHeight: 26,
  } as TextStyle,
  h2: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 24,
  } as TextStyle,
  h3: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 10,
    marginBottom: 3,
    lineHeight: 22,
  } as TextStyle,

  para: {
    marginBottom: 6,
    lineHeight: 22,
  } as TextStyle,

  gap: { height: 8 },

  bulletRow: {
    flexDirection: 'row',
    marginBottom: 5,
    gap: 7,
    alignItems: 'flex-start',
  },
  bulletDot: {
    color: Colors.ink3,
    lineHeight: 22,
    minWidth: 18,
  } as TextStyle,
  bulletBody: {
    flex: 1,
    lineHeight: 22,
  } as TextStyle,
});
