import React from 'react';
import { View, ScrollView } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Text as SvgText, Polyline, Circle } from 'react-native-svg';
import { colors } from '../theme';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatAxisLabel(date) {
  return `${MONTHS_FR[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
}

export default function PoidsChart({ poids }) {
  const sorted = [...poids].sort((a, b) => new Date(a.date) - new Date(b.date));
  const values = sorted.map((p) => p.valeur);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const minTime = new Date(sorted[0].date).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].date).getTime();
  const timeRange = maxTime - minTime || 1;

  const W = 350, H = 220;
  const padLeft = 45, padRight = 25, padTop = 15, padBottom = 50;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const points = sorted.map((p) => {
    const t = new Date(p.date).getTime();
    const x = padLeft + ((t - minTime) / timeRange) * chartW;
    const y = H - padBottom - ((p.valeur - minVal) / range) * chartH;
    return { x, y, valeur: p.valeur, date: new Date(p.date) };
  });

  // Build X-axis tick labels (unique month/year marks, max 6)
  const tickCount = Math.min(sorted.length, 6);
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const t = minTime + (i / Math.max(tickCount - 1, 1)) * timeRange;
    const x = padLeft + ((t - minTime) / timeRange) * chartW;
    return { x, label: formatAxisLabel(new Date(t)) };
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
          <SvgText x="15" y={padTop + 12} fontSize="11" fill={colors.textLight} fontWeight="600">kg</SvgText>
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
          {xTicks.map((tick, i) => (
            <SvgText key={i} x={tick.x} y={H - padBottom + 20} fontSize="9" fill={colors.textLight} textAnchor="middle" fontWeight="600">
              {tick.label}
            </SvgText>
          ))}
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="url(#poidsGrad)"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r="4" fill={colors.primary} stroke={colors.white} strokeWidth="2" />
              <SvgText x={p.x} y={p.y - 10} fontSize="10" fill={colors.primary} textAnchor="middle" fontWeight="600">
                {p.valeur}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </ScrollView>
  );
}
