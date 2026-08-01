import React from 'react';

export default function EmptyList({ emoji = '📋', text, hint }) {
    return (
        <div style={{ background: 'white', borderRadius: '10px', padding: '32px 16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.2 }}>{emoji}</div>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 4px', fontWeight: '500' }}>{text}</p>
            {hint && <p style={{ color: '#d1d5db', fontSize: '12px', margin: 0 }}>{hint}</p>}
        </div>
    );
}
