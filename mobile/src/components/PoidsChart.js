import React from 'react';
import { View, ScrollView } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Text as SvgText, Polyline, Circle } from 'react-native-svg';
import { colors } from '../theme';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// Évolution du poids sur l'année (mirrors PoidsChart in the web app)
export default function PoidsChart({ poids }) {
  const sorted = [...poids].sort((a, b) => new Date(a.date) - new Date(b.date));
  const values = sorted.map((p) => p.valeur);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const W = 350, H = 220;
  const padLeft = 45, padRight = 25, padTop = 15, padBottom = 50;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const points = sorted.map((p) => {
    const date = new Date(p.date);
    const monthIdx = date.getMonth();
    const x = padLeft + (monthIdx / 11) * chartW;
    const y = H - padBottom - ((p.valeur - minVal) / range) * chartH;
    return { x, y };
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="poidsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke={colors.inputBorder} strokeWidth="2" />
          <Line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke={colors.inputBorder} strokeWidth="2" />
          <SvgText x="15" y={padTop + 12} fontSize="11" fill={colors.textLight} fontWeight="600">Poids</SvgText>
          <SvgText x={W / 2} y={H - 8} fontSize="11" fill={colors.textLight} fontWeight="600" textAnchor="middle">Mois</SvgText>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = minVal + (maxVal - minVal) * ratio;
            const y = H - padBottom - ratio * chartH;
            return (
              <React.Fragment key={i}>
                <Line x1={padLeft - 5} y1={y} x2={padLeft} y2={y} stroke={colors.inputBorder} strokeWidth="1" />
                <SvgText x={padLeft - 8} y={y + 4} fontSize="10" fill={colors.textLight} textAnchor="end">{val.toFixed(1)}</SvgText>
              </React.Fragment>
            );
          })}
          {MONTH_NAMES.map((month, i) => {
            const x = padLeft + (i / 11) * chartW;
            return <SvgText key={i} x={x} y={H - padBottom + 25} fontSize="10" fill={colors.textLight} textAnchor="middle" fontWeight="600">{month}</SvgText>;
          })}
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="url(#poidsGrad)"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r="4" fill={colors.primary} stroke={colors.white} strokeWidth="2" />
          ))}
        </Svg>
      </View>
    </ScrollView>
  );
}
