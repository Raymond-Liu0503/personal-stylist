import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { OutfitReport } from '@stylist/contracts';
import { Card, Button, Disclosure, ReadMore, styles } from './ui';
import { theme } from '../theme/tokens';
type Props = {
    report: OutfitReport;
    onSuggestionFeedback?: (index: number, helpful: boolean) => Promise<void>;
};
export function ReportView({ report, onSuggestionFeedback }: Props) {
    const [feedback, setFeedback] = useState<Record<number, boolean>>({}), [sending, setSending] = useState<Record<number, boolean>>({});
    const send = async (index: number, helpful: boolean) => { if (!onSuggestionFeedback)
        return; setSending(current => ({ ...current, [index]: true })); try {
        await onSuggestionFeedback(index, helpful);
        setFeedback(current => ({ ...current, [index]: helpful }));
    }
    catch { /* The caller displays the API error. */ }
    finally {
        setSending(current => ({ ...current, [index]: false }));
    } };
    const details = (index: number) => { const s = report.suggestions[index]; return <><Text style={styles.muted}>{s.observation}</Text><Text style={styles.text}>{s.reason}</Text>{onSuggestionFeedback && index < 3 && (index in feedback ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{feedback[index] ? 'Marked helpful' : 'Marked not for me'}</Text> : <View style={styles.row}><Button title="Helpful" accessibilityLabel={`Helpful, suggestion ${index + 1}`} secondary disabled={sending[index] === true} onPress={() => void send(index, true)}/><Button title="Not for me" accessibilityLabel={`Not for me, suggestion ${index + 1}`} secondary disabled={sending[index] === true} onPress={() => void send(index, false)}/></View>)}</>; };
    return <View style={{ gap: 12 }}>
 <View style={[styles.row, { flexWrap: 'nowrap', alignItems: 'center' }]}><Text accessibilityLabel={report.overallScore === null ? 'Rating unavailable' : `Rating ${report.overallScore} out of 10`} style={{ fontFamily: theme.fonts.display, fontSize: 48, lineHeight: 56, color: theme.colors.accent }}>{report.overallScore === null ? '—' : report.overallScore}</Text><View style={{ flex: 1, gap: 2 }}><Text style={styles.eyebrow}>{report.overallScore === null ? 'UNRATED' : 'OUT OF 10'}</Text><Text accessibilityRole="header" style={styles.heading}>{report.verdict === 'works_well' ? 'Works well' : report.verdict === 'could_improve' ? 'Could improve' : 'Not enough visible detail to rate'}</Text></View></View>
 <ReadMore text={report.summary}/>
 {report.status === 'partial' && <Text style={[styles.muted, { color: theme.colors.accent }]}>Partial assessment · some details could not be assessed.</Text>}
 {report.strengths.length > 0 && <View style={{ gap: 4 }}><Text style={styles.eyebrow}>What works</Text>{report.strengths.slice(0, 2).map((s, i) => <ReadMore key={i} text={`• ${s}`} lines={2}/>)}{report.strengths.length > 2 && <Disclosure title={`More strengths (${report.strengths.length - 2})`}>{report.strengths.slice(2).map((s, i) => <Text key={i} style={styles.text}>• {s}</Text>)}</Disclosure>}</View>}
 {report.suggestions.length > 0 && <Card><Text style={styles.eyebrow}>Best next move</Text><ReadMore text={report.suggestions[0].action}/><Disclosure title="Why this works & feedback">{details(0)}</Disclosure></Card>}
 {report.suggestions.length > 1 && <View><Text style={styles.eyebrow}>More ways to wear it</Text>{report.suggestions.slice(1).map((s, i) => <Disclosure key={i} title={`Option ${i + 2} · ${s.action}`}><Text style={styles.heading}>{s.action}</Text>{details(i + 1)}</Disclosure>)}</View>}
 {report.limitations.length > 0 && <Disclosure title={`Limitations (${report.limitations.length})`}>{report.limitations.map((s, i) => <Text key={i} style={styles.muted}>{s}</Text>)}</Disclosure>}
 <Disclosure title="Explore the criteria">{report.criteria.map(c => <View key={c.id} style={{ gap: 4, paddingVertical: 8 }}><Text style={styles.heading}>{c.id[0].toUpperCase() + c.id.slice(1)} · {!c.applicable ? 'Not applicable' : c.score === null ? 'Not visible' : `${c.score} / 5`}</Text><Text style={styles.text}>{c.observation}</Text><Text style={styles.muted}>{c.explanation}</Text></View>)}</Disclosure>
 </View>;
}
