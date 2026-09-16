import * as Picker from 'expo-image-picker';
import { trackTemporary, discardTemporary } from './images';
import type { Photo } from './images';
import type { PreparationOutcome } from '../state/analysis-context';
export async function choosePhoto(prepare: (photo: Photo) => Promise<PreparationOutcome>, isCurrent: () => boolean = () => true) {
    const picked = await Picker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1, exif: false });
    if (picked.canceled)
        return false;
    const photo = picked.assets[0];
    await trackTemporary(photo.uri);
    if (!isCurrent()) {
        await discardTemporary(photo.uri);
        return false;
    }
    const outcome = await prepare(photo);
    if (outcome.status === 'failure')
        throw new Error(outcome.message);
    return isCurrent() && outcome.status === 'success';
}
