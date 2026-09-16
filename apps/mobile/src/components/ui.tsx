import React, { useState } from 'react';
import { Pressable, Text, ScrollView, StyleSheet, View, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/tokens';
export const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 20, gap: 16, paddingBottom: 24 },
    title: { fontFamily: theme.fonts.display, fontSize: 34, lineHeight: 40, color: theme.colors.ink },
    heading: { fontSize: 19, lineHeight: 25, fontWeight: '600', color: theme.colors.ink },
    text: { fontSize: 16, lineHeight: 23, color: theme.colors.ink }, muted: { fontSize: 13, lineHeight: 19, color: theme.colors.muted },
    eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 2, color: theme.colors.accent, textTransform: 'uppercase' },
    card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, gap: 10, borderWidth: 1, borderColor: theme.colors.line },
    button: { minHeight: 48, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: 'white', fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
    input: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: 10, padding: 14, fontSize: 16, color: theme.colors.ink, backgroundColor: theme.colors.surface, minHeight: 48 },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
    error: { color: theme.colors.error, fontSize: 14, lineHeight: 21 }, photo: { width: '100%', height: 300, borderRadius: 12, resizeMode: 'contain' },
    divider: { height: 1, backgroundColor: theme.colors.line },
    footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 8, borderTopWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface },
    disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
export function Page({ title, children, footer, topInset = false, bottomInset = true }: {
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    topInset?: boolean;
    bottomInset?: boolean;
}) {
    const { fontScale, height } = useWindowDimensions();
    const inlineFooter = fontScale > 1.3 || height < 650;
    return <SafeAreaView style={styles.page} edges={['left', 'right', ...(topInset ? ['top' as const] : []), ...(bottomInset ? ['bottom' as const] : [])]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.title}>{title}</Text>{children}{footer && inlineFooter && <View style={{ gap: 8, paddingTop: 12 }}>{footer}</View>}</ScrollView>{footer && !inlineFooter && <View style={styles.footer}>{footer}</View>}</KeyboardAvoidingView></SafeAreaView>;
}
export function Button({ title, onPress, disabled = false, secondary = false, accessibilityLabel = title }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    secondary?: boolean;
    accessibilityLabel?: string;
}) { return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.line }, { opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}><Text style={[styles.buttonText, secondary && { color: theme.colors.ink }]}>{title}</Text></Pressable>; }
export function Card({ children }: {
    children: React.ReactNode;
}) { return <View style={styles.card}>{children}</View>; }
export function ErrorText({ message }: {
    message: string | null;
}) { return message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null; }
export function Busy({ text }: {
    text: string;
}) { return <View style={{ gap: 14 }}><ActivityIndicator color={theme.colors.accent} size="large"/><Text accessibilityLiveRegion="polite" style={styles.text}>{text}</Text></View>; }
export function Disclosure({ title, children, open, onToggle }: {
    title: string;
    children: React.ReactNode;
    open?: boolean;
    onToggle?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const visible = open ?? expanded;
    return <View style={{ borderTopWidth: 1, borderColor: theme.colors.line }}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: visible }} onPress={onToggle ?? (() => setExpanded(v => !v))} style={styles.disclosure}><Text numberOfLines={3} style={[styles.text, { fontWeight: '600', flex: 1 }]}>{title}</Text><Text importantForAccessibility="no" style={styles.heading}>{visible ? '−' : '+'}</Text></Pressable>{visible && <View style={{ gap: 10, paddingBottom: 12 }}>{children}</View>}</View>;
}
export function ReadMore({ text, lines = 3 }: {
    text: string;
    lines?: number;
}) {
    const [expanded, setExpanded] = useState(false), [overflows, setOverflows] = useState(false);
    return <View><View><Text pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.text, { position: 'absolute', opacity: 0, left: 0, right: 0 }]} onTextLayout={e => setOverflows(e.nativeEvent.lines.length > lines)}>{text}</Text><Text style={styles.text} numberOfLines={expanded ? undefined : lines}>{text}</Text></View>{(overflows || expanded) && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(v => !v)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[styles.muted, { color: theme.colors.accent, fontWeight: '600' }]}>{expanded ? 'Show less' : 'Read more'}</Text></Pressable>}</View>;
}
