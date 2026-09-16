import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Text, View, AppState, AccessibilityInfo, Pressable, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon, type IconName } from '../src/components/icon';
import { choosePhoto } from '../src/services/photo-library';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { Button, Page, ErrorText, styles } from '../src/components/ui';
import { useAnalysis } from '../src/state/analysis-context';
import { trackTemporary, discardTemporary } from '../src/services/images';
export default function Camera() {
    const [timerOpen, setTimerOpen] = useState(false), [frame, setFrame] = useState({ width: 0, height: 0 });
    const importing = useRef(false);
    const [permission, requestPermission] = useCameraPermissions();
    const camera = useRef<CameraView>(null);
    const [facing, setFacing] = useState<CameraType>('front'), [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [count, setCount] = useState<number | null>(null), [error, setError] = useState<string | null>(null);
    const [visible, setVisible] = useState(false), [foreground, setForeground] = useState(AppState.currentState === 'active'), [cameraAttempt, setCameraAttempt] = useState(0), [startupError, setStartupError] = useState<string | null>(null);
    const { prepare, cancel, timer, setTimer } = useAnalysis();
    const latest = useRef({ prepare, cancel });
    latest.current = { prepare, cancel };
    const mounted = useRef(true), focused = useRef(false), moving = useRef(false), locked = useRef(false), generation = useRef(0), timeout = useRef<ReturnType<typeof setTimeout> | null>(null), capturing = useRef(false);
    const stop = useCallback(() => { generation.current++; if (timeout.current)
        clearTimeout(timeout.current); timeout.current = null; if (mounted.current) {
        setCount(null);
        if (!capturing.current) {
            locked.current = false;
            setBusy(false);
        }
    } void latest.current.cancel(true).catch(() => { }); }, []);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useFocusEffect(useCallback(() => { focused.current = true; setReady(false); setStartupError(null); setVisible(true); return () => { focused.current = false; setVisible(false); setReady(false); if (!moving.current)
        stop(); }; }, [stop]));
    useEffect(() => { const subscription = AppState.addEventListener('change', state => { setForeground(state === 'active'); if (state !== 'active') {
        setReady(false);
        if (!importing.current)
            stop();
    }
    else
        setStartupError(null); }); return () => subscription.remove(); }, [stop]);
    useEffect(() => { if (!permission?.granted) {
        setReady(false);
        stop();
    } }, [permission?.granted, stop]);
    const showCamera = visible && foreground && permission?.granted && !importing.current;
    useEffect(() => { if (!showCamera || ready || startupError)
        return; const deadline = setTimeout(() => setStartupError('The camera is taking too long to start. Tap Restart camera to try again.'), 8000); return () => clearTimeout(deadline); }, [showCamera, ready, startupError, cameraAttempt, facing]);
    const restart = () => { if (locked.current)
        return; setReady(false); setStartupError(null); setError(null); setCameraAttempt(n => n + 1); };
    // iOS emits onCameraReady once per native view, not on every facing change.
    // Remount for switches/restarts, and release the view when this screen is inactive.
    const cameraKey = `${facing}:${cameraAttempt}`;
    const start = () => {
        if (locked.current || !ready || !permission?.granted || !focused.current)
            return;
        locked.current = true;
        setBusy(true);
        setError(null);
        const token = ++generation.current;
        const valid = () => mounted.current && focused.current && generation.current === token && AppState.currentState === 'active';
        const capture = async () => {
            if (!valid())
                return;
            setCount(null);
            capturing.current = true;
            try {
                const photo = await camera.current?.takePictureAsync({ quality: 1, exif: false, skipProcessing: false });
                if (!photo)
                    throw new Error('The camera did not capture a photo.');
                await trackTemporary(photo.uri);
                if (!valid()) {
                    await discardTemporary(photo.uri);
                    return;
                }
                const outcome = await latest.current.prepare(photo);
                if (!valid())
                    return;
                if (outcome.status === 'success') {
                    moving.current = true;
                    router.replace('/review');
                }
                else if (outcome.status === 'failure')
                    setError(outcome.message);
            }
            catch (e) {
                if (valid())
                    setError(e instanceof Error ? e.message : 'Capture failed.');
            }
            finally {
                capturing.current = false;
                locked.current = false;
                if (mounted.current)
                    setBusy(false);
            }
        };
        const tick = (seconds: number) => { if (!valid())
            return; if (seconds === 0) {
            void capture();
            return;
        } setCount(seconds); AccessibilityInfo.announceForAccessibility(`${seconds}`); timeout.current = setTimeout(() => tick(seconds - 1), 1000); };
        tick(timer);
    };
    const library = async () => {
        if (locked.current)
            return;
        locked.current = true;
        importing.current = true;
        setBusy(true);
        setReady(false);
        setError(null);
        const token = ++generation.current;
        const valid = () => mounted.current && focused.current && generation.current === token;
        try {
            await latest.current.cancel(true);
            if (valid() && await choosePhoto(latest.current.prepare, valid)) {
                moving.current = true;
                router.replace('/review');
            }
        }
        catch (e) {
            if (valid())
                setError(e instanceof Error ? e.message : 'Unable to choose photo.');
        }
        finally {
            importing.current = false;
            locked.current = false;
            if (mounted.current) {
                setBusy(false);
                setCameraAttempt(n => n + 1);
            }
        }
    };
    const close = () => { stop(); if (!busy)
        router.back(); };
    if (!permission?.granted)
        return <Page topInset title="Make room for the look."><Text style={styles.text}>Allow camera access to take an outfit photo, or choose one from your library.</Text><ErrorText message={error}/>{permission?.canAskAgain === false ? <Button title="Open Settings" onPress={() => void Linking.openSettings().catch(() => setError('Open iPhone Settings to allow camera access.'))}/> : <Button title="Allow camera" disabled={busy} onPress={() => void requestPermission().catch(() => setError('Camera access could not be requested. Try your photo library.'))}/>}<Button title="Choose photo" secondary disabled={busy} onPress={() => void library()}/><Button title="Back" secondary onPress={() => { stop(); router.back(); }}/></Page>;
    const previewWidth = Math.min(frame.width, frame.height * 3 / 4);
    const captureLabel = busy ? (count !== null ? 'Cancel countdown' : 'Preparing photo…') : ready ? 'Capture outfit' : startupError ? 'Camera unavailable' : 'Starting camera…';
    return <SafeAreaView style={cameraStyles.screen}>
 <StatusBar style="light"/>
 <View style={cameraStyles.top}><CameraControl name="close" label={busy ? 'Cancel' : 'Back'} onPress={close}/><Text style={cameraStyles.eyebrow}>OUTFIT</Text><CameraControl name="timer" label={`Timer ${timer === 0 ? 'Off' : `${timer}s`}`} selected={timerOpen} disabled={busy} onPress={() => setTimerOpen(v => !v)} badge={timer ? `${timer}s` : undefined}/></View>
 {timerOpen && <View accessibilityRole="radiogroup" style={cameraStyles.timers}>{([0, 3, 10] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Timer ${value === 0 ? 'Off' : `${value}s`}`} accessibilityState={{ checked: timer === value, disabled: busy }} disabled={busy} onPress={() => { setTimer(value); setTimerOpen(false); }} style={[cameraStyles.timerOption, timer === value && { backgroundColor: '#FFFFFF25' }]}><Text style={cameraStyles.white}>{value === 0 ? 'Off' : `${value}s`}</Text></Pressable>)}</View>}
 <View style={cameraStyles.stage} onLayout={e => setFrame(e.nativeEvent.layout)}><View style={{ width: previewWidth || '100%', aspectRatio: 3 / 4, overflow: 'hidden', borderRadius: 4, backgroundColor: '#161416' }}>
 {showCamera && <CameraView key={cameraKey} ref={camera} facing={facing} mirror={false} ratio="4:3" onCameraReady={() => { setReady(true); setStartupError(null); }} onMountError={() => { setReady(false); stop(); setStartupError('The camera could not start. Tap Restart camera to try again.'); }} style={StyleSheet.absoluteFill}/>}
 {count !== null && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}><Text accessibilityRole="timer" style={cameraStyles.countdown}>{count}</Text></View>}
 </View></View>
 <View style={cameraStyles.bottom}>
 <Text accessibilityLiveRegion="polite" style={cameraStyles.hint}>{startupError ?? error ?? (busy ? (count !== null ? 'Hold your pose.' : 'Preparing photo…') : ready ? 'Keep the whole outfit in frame.' : 'Starting camera…')}</Text>
 {startupError && <Pressable accessibilityRole="button" disabled={busy} onPress={restart} style={cameraStyles.retry}><Text style={cameraStyles.white}>Restart camera</Text></Pressable>}
 <View style={cameraStyles.controls}><CameraControl name="library" label="Choose photo" disabled={busy} onPress={() => void library()}/><Pressable accessibilityRole="button" accessibilityLabel={captureLabel} accessibilityState={{ disabled: busy || !ready }} disabled={busy || !ready} onPress={start} style={({ pressed }) => [cameraStyles.shutter, { opacity: busy || !ready ? 0.4 : pressed ? 0.7 : 1 }]}><View style={cameraStyles.shutterInner}/></Pressable><CameraControl name="flip" label="Switch camera" disabled={busy} onPress={() => { if (locked.current)
        return; setReady(false); setStartupError(null); setFacing(facing === 'back' ? 'front' : 'back'); }}/></View>
 <Text style={cameraStyles.eyebrow}>PHOTO</Text>
 </View></SafeAreaView>;
}
function CameraControl({ name, label, onPress, disabled = false, selected = false, badge }: {
    name: IconName;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    selected?: boolean;
    badge?: string;
}) { return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={({ pressed }) => [cameraStyles.iconButton, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1, backgroundColor: selected ? '#FFFFFF25' : 'transparent' }]}><Icon name={name} color="white"/>{badge && <Text style={cameraStyles.badge}>{badge}</Text>}</Pressable>; }
const cameraStyles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#090809' }, top: { paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 }, eyebrow: { color: '#E8CED6', fontSize: 11, letterSpacing: 3, fontWeight: '600', textAlign: 'center' }, white: { color: 'white', fontSize: 15 }, iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 }, badge: { color: 'white', fontSize: 10, position: 'absolute', right: 0, bottom: 0 }, stage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, bottom: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: 14, gap: 12 }, hint: { color: '#D7D0D3', fontSize: 13, lineHeight: 19, textAlign: 'center' }, controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 24 }, shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'white', padding: 5 }, shutterInner: { flex: 1, borderRadius: 40, backgroundColor: 'white' }, timers: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 4, gap: 12 }, timerOption: { minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }, countdown: { fontSize: 96, color: 'white', fontWeight: '600', textShadowColor: '#0008', textShadowRadius: 12 }, retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#62595E', borderRadius: 10 } });
