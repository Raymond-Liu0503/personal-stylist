import { Platform } from 'react-native';
export const theme = {
    colors: { background: '#F7F3EC', surface: '#FFFDFA', ink: '#211D1E', muted: '#71686B', accent: '#742D42', line: '#DED7D0', error: '#A12D35' },
    space: { sm: 8, md: 16, lg: 24, xl: 32 }, radius: 12,
    fonts: { display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) },
};
