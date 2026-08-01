import React from 'react';
import { formatDate } from '../utils/format';

export default function ValidationBadge({ validePar }) {
    if (!validePar) return null;
    const vetName = [validePar.prenom, validePar.nom].filter(Boolean).join(' ') || 'vétérinaire';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '3px 8px', background: '#d1fae5', color: '#047857', fontSize: '11px', fontWeight: '700', borderRadius: '999px' }}>
            ✅ Validé par Dr. {vetName}{validePar.date ? ` • ${formatDate(validePar.date)}` : ''}
        </span>
    );
}
