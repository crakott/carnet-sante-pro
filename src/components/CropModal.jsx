import React from 'react';
import { _cropModal } from '../utils/image';

export default function CropModal() {
    const [state, setState] = React.useState(null);
    const imgRef = React.useRef(null);
    const cropperRef = React.useRef(null);

    React.useEffect(() => {
        _cropModal.show = (s) => setState(s);
        return () => { _cropModal.show = null; };
    }, []);

    React.useEffect(() => {
        if (!state) return;
        if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null; }
        if (!imgRef.current || !window.Cropper) return;
        cropperRef.current = new window.Cropper(imgRef.current, {
            aspectRatio: state.aspectRatio,
            viewMode: 1,
            autoCropArea: 0.9,
            dragMode: 'move',
            guides: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
        });
        return () => { if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null; } };
    }, [state]);

    if (!state) return null;

    const confirm = () => {
        if (cropperRef.current) {
            const canvas = cropperRef.current.getCroppedCanvas({ maxWidth: 1400, maxHeight: 1400, fillColor: '#fff' });
            state.resolve(canvas.toDataURL('image/jpeg', 0.88));
        }
        setState(null);
    };

    const cancel = () => { state.reject(new Error('cancelled')); setState(null); };
    const setRatio = (r) => { if (cropperRef.current) cropperRef.current.setAspectRatio(r); };
    const rotate = (deg) => { if (cropperRef.current) cropperRef.current.rotate(deg); };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#111827', flexShrink: 0 }}>
                <button onClick={cancel} style={{ color: '#f87171', background: 'none', border: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer', padding: '6px 0' }}>✕ Annuler</button>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>✂️ Rogner la photo</span>
                <button onClick={confirm} style={{ color: '#34d399', background: 'none', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer', padding: '6px 0' }}>✓ Appliquer</button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <img ref={imgRef} src={state.src} style={{ display: 'block', maxWidth: '100%', opacity: 0 }} alt="à rogner" />
            </div>
            <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', background: '#111827', flexShrink: 0, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[{ label: '⬜ Carré', r: 1 }, { label: '↔️ Libre', r: NaN }, { label: '4:3', r: 4/3 }, { label: '3:4', r: 3/4 }].map(({ label, r }) => (
                    <button key={label} onClick={() => setRatio(r)} style={{ padding: '7px 12px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>{label}</button>
                ))}
                <button onClick={() => rotate(-90)} style={{ padding: '7px 12px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>↩ −90°</button>
                <button onClick={() => rotate(90)} style={{ padding: '7px 12px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>↪ +90°</button>
            </div>
        </div>
    );
}
