import React, { useState, useCallback, useRef } from 'react';
import { Text, Alert, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { z } from 'zod';
import { HistorySchema, type OutfitReport } from '@stylist/contracts';
import { Page, Button, ErrorText, styles } from '../../src/components/ui';
import { ReportView } from '../../src/components/report';
import { api } from '../../src/services/api';
import { useSession } from '../../src/state/session';
type Row = {
    id: string;
    created_at: string;
    report: OutfitReport;
};
export default function History() {
    const { session } = useSession();
    const [items, setItems] = useState<Row[]>([]), [cursor, setCursor] = useState<string | null>(null), [selected, setSelected] = useState<Row | null>(null), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
    const generation = useRef(0), focused = useRef(false);
    const load = async (next?: string) => { const token = ++generation.current; setBusy(true); try {
        const data = await api(`/reports${next ? `?cursor=${encodeURIComponent(next)}` : ''}`, HistorySchema);
        if (!focused.current || token !== generation.current)
            return;
        setItems(old => next ? [...old, ...data.items] : data.items);
        setCursor(data.nextCursor);
        setError(null);
    }
    catch (e) {
        if (focused.current && token === generation.current)
            setError(e instanceof Error ? e.message : 'Unable to load reports.');
    }
    finally {
        if (focused.current && token === generation.current)
            setBusy(false);
    } };
    useFocusEffect(useCallback(() => { focused.current = true; if (session)
        void load(); return () => { focused.current = false; generation.current++; setItems([]); setSelected(null); setCursor(null); setError(null); setBusy(false); }; }, [session?.user.id]));
    const remove = (row: Row) => Alert.alert('Delete saved report?', 'This removes the saved text assessment.', [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { setBusy(true); void api(`/reports/${row.id}`, z.object({ deleted: z.boolean() }), { method: 'DELETE' }).then(() => { setSelected(null); setItems(old => old.filter(r => r.id !== row.id)); }).catch(e => setError(e.message)).finally(() => setBusy(false)); } }]);
    return <Page key={selected?.id ?? 'list'} topInset bottomInset={false} title={selected ? 'Your outfit notes.' : 'Saved reports.'}><ErrorText message={error}/>{selected ? <><Button title="Back to saved reports" secondary onPress={() => setSelected(null)}/><ReportView key={selected.id} report={selected.report}/><Button title="Delete report" disabled={busy} onPress={() => remove(selected)}/></> : <><Text style={styles.muted}>Text only. Photos are never saved to your history.</Text>{!items.length && !error && <Text style={styles.text}>{busy ? 'Loading your reports…' : 'Reports you choose to save will appear here.'}</Text>}{items.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Read report from ${new Date(row.created_at).toLocaleDateString()}: ${row.report.summary}`} onPress={() => setSelected(row)} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.7 : 1 }]}><View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={styles.eyebrow}>{new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text><Text style={styles.heading}>{row.report.overallScore === null ? 'Unrated' : `${row.report.overallScore} / 10`}</Text></View><Text numberOfLines={2} style={styles.text}>{row.report.summary}</Text><Text style={styles.muted}>View assessment →</Text></Pressable>)}{cursor && <Button title="Load older reports" disabled={busy} onPress={() => void load(cursor)}/>}<Button title="Refresh history" secondary disabled={busy} onPress={() => void load()}/></>}</Page>;
}
