// Local-only video storage (IndexedDB) — videos never leave this device, no Firestore/cloud sync
const VIDEO_DB_NAME = 'carnet-sante-videos';
const VIDEO_STORE = 'videos';
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 Mo

export const openVideoDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(VIDEO_DB_NAME, 1);
    req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(VIDEO_STORE)) {
            const store = db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
            store.createIndex('animalId', 'animalId', { unique: false });
        }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

export const addVideoToDB = (animalId, { nom, date, blob, mimeType }) => openVideoDB().then(db => new Promise((resolve, reject) => {
    const id = Date.now();
    const tx = db.transaction(VIDEO_STORE, 'readwrite');
    tx.objectStore(VIDEO_STORE).put({ id, animalId, nom, date, blob, mimeType, size: blob.size });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
}));

export const getVideosForAnimal = (animalId) => openVideoDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const req = tx.objectStore(VIDEO_STORE).index('animalId').getAll(animalId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
}));

export const deleteVideoFromDB = (id) => openVideoDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readwrite');
    tx.objectStore(VIDEO_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
}));
