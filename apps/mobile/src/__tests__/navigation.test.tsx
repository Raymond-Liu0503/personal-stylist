import React from 'react';
import { render, screen } from '@testing-library/react-native';
let mockSession: unknown = { user: { id: 'user-a' } };
let mockBootstrap: unknown = { consentAccepted: true };
jest.mock('../state/session', () => ({ useSession: () => ({ session: mockSession, bootstrap: mockBootstrap }), SessionProvider: ({ children }: any) => children }));
jest.mock('../state/analysis-context', () => ({ AnalysisProvider: ({ children }: any) => children }));
jest.mock('expo-router', () => {
    const { View, Text } = jest.requireActual('react-native');
    const Navigator = ({ children, screenOptions }: any) => <View testID="navigator" accessibilityLabel={screenOptions?.tabBarStyle?.display === 'none' ? 'Tabs hidden' : 'Navigation'}>{children}</View>;
    Navigator.Screen = ({ name, options }: any) => <Text>{options?.title ?? name}</Text>;
    Navigator.Protected = ({ guard, children }: any) => guard ? children : null;
    return { Tabs: Navigator, Stack: Navigator };
});
import Tabs from '../../app/(tabs)/_layout';
import Layout from '../../app/_layout';
beforeEach(() => { mockSession = { user: { id: 'user-a' } }; mockBootstrap = { consentAccepted: true }; });
it('offers Home, Saved and Account after onboarding', () => { render(<Tabs />); for (const label of ['Home', 'Saved', 'Account'])
    expect(screen.getByText(label)).toBeTruthy(); expect(screen.queryByLabelText('Tabs hidden')).toBeNull(); });
it('keeps tabs hidden before consent and preserves signed-in account access', () => { mockBootstrap = { consentAccepted: false }; render(<Tabs />); expect(screen.getByLabelText('Tabs hidden')).toBeTruthy(); expect(screen.getByText('Account')).toBeTruthy(); expect(screen.queryByText('Saved')).toBeNull(); });
it('does not expose private destinations when signed out', () => { mockSession = null; render(<Tabs />); expect(screen.queryByText('Saved')).toBeNull(); expect(screen.queryByText('Account')).toBeNull(); });
it('keeps analysis routes through refresh errors, then removes them when consent is withdrawn', () => { const ui = render(<Layout />); expect(screen.getByText('Your photo')).toBeTruthy(); mockBootstrap = null; ui.rerender(<Layout />); expect(screen.getByText('Your photo')).toBeTruthy(); mockBootstrap = { consentAccepted: false }; ui.rerender(<Layout />); expect(screen.queryByText('Your photo')).toBeNull(); });
it('never carries consent across accounts', () => { const ui = render(<Layout />); mockSession = { user: { id: 'user-b' } }; mockBootstrap = null; ui.rerender(<Layout />); expect(screen.queryByText('Your photo')).toBeNull(); });
