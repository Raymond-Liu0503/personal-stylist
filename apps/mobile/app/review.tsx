import { IntentSelectionSchema, intentPresets } from '@stylist/contracts';
import { IntentControl } from '../src/components/intent';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, TextInput, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Page, Button, Busy, Disclosure, ErrorText, styles } from '../src/components/ui';
import { useAnalysis } from '../src/state/analysis-context';
import { usePhotoLibrary } from '../src/services/use-photo-library';
import { useSession } from '../src/state/session';
export default function Review() {
    const { state, setPrompt, submit, cancel } = useAnalysis();
    const { bootstrap, error: sessionError, refresh } = useSession();
    const [refreshing, setRefreshing] = useState(false), [photoError, setPhotoError] = useState<string | null>(null), [optionsOpen, setOptionsOpen] = useState(false);
    const { height } = useWindowDimensions();
    const { choose: pickPhoto, choosing } = usePhotoLibrary();
    const moving = useRef(false);
    useEffect(() => () => { if (!moving.current)
        void cancel(true).catch(() => { }); }, []);
    const photo = state.prepared;
    const blocked = !bootstrap ? 'Account access could not be checked. Refresh access to try again.' : !bootstrap.consentAccepted ? 'Accept AI-processing consent on the home screen to continue.' : !bootstrap.betaAccess ? 'Your beta invitation is awaiting activation.' : !bootstrap.dailyQuotaExempt && bootstrap.remainingQuota <= 0 ? 'You have used all 3 daily analyses. The allowance resets at midnight UTC. Requests already sent, including retakes or interrupted assessments, may count.' : !bootstrap.features.outfit ? 'Analysis is currently unavailable. Refresh access to check again.' : null;
    const intent = state.intent ?? { id: 'general', custom: '' };
    const validIntent = IntentSelectionSchema.safeParse(intent).success;
    const choose = async () => { setPhotoError(null); try {
        await pickPhoto();
    }
    catch (e) {
        setPhotoError(e instanceof Error ? e.message : 'Unable to choose photo.');
    } };
    return <Page title="The look, in focus." footer={<><ErrorText message={blocked}/><Button title="Analyse outfit" disabled={!validIntent || !photo || !['ready', 'failed'].includes(state.status) || !!blocked || refreshing || choosing} onPress={() => { moving.current = true; void submit(); router.replace('/processing'); }}/>{blocked && <Button title={refreshing ? 'Checking access…' : 'Refresh access'} secondary disabled={refreshing} onPress={() => { setRefreshing(true); void refresh().catch(() => { }).finally(() => setRefreshing(false)); }}/>}</>}>
 {state.status === 'preparing' || choosing ? <Busy text="Preparing and reducing your photo…"/> : photo ? <Image accessibilityLabel="Outfit photo preview" source={{ uri: photo.uri }} style={[styles.photo, { height: Math.min(340, height * 0.36) }]}/> : <Text style={styles.text}>Choose a new photo to continue.</Text>}
 <ErrorText message={photoError ?? state.error}/>
 <Disclosure title={`Styling options · ${intentPresets.find(p => p.id === intent.id)?.label ?? 'General'}`} open={optionsOpen || !validIntent} onToggle={() => setOptionsOpen(v => !v)}><IntentControl /><TextInput accessibilityLabel="Optional outfit question" style={styles.input} multiline maxLength={1000} value={state.prompt} onChangeText={setPrompt} placeholder="Anything to consider? (optional)"/></Disclosure>
 <Text style={styles.muted}>Only this prepared photo is uploaded. Photos are not saved to your reports.</Text>
 {bootstrap && <Text style={styles.muted}>{bootstrap.dailyQuotaExempt ? 'Unlimited daily analyses · test account' : `${bootstrap.remainingQuota} of 3 daily analyses remaining.`}</Text>}<ErrorText message={sessionError ?? null}/>
 <Button title="Retake photo" secondary disabled={choosing} onPress={() => { void cancel(true).then(() => { moving.current = true; router.replace('/camera'); }).catch(e => setPhotoError(e.message)); }}/>
 <Button title="Choose another photo" secondary disabled={choosing} onPress={() => void choose()}/>
 </Page>;
}
