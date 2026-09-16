import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAnalysis } from '../state/analysis-context';
import { choosePhoto } from './photo-library';
export function usePhotoLibrary() {
    const { prepare, cancel } = useAnalysis();
    const latest = useRef({ prepare, cancel });
    latest.current = { prepare, cancel };
    const [choosing, setChoosing] = useState(false);
    const focused = useRef(false), generation = useRef(0), pending = useRef(false);
    useFocusEffect(useCallback(() => { focused.current = true; setChoosing(false); return () => { focused.current = false; generation.current++; if (pending.current)
        void latest.current.cancel(true).catch(() => { }); }; }, []));
    const choose = async () => {
        if (pending.current)
            return false;
        pending.current = true;
        setChoosing(true);
        const token = ++generation.current;
        const valid = () => focused.current && token === generation.current;
        try {
            await latest.current.cancel(true);
            return valid() && await choosePhoto(latest.current.prepare, valid);
        }
        finally {
            pending.current = false;
            if (focused.current)
                setChoosing(false);
        }
    };
    return { choose, choosing };
}
