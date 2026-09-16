import React, { useState, useRef, useEffect } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { SavedReportSchema } from '@stylist/contracts';
import { Page, Button, Disclosure, ErrorText, styles } from '../src/components/ui';
import { ReportView } from '../src/components/report';
import { useAnalysis } from '../src/state/analysis-context';
import { useSession } from '../src/state/session';
import { api } from '../src/services/api';
export default function Results() {
    const { state, cancel } = useAnalysis();
    const { refresh } = useSession();
    const result = state.result;
    const [saved, setSaved] = useState<string | null>(null), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState(false), [error, setError] = useState<string | null>(null);
    const locked = useRef(false), leaving = useRef(false), latestCancel = useRef(cancel);
    latestCancel.current = cancel;
    useEffect(() => () => { if (!leaving.current)
        void Promise.resolve(latestCancel.current()).catch(() => { }); }, []);
    const run = async (fn: () => Promise<void>) => { if (locked.current)
        return; locked.current = true; setBusy(true); try {
        await fn();
        setError(null);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
    }
    finally {
        locked.current = false;
        setBusy(false);
    } };
    const leave = async (path: '/' | '/history' | '/camera', preserveBrief = false) => { await cancel(preserveBrief); leaving.current = true; void refresh().catch(() => { }); router.dismissTo(path); };
    const suggestionFeedback = async (index: number, helpful: boolean) => { try {
        await api('/feedback', z.object({ received: z.boolean() }), { method: 'POST', body: { runId: result?.kind === 'report' ? result.report.runId : '', suggestionIndex: index, helpful } });
        setError(null);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
        throw e;
    } };
    const footer = <><ErrorText message={error}/>{result?.kind === 'report' ? <><Button title={saved ? 'Saved to history' : 'Save report'} accessibilityLabel={saved ? 'Saved to history' : 'Save text report'} disabled={busy || !!saved} onPress={() => void run(async () => { if (saved)
        return; const row = await api('/reports', SavedReportSchema, { method: 'POST', body: { report: result.report, receipt: result.receipt } }); setSaved(row.id); })}/><Text accessibilityLiveRegion="polite" style={styles.muted}>{saved ? 'Your text report is saved.' : 'Text only · unsaved reports clear when you leave.'}</Text></> : result?.kind === 'retake' ? <Button title="Retake this outfit" disabled={busy} onPress={() => void run(() => leave('/camera', true))}/> : null}<View style={styles.row}><View style={{ flex: 1 }}><Button title="Home" secondary disabled={busy} onPress={() => void run(() => leave('/'))}/></View><View style={{ flex: 1 }}><Button title="Saved reports" secondary disabled={busy} onPress={() => void run(() => leave('/history'))}/></View></View></>;
    return <Page title={result?.kind === 'retake' ? 'A clearer view.' : 'Your outfit notes.'} footer={footer}>
 {result?.kind === 'report' ? <><ReportView key={result.report.runId} report={result.report} onSuggestionFeedback={suggestionFeedback}/><Disclosure title="Share feedback"><Button title={feedback ? 'Thanks for your feedback' : 'This was helpful'} secondary disabled={busy || feedback} onPress={() => void run(async () => { await api('/feedback', z.object({ received: z.boolean() }), { method: 'POST', body: { helpful: true, issues: [], ...(saved ? { savedReportId: saved } : {}) } }); setFeedback(true); })}/><Button title="Report invented details" secondary disabled={busy || feedback} onPress={() => void run(async () => { await api('/feedback', z.object({ received: z.boolean() }), { method: 'POST', body: { helpful: false, issues: ['invented_details'], ...(saved ? { savedReportId: saved } : {}) } }); setFeedback(true); })}/></Disclosure><Text style={styles.muted}>Saving is available for 24 hours. Photos are never saved to your history.</Text></> : result?.kind === 'retake' ? <>{result.instructions.map((s, i) => <Text key={i} style={styles.text}>{s}</Text>)}<Text style={styles.muted}>No rating was produced. This assessment counts toward the daily allowance.</Text></> : <Text style={styles.text}>There is no assessment in memory.</Text>}
 <Button title="Start a new outfit" secondary disabled={busy} onPress={() => void run(() => leave('/camera'))}/>
 </Page>;
}
