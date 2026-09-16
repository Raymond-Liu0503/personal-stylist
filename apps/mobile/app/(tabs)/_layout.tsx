import React from 'react';
import { Tabs } from 'expo-router';
import { useSession } from '../../src/state/session';
import { Icon } from '../../src/components/icon';
import { theme } from '../../src/theme/tokens';
export default function TabLayout() {
    const { session, bootstrap } = useSession();
    const onboarded = !!session && !!bootstrap?.consentAccepted;
    return <Tabs initialRouteName="index" screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.accent, tabBarInactiveTintColor: theme.colors.muted, tabBarStyle: onboarded ? { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.line } : { display: 'none' }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, tabBarItemStyle: { paddingTop: 6 } }}>
 <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <Icon name="home" color={focused ? theme.colors.accent : theme.colors.muted}/> }}/>
 <Tabs.Protected guard={onboarded}><Tabs.Screen name="history" options={{ title: 'Saved', tabBarIcon: ({ focused }) => <Icon name="saved" color={focused ? theme.colors.accent : theme.colors.muted}/> }}/></Tabs.Protected>
 <Tabs.Protected guard={!!session}><Tabs.Screen name="settings" options={{ title: 'Account', tabBarIcon: ({ focused }) => <Icon name="account" color={focused ? theme.colors.accent : theme.colors.muted}/> }}/></Tabs.Protected>
 </Tabs>;
}
