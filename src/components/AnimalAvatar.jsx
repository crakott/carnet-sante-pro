import React from 'react';
import { EMOJIS_ESPECE } from '../constants';

export default function AnimalAvatar({ animal, size = 28 }) {
    if (animal.photo) {
        return <img src={animal.photo} alt={animal.nom} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} />;
    }
    return <span style={{ fontSize: size, verticalAlign: 'middle' }}>{EMOJIS_ESPECE[animal.espece] || '🐾'}</span>;
}
