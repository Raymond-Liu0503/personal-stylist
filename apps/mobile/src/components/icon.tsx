import React from 'react';
import { View, Text, type ColorValue } from 'react-native';
export type IconName = 'home' | 'saved' | 'account' | 'camera' | 'library' | 'flip' | 'close' | 'timer';
/** Small local line icons; decorative only, with labels on their enclosing controls. */
export function Icon({ name, color = '#211D1E', size = 24 }: {
    name: IconName;
    color?: ColorValue;
    size?: number;
}) {
    const line = { borderColor: color, borderWidth: 1.7 };
    return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ scale: size / 24 }] }}>
 {name === 'camera' ? <><View style={[line, { width: 23, height: 16, borderRadius: 4, position: 'absolute', top: 6 }]}/><View style={[line, { width: 9, height: 5, borderBottomWidth: 0, position: 'absolute', top: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2 }]}/><View style={[line, { width: 8, height: 8, borderRadius: 4, top: 2 }]}/></> : null}
 {name === 'home' ? <><View style={[line, { width: 14, height: 14, transform: [{ rotate: '45deg' }], position: 'absolute', top: 3, borderRightWidth: 0, borderBottomWidth: 0 }]}/><View style={[line, { width: 17, height: 13, position: 'absolute', bottom: 1, borderTopWidth: 0, borderRadius: 1 }]}/><View style={[line, { width: 5, height: 8, position: 'absolute', bottom: 1, borderBottomWidth: 0 }]}/></> : null}
 {name === 'saved' ? <><View style={[line, { width: 15, height: 20, borderRadius: 2, borderBottomWidth: 0, position: 'absolute', top: 1 }]}/><View style={[line, { width: 10, height: 10, position: 'absolute', bottom: 0, transform: [{ rotate: '45deg' }], borderRightWidth: 0, borderBottomWidth: 0 }]}/></> : null}
 {name === 'account' ? <><View style={[line, { width: 9, height: 9, borderRadius: 5, position: 'absolute', top: 1 }]}/><View style={[line, { width: 20, height: 10, borderTopLeftRadius: 12, borderTopRightRadius: 12, position: 'absolute', bottom: 1 }]}/></> : null}
 {name === 'library' ? <><View style={[line, { width: 22, height: 19, borderRadius: 3 }]}/><View style={{ backgroundColor: color, width: 4, height: 4, borderRadius: 2, position: 'absolute', left: 5, top: 6 }}/><View style={[line, { width: 11, height: 11, position: 'absolute', right: 4, bottom: 3, transform: [{ rotate: '45deg' }], borderRightWidth: 0, borderBottomWidth: 0 }]}/></> : null}
 {name === 'timer' ? <><View style={[line, { width: 18, height: 18, borderRadius: 10, top: 2 }]}/><View style={{ width: 2, height: 7, backgroundColor: color, position: 'absolute', top: 7 }}/><View style={{ width: 8, height: 2, backgroundColor: color, position: 'absolute', top: 1 }}/></> : null}
 {name === 'close' ? <><View style={{ width: 22, height: 2, backgroundColor: color, position: 'absolute', transform: [{ rotate: '45deg' }] }}/><View style={{ width: 22, height: 2, backgroundColor: color, position: 'absolute', transform: [{ rotate: '-45deg' }] }}/></> : null}
 {name === 'flip' ? <Text style={{ fontSize: 30, lineHeight: 32, color }}>↻</Text> : null}
 </View></View>;
}
