import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Card, Button, Field, Input } from './ui';
import { colors, spacing, radius } from '../theme';
import { formatDate, todayStr } from '../utils/dates';
import { getVideosForAnimal, addVideoToDB, deleteVideoFromDB, formatVideoSize, MAX_VIDEO_SIZE } from '../utils/videos';

// Videos for one animal, stored locally on this device (mirrors VideosTab in the web app)
export default function VideosSection({ animal }) {
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [date, setDate] = useState(todayStr());
  const [pickedAsset, setPickedAsset] = useState(null);
  const [fileError, setFileError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadVideos = useCallback(() => {
    getVideosForAnimal(animal.id).then(setVideos).catch(() => setVideos([]));
  }, [animal.id]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const resetForm = () => {
    setNom('');
    setDate(todayStr());
    setPickedAsset(null);
    setFileError('');
    setShowForm(false);
  };

  const pickVideo = async () => {
    setFileError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setFileError("Permission d'accès aux vidéos refusée."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
      setFileError(`Vidéo trop volumineuse (max ${MAX_VIDEO_SIZE / (1024 * 1024)} Mo).`);
      return;
    }
    setPickedAsset(asset);
  };

  const handleAdd = async () => {
    if (!pickedAsset) return;
    setSaving(true);
    try {
      await addVideoToDB(animal.id, {
        nom,
        date,
        uri: pickedAsset.uri,
        mimeType: pickedAsset.mimeType || 'video/mp4',
        size: pickedAsset.fileSize || 0,
      });
      resetForm();
      loadVideos();
    } catch (err) {
      setFileError("Impossible d'enregistrer la vidéo (espace de stockage insuffisant ?).");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteVideoFromDB(id);
    loadVideos();
  };

  return (
    <View>
      <Text style={styles.title}>🎥 Vidéos de {animal.nom}</Text>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          📱 Les vidéos sont enregistrées uniquement sur cet appareil (non synchronisées, non sauvegardées dans le cloud). Si vous changez d'appareil ou désinstallez l'application, elles seront définitivement perdues.
        </Text>
      </View>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
          <Field label="Description (optionnel)">
            <Input value={nom} onChangeText={setNom} placeholder="Description..." />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>
          <Field label={`🎥 Choisir une vidéo (max ${MAX_VIDEO_SIZE / (1024 * 1024)} Mo)`}>
            <Button title="Choisir une vidéo" onPress={pickVideo} color={colors.pink} outline />
            {pickedAsset ? <Text style={styles.success}>✓ Vidéo sélectionnée{pickedAsset.fileSize ? ` (${formatVideoSize(pickedAsset.fileSize)})` : ''}</Text> : null}
          </Field>

          {fileError ? <Text style={styles.error}>{fileError}</Text> : null}

          <View style={styles.actions}>
            <Button title={saving ? 'Enregistrement...' : '➕ Ajouter'} onPress={handleAdd} color={colors.pink} disabled={!pickedAsset || saving} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={resetForm} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title="➕ Ajouter une vidéo" onPress={() => setShowForm(true)} color={colors.pink} style={{ marginBottom: spacing.lg }} />
      )}

      {videos.length > 0 ? (
        videos.map((v) => <VideoCard key={v.id} video={v} onDelete={() => handleDelete(v.id)} />)
      ) : (
        <Text style={styles.empty}>Aucune vidéo enregistrée sur cet appareil</Text>
      )}
    </View>
  );
}

function VideoCard({ video, onDelete }) {
  const player = useVideoPlayer(video.uri, (p) => { p.loop = false; });

  return (
    <Card accentColor={colors.pink}>
      <VideoView player={player} style={styles.player} allowsFullscreen allowsPictureInPicture nativeControls />
      {video.nom ? <Text style={styles.itemTitle}>{video.nom}</Text> : null}
      <Text style={styles.itemMeta}>{formatDate(video.date)} · {formatVideoSize(video.size)}</Text>
      <Button title="🗑️ Supprimer" color={colors.redLight} textColor={colors.red} onPress={onDelete} />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  warning: { backgroundColor: colors.yellowLight, borderWidth: 1, borderColor: colors.yellowBorder, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  warningText: { fontSize: 13, color: colors.brown },
  actions: { flexDirection: 'row', gap: spacing.sm },
  success: { color: colors.primary, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.red, fontSize: 13, marginBottom: spacing.sm },
  player: { width: '100%', height: 200, borderRadius: radius.sm, backgroundColor: '#000', marginBottom: spacing.sm },
  itemTitle: { fontWeight: '600', fontSize: 13, color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 12, marginTop: 2, marginBottom: spacing.sm },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl, backgroundColor: colors.white, borderRadius: 8 },
});
