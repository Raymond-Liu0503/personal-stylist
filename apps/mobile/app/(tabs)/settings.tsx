import React, { useState, useEffect } from 'react';
import { Text, TextInput, Alert, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { POLICY_VERSION, PreferencesSchema } from '@stylist/contracts';
import { Page, Button, Disclosure, ErrorText, styles } from '../../src/components/ui';
import { useSession } from '../../src/state/session';
import { useAnalysis } from '../../src/state/analysis-context';
import { appleSignIn } from '../../src/services/auth';
import { api } from '../../src/services/api';
export default function Settings() {
    const { bootstrap, refresh, signOut } = useSession();
    const { cancel } = useAnalysis();
    const [style, setStyle] = useState(''), [constraints, setConstraints] = useState(''), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null), [busy, setBusy] = useState(false);
    useEffect(() => { setStyle(bootstrap?.profile.desiredStyle ?? ''); setConstraints(bootstrap?.profile.constraints?.join('\n') ?? ''); }, [bootstrap]);
    const run = async (fn: () => Promise<void>) => { setBusy(true); setError(null); try {
        await fn();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
    }
    finally {
        setBusy(false);
    } };
    return <Page topInset bottomInset={!bootstrap?.consentAccepted} title="Your account."><Text style={styles.eyebrow}>PERSONAL STYLIST</Text>{!bootstrap?.consentAccepted && <Button title="Back to Home" secondary onPress={() => router.replace('/')}/>}<Text style={styles.heading}>Your allowance</Text><Text style={styles.text}>{bootstrap?.dailyQuotaExempt ? 'Unlimited daily analyses · test account' : `${bootstrap?.remainingQuota ?? '—'} of 3 daily analyses remaining.`}</Text><View style={styles.divider}/><Text style={styles.heading}>Style preferences</Text><Text style={styles.text}>Preferences are optional and can be used as explicit context for future assessments.</Text><TextInput accessibilityLabel="Preferred style" style={styles.input} placeholder="Preferred style (optional)" value={style} onChangeText={setStyle} maxLength={160}/><TextInput accessibilityLabel="Styling constraints, one per line" style={styles.input} placeholder="Constraints, one per line (optional)" multiline value={constraints} onChangeText={setConstraints} maxLength={1600}/><Button title="Save preferences" disabled={busy} onPress={() => void run(async () => { await api('/profile', PreferencesSchema, { method: 'PUT', body: { ...(style.trim() ? { desiredStyle: style.trim() } : {}), ...(constraints.trim() ? { constraints: constraints.split('\n').map(s => s.trim()).filter(Boolean) } : {}) } }); await refresh(); setNotice('Preferences saved.'); })}/><Disclosure title="Privacy and consent"><Text style={styles.text}>Only reports you explicitly save are stored in history. Operational records contain no photos, prompts, or report content and are retained for 30 days. Hosting and AI-provider retention requires separate review.</Text><Text style={styles.muted}>Policy {POLICY_VERSION} · {bootstrap?.consentAccepted ? 'Accepted' : 'Not accepted'}</Text><Button title="Withdraw AI-processing consent" secondary disabled={busy || !bootstrap?.consentAccepted} onPress={() => void run(async () => { await cancel(); await api('/consents', z.object({ accepted: z.boolean() }), { method: 'POST', body: { policyVersion: POLICY_VERSION, accepted: false, adultConfirmed: false } }); await refresh(); router.replace('/'); })}/></Disclosure><ErrorText message={error}/>{notice && <Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}<Button title="Sign out" secondary disabled={busy} onPress={() => void run(async () => { await cancel(); await signOut(); router.replace('/'); })}/><Button title="Delete account" secondary disabled={busy} onPress={() => Alert.alert('Delete your account?', 'This deletes your saved reports and profile. Apple will ask you to authorise again.', [{ text: 'Keep account', style: 'cancel' }, { text: 'Delete account', style: 'destructive', onPress: () => void run(async () => { await cancel(); const credential = await appleSignIn(); if (!credential.authorizationCode)
                throw new Error('Fresh Apple authorisation is required.'); await api('/account', z.object({ deleted: z.boolean() }), { method: 'DELETE', body: { authorizationCode: credential.authorizationCode } }); await signOut(); router.replace('/'); }) }])}/></Page>;
}
