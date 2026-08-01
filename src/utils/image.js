// Read an image file, downscale it to maxPx and return a JPEG data-URL via callback
export const readImageAsResizedDataUrl = (file, maxPx, quality, onResult, onError) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            onResult(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => onError && onError();
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// Read a file (e.g. a PDF exported from a vet software) as a data-URL, rejecting files above maxBytes
export const MAX_DOCUMENT_PDF_SIZE = 700 * 1024; // 700 Ko, to stay well under Firestore's 1 Mo document limit
export const readFileAsDataUrl = (file, maxBytes, onResult, onError) => {
    if (!file) return;
    if (file.size > maxBytes) { onError && onError(); return; }
    const reader = new FileReader();
    reader.onload = (e) => onResult(e.target.result);
    reader.onerror = () => onError && onError();
    reader.readAsDataURL(file);
};

// Global crop-modal controller — openCropModal(src, aspectRatio?) returns a Promise<dataUrl>
export const _cropModal = { show: null };
export const openCropModal = (src, aspectRatio) => new Promise((resolve, reject) => {
    if (!_cropModal.show) { reject(new Error('no modal')); return; }
    _cropModal.show({ src, aspectRatio: aspectRatio !== undefined ? aspectRatio : NaN, resolve, reject });
});
