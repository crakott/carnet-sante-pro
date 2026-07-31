import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Videos are stored only on this device (not synced to Firestore), mirroring the web
// app's IndexedDB-based local video storage
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 Mo

const METADATA_KEY = 'carnet_videos_metadata';
const VIDEOS_DIR = `${FileSystem.documentDirectory}videos/`;

const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(VIDEOS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });
};

const loadMetadata = async () => {
  const raw = await AsyncStorage.getItem(METADATA_KEY);
  return raw ? JSON.parse(raw) : [];
};

const saveMetadata = (list) => AsyncStorage.setItem(METADATA_KEY, JSON.stringify(list));

export const getVideosForAnimal = async (animalId) => {
  const all = await loadMetadata();
  return all.filter((v) => v.animalId === animalId).sort((a, b) => b.id - a.id);
};

export const addVideoToDB = async (animalId, { nom, date, uri, mimeType, size }) => {
  await ensureDir();
  const id = Date.now();
  const ext = mimeType?.split('/')[1] || 'mp4';
  const dest = `${VIDEOS_DIR}${id}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  const all = await loadMetadata();
  all.push({ id, animalId, nom, date, uri: dest, mimeType, size });
  await saveMetadata(all);
};

export const deleteVideoFromDB = async (id) => {
  const all = await loadMetadata();
  const video = all.find((v) => v.id === id);
  if (video) await FileSystem.deleteAsync(video.uri, { idempotent: true });
  await saveMetadata(all.filter((v) => v.id !== id));
};

export const formatVideoSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo` : `${Math.round(bytes / 1024)} Ko`);
