import React, { useRef } from 'react';
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '../src/state/session';
import { AnalysisProvider } from '../src/state/analysis-context';
import { theme } from '../src/theme/tokens';
export default function Layout() { return <SessionProvider><AnalysisProvider><Navigation /></AnalysisProvider></SessionProvider>; }
function Navigation() { const { session, bootstrap } = useSession(); const access = useRef<{
    user: string;
    accepted: boolean;
} | null>(null); if (!session)
    access.current = null;
else if (bootstrap)
    access.current = { user: session.user.id, accepted: bootstrap.consentAccepted }; const allowed = !!session && access.current?.user === session.user.id && access.current.accepted; return <Stack screenOptions={{ headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.ink, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.colors.background } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }}/><Stack.Protected guard={allowed}><Stack.Screen name="camera" options={{ headerShown: false }}/><Stack.Screen name="review" options={{ title: 'Your photo' }}/><Stack.Screen name="processing" options={{ title: 'Assessment', headerBackVisible: false, gestureEnabled: false }}/><Stack.Screen name="results" options={{ title: 'Your assessment', headerBackVisible: false, gestureEnabled: false }}/></Stack.Protected></Stack>; }
