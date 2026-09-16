import React, { useState } from 'react';
import { Text, View, Switch, Pressable } from 'react-native';
import { router } from 'expo-router';
import { usePhotoLibrary } from '../../src/services/use-photo-library';
import { Icon } from '../../src/components/icon';
import { theme } from '../../src/theme/tokens';
import { SignIn } from '../../src/components/sign-in';
import { z } from 'zod';
import { POLICY_VERSION } from '@stylist/contracts';
import { Page, Button, Card, ErrorText, Busy, styles } from '../../src/components/ui';
import { useSession } from '../../src/state/session';
import { useAnalysis } from '../../src/state/analysis-context';
import { appleSignIn, configured } from '../../src/services/auth';
import { api } from '../../src/services/api';
export default function Home() {
    const { session, bootstrap, loading, error: sessionError, refresh } = useSession();
    const { cancel } = useAnalysis();
    const { choose, choosing } = usePhotoLibrary();
    const [adult, setAdult] = useState(false), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
    const run = async (fn: () => Promise<unknown>) => { setBusy(true); setError(null); try {
        await fn();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
    }
    finally {
        setBusy(false);
    } };
    if (loading)
        return <Page topInset bottomInset={!bootstrap?.consentAccepted} title="Personal Stylist"><Busy text="Preparing your private workspace…"/></Page>;
    if (session && !bootstrap)
        return <Page topInset title="Your workspace.">{sessionError ? <><ErrorText message={sessionError}/><Button title="Retry account access" disabled={busy} onPress={() => void run(refresh)}/><Button title="Account" secondary onPress={() => router.push('/settings')}/></> : <Busy text="Checking your account…"/>}</Page>;
    if (!session || !bootstrap?.consentAccepted)
        return <Page topInset bottomInset={!bootstrap?.consentAccepted} title="A fresh eye on your outfit."><Text style={styles.text}>A considered second opinion, with practical changes you can try. For adults in our invited iPhone beta.</Text><Card><Text style={styles.heading}>Your photo, one assessment</Text><Text style={styles.text}>Your photo and optional prompt are sent to our hosting and AI providers for this assessment. We do not save photos or unsaved reports in application storage. Provider processing and retention follow the beta privacy policy.</Text><Text style={styles.text}>History contains only text reports you choose to save. Cancellation cannot undo processing that already started.</Text></Card><View style={styles.row}><Switch accessibilityLabel="I am 18 or older" value={adult} onValueChange={setAdult}/><Text style={styles.text}>I am 18 or older</Text></View><View style={styles.row}><Switch accessibilityLabel="I consent to AI photo processing" value={consent} onValueChange={setConsent}/><Text style={styles.text}>I consent to this AI processing</Text></View><Text style={styles.muted}>Policy version {POLICY_VERSION}. You can withdraw consent in Account.</Text>{!configured && <ErrorText message="Add your public Supabase configuration to open the beta."/>}<ErrorText message={error ?? sessionError}/>{session ? <Button title="Accept and continue" disabled={busy || !adult || !consent} onPress={() => void run(async () => { await api('/consents', z.object({ accepted: z.boolean() }), { method: 'POST', body: { policyVersion: POLICY_VERSION, accepted: true, adultConfirmed: true } }); await refresh(); })}/> : <SignIn disabled={busy || !adult || !consent} onApple={() => void run(async () => { await appleSignIn(); await api('/consents', z.object({ accepted: z.boolean() }), { method: 'POST', body: { policyVersion: POLICY_VERSION, accepted: true, adultConfirmed: true } }); await refresh(); })} onLocal={login => void run(async () => { await login(); await api('/consents', z.object({ accepted: z.boolean() }), { method: 'POST', body: { policyVersion: POLICY_VERSION, accepted: true, adultConfirmed: true } }); await refresh(); })}/>}{session && <Button title="Account" secondary onPress={() => router.push('/settings')}/>}</Page>;
    const select = async () => { if (await choose())
        router.push('/review'); };
    return <Page topInset bottomInset={!bootstrap?.consentAccepted} title="A fresh perspective.">
 <View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={styles.eyebrow}>PERSONAL STYLIST</Text><Text style={styles.muted}>{bootstrap.analysisMode === 'mock' ? 'MOCK · Sample feedback' : 'OUTFIT NOTES'}</Text></View>
 <Text style={styles.text}>Good style starts with what you have.</Text>
 <Pressable accessibilityRole="button" accessibilityLabel="Take a photo" accessibilityState={{ disabled: busy || choosing }} disabled={busy || choosing} onPress={() => void run(async () => { await cancel(true); router.push('/camera'); })} style={({ pressed }) => ({ backgroundColor: theme.colors.accent, borderRadius: 16, minHeight: 235, padding: 28, justifyContent: 'space-between', gap: 20, opacity: busy ? 0.5 : pressed ? 0.85 : 1 })}>
 <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={32} color="white"/></View>
 <View style={{ gap: 8 }}><Text style={[styles.title, { color: 'white', fontSize: 32 }]}>Let’s see the look.</Text><View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ color: '#F1DBE1', fontSize: 15 }}>Take an outfit photo</Text><Text style={{ color: 'white', fontSize: 24 }}>↗</Text></View></View>
 </Pressable>
 <Button title="Choose photo" secondary disabled={busy || choosing} onPress={() => void run(select)}/>
 <View style={{ gap: 6, paddingVertical: 8 }}><Text style={styles.eyebrow}>A BETTER SECOND OPINION</Text><Text style={styles.text}>Find even light. Leave room for the shoes.</Text><Text style={styles.muted}>A clear, full-outfit photo gives us more to work with.</Text></View>
 <View style={styles.divider}/><Text style={styles.muted}>{bootstrap.dailyQuotaExempt ? 'Unlimited daily analyses · test account' : `${bootstrap.remainingQuota} of 3 daily analyses remaining.`}{!bootstrap.betaAccess ? ' Your invitation is awaiting activation.' : ''}{!bootstrap.features.outfit ? ' Analysis is currently paused.' : ''}</Text><ErrorText message={error ?? sessionError}/>
 </Page>;
}
