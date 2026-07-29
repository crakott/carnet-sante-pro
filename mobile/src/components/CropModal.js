import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Dimensions, PanResponder, Animated, Alert, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '../theme';

const ASPECTS = [
  { key: '1:1',  label: 'Carré',    ratio: 1 },
  { key: '3:4',  label: 'Portrait', ratio: 3 / 4 },
  { key: '4:3',  label: 'Paysage',  ratio: 4 / 3 },
  { key: '16:9', label: '16 : 9',   ratio: 16 / 9 },
];

const HEADER_H = 62;
const FOOTER_H = 112;

export default function CropModal({ visible, photo, onSave, onCancel }) {
  const [aspectKey, setAspectKey] = useState('1:1');
  const [imgNat, setImgNat] = useState({ w: 1, h: 1 });
  const [areaSize, setAreaSize] = useState({ w: Dimensions.get('window').width, h: Dimensions.get('window').height - HEADER_H - FOOTER_H });
  const [saving, setSaving] = useState(false);

  const aspect = ASPECTS.find((a) => a.key === aspectKey) || ASPECTS[0];

  // Crop frame dimensions, computed from measured area
  const MARGIN = 30;
  const frameW = Math.min(areaSize.w - MARGIN * 2, (areaSize.h - MARGIN * 2) * aspect.ratio);
  const frameH = frameW / aspect.ratio;

  // Animated transform values
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;

  // Mutable refs for gesture handler (avoid stale closures in PanResponder)
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const scRef = useRef(1);
  const lastDistRef = useRef(null);
  const frameWRef = useRef(frameW);
  const frameHRef = useRef(frameH);
  const areaSizeRef = useRef(areaSize);
  const imgNatRef = useRef(imgNat);

  useEffect(() => { frameWRef.current = frameW; frameHRef.current = frameH; }, [frameW, frameH]);
  useEffect(() => { areaSizeRef.current = areaSize; }, [areaSize]);
  useEffect(() => { imgNatRef.current = imgNat; }, [imgNat]);

  // Sync animated values to refs via listeners
  useEffect(() => {
    const l1 = tx.addListener(({ value }) => { txRef.current = value; });
    const l2 = ty.addListener(({ value }) => { tyRef.current = value; });
    const l3 = sc.addListener(({ value }) => { scRef.current = value; });
    return () => { tx.removeListener(l1); ty.removeListener(l2); sc.removeListener(l3); };
  }, []);

  const resetTransform = useCallback(() => {
    tx.setValue(0); ty.setValue(0); sc.setValue(1);
    txRef.current = 0; tyRef.current = 0; scRef.current = 1;
  }, []);

  // On open: get natural image size and reset transform
  useEffect(() => {
    if (!visible || !photo) return;
    resetTransform();
    // eslint-disable-next-line no-undef
    Image.getSize(
      photo,
      (w, h) => { setImgNat({ w, h }); imgNatRef.current = { w, h }; },
      () => {}
    );
  }, [visible, photo]);

  // Reset transform when aspect ratio changes
  useEffect(() => {
    if (visible) resetTransform();
  }, [aspectKey]);

  // PanResponder — created once, reads mutable refs
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        tx.setOffset(txRef.current); tx.setValue(0);
        ty.setOffset(tyRef.current); ty.setValue(0);
        lastDistRef.current = null;
      },
      onPanResponderMove: (evt, gs) => {
        const { touches } = evt.nativeEvent;
        if (touches.length >= 2) {
          const dxt = touches[0].pageX - touches[1].pageX;
          const dyt = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dxt * dxt + dyt * dyt);
          if (lastDistRef.current !== null) {
            const next = Math.max(0.3, Math.min(10, scRef.current * (dist / lastDistRef.current)));
            sc.setValue(next);
          }
          lastDistRef.current = dist;
        } else {
          lastDistRef.current = null;
          tx.setValue(gs.dx);
          ty.setValue(gs.dy);
        }
      },
      onPanResponderRelease: () => {
        tx.flattenOffset();
        ty.flattenOffset();
        lastDistRef.current = null;
      },
    })
  ).current;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { w: natW, h: natH } = imgNatRef.current;
      const fW = frameWRef.current;
      const fH = frameHRef.current;
      const aW = areaSizeRef.current.w;
      const aH = areaSizeRef.current.h;
      const userSc = scRef.current;

      // Initial scale to fit image in area (letterboxed)
      const dispSc = Math.min(aW / natW, aH / natH);
      const dispW = natW * dispSc;
      const dispH = natH * dispSc;
      const totalSc = dispSc * userSc;

      // Image center on screen (in area coordinates)
      const imgCx = aW / 2 + txRef.current;
      const imgCy = aH / 2 + tyRef.current;

      // Image top-left on screen
      const imgL = imgCx - (dispW * userSc) / 2;
      const imgT = imgCy - (dispH * userSc) / 2;

      // Crop frame top-left on screen (centered in area)
      const cropL = (aW - fW) / 2;
      const cropT = (aH - fH) / 2;

      // Convert to original image pixel coordinates
      const oX = (cropL - imgL) / totalSc;
      const oY = (cropT - imgT) / totalSc;
      const cW = fW / totalSc;
      const cH = fH / totalSc;

      // Clamp to image bounds
      const clX = Math.max(0, Math.min(natW - 4, oX));
      const clY = Math.max(0, Math.min(natH - 4, oY));
      const clW = Math.max(4, Math.min(natW - clX, cW));
      const clH = Math.max(4, Math.min(natH - clY, cH));

      // Write base64 data URI to temp file if needed
      let uri = photo;
      if (photo && photo.startsWith('data:')) {
        const b64 = photo.replace(/^data:image\/\w+;base64,/, '');
        uri = `${FileSystem.cacheDirectory}crop_src_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
      }

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX: Math.round(clX), originY: Math.round(clY), width: Math.round(clW), height: Math.round(clH) } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      onSave(`data:image/jpeg;base64,${result.base64}`);
    } catch {
      Alert.alert('Erreur', "Impossible de rogner. Repositionnez l'image pour que la zone de recadrage soit entièrement dans la photo.");
    } finally {
      setSaving(false);
    }
  }, [photo, onSave]);

  // Image display size (scaled to fit area)
  const dispSc = imgNat.w > 0 ? Math.min(areaSize.w / imgNat.w, areaSize.h / imgNat.h) : 1;
  const dispW = imgNat.w * dispSc;
  const dispH = imgNat.h * dispSc;

  // Overlay panels
  const sideW = (areaSize.w - frameW) / 2;
  const topH  = (areaSize.h - frameH) / 2;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={12} style={styles.headerSide}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.title}>✂️ Rogner la photo</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={12} style={[styles.headerSide, styles.headerRight]}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.saveText}>Rogner</Text>}
          </TouchableOpacity>
        </View>

        {/* Image + overlay */}
        <View
          style={styles.area}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setAreaSize({ w: width, h: height });
          }}
          {...panResponder.panHandlers}
        >
          {photo ? (
            <Animated.Image
              source={{ uri: photo }}
              style={{ width: dispW, height: dispH, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] }}
              resizeMode="cover"
            />
          ) : null}

          {/* Dark overlay with crop hole */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ height: topH, backgroundColor: 'rgba(0,0,0,0.62)' }} />
            <View style={{ flexDirection: 'row', height: frameH }}>
              <View style={{ width: sideW, backgroundColor: 'rgba(0,0,0,0.62)' }} />
              {/* Crop frame */}
              <View style={{ width: frameW, height: frameH }}>
                {/* Frame border */}
                <View style={styles.frameBorder} />
                {/* Rule-of-thirds grid */}
                <View style={[styles.gridLine, { top: '33.33%', left: 0, right: 0, height: 1 }]} />
                <View style={[styles.gridLine, { top: '66.66%', left: 0, right: 0, height: 1 }]} />
                <View style={[styles.gridLine, { left: '33.33%', top: 0, bottom: 0, width: 1 }]} />
                <View style={[styles.gridLine, { left: '66.66%', top: 0, bottom: 0, width: 1 }]} />
                {/* Corner handles */}
                <View style={[styles.corner, { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                <View style={[styles.corner, { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 }]} />
                <View style={[styles.corner, { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                <View style={[styles.corner, { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 }]} />
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' }} />
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' }} />
          </View>
        </View>

        {/* Aspect ratio selector */}
        <View style={styles.aspectRow}>
          {ASPECTS.map((a) => (
            <TouchableOpacity
              key={a.key}
              onPress={() => setAspectKey(a.key)}
              style={[styles.chip, aspectKey === a.key && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, aspectKey === a.key && styles.chipTextActive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>Pincez pour zoomer · Glissez pour recadrer</Text>
      </View>
    </Modal>
  );
}

const CORNER_SIZE = 22;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: {
    height: HEADER_H, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  headerSide: { minWidth: 80 },
  headerRight: { alignItems: 'flex-end' },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelText: { color: '#6b7280', fontSize: 15 },
  saveText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  area: {
    flex: 1, overflow: 'hidden',
    backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
  },
  frameBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)',
  },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.18)' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#fff' },
  aspectRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 10,
    paddingVertical: 16, backgroundColor: '#000',
  },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#374151',
  },
  chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#000' },
  hint: { color: '#4b5563', fontSize: 11, textAlign: 'center', paddingBottom: 16, backgroundColor: '#000' },
});
