import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { colors, spacing, radius } from '../theme';
import { CATEGORY_EMOJIS } from '../constants';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function getLastMonths(n) {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}

function fmtAmount(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`;
}

export default function BudgetChart({ entries }) {
  if (!entries || entries.length === 0) return null;

  const months = getLastMonths(6);

  const monthlyTotals = months.map(({ year, month }) => {
    const total = entries
      .filter((e) => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((s, e) => s + e.montant, 0);
    return { total, label1: MONTHS_FR[month], label2: year.toString().slice(2) };
  });

  const maxVal = Math.max(...monthlyTotals.map((m) => m.total), 1);

  const catTotals = {};
  entries.forEach((e) => { catTotals[e.type] = (catTotals[e.type] || 0) + e.montant; });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const grandTotal = entries.reduce((s, e) => s + e.montant, 0);

  const W = 330, H = 160;
  const padLeft = 46, padRight = 12, padTop = 20, padBottom = 38;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;
  const n = months.length;
  const barWidth = (chartW / n) * 0.55;
  const slotW = chartW / n;

  return (
    <View>
      <Text style={styles.chartTitle}>Dépenses par mois</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartBox}>
          <Svg width={W} height={H}>
            <Line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke={colors.inputBorder} strokeWidth="1.5" />
            <Line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke={colors.inputBorder} strokeWidth="1.5" />

            {[0, 0.5, 1].map((ratio, i) => {
              const val = maxVal * ratio;
              const y = H - padBottom - ratio * chartH;
              return (
                <React.Fragment key={i}>
                  <Line x1={padLeft - 4} y1={y} x2={W - padRight} y2={y} stroke={colors.border} strokeWidth="0.5" strokeDasharray="4,3" />
                  <SvgText x={padLeft - 6} y={y + 4} fontSize="9" fill={colors.textLight} textAnchor="end">{fmtAmount(val)}</SvgText>
                </React.Fragment>
              );
            })}

            {monthlyTotals.map(({ total, label1, label2 }, i) => {
              const barH = (total / maxVal) * chartH;
              const x = padLeft + i * slotW + (slotW - barWidth) / 2;
              const y = H - padBottom - barH;
              return (
                <React.Fragment key={i}>
                  {total > 0 && (
                    <>
                      <Rect x={x} y={y} width={barWidth} height={barH} fill={colors.yellow} rx="3" />
                      <SvgText x={x + barWidth / 2} y={y - 4} fontSize="9" fill={colors.brown} textAnchor="middle" fontWeight="700">
                        {fmtAmount(total)}
                      </SvgText>
                    </>
                  )}
                  <SvgText x={x + barWidth / 2} y={H - padBottom + 13} fontSize="9" fill={colors.textLight} textAnchor="middle">{label1}</SvgText>
                  <SvgText x={x + barWidth / 2} y={H - padBottom + 25} fontSize="9" fill={colors.textMuted} textAnchor="middle">{label2}</SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </ScrollView>

      {catEntries.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.chartTitle}>Répartition par catégorie</Text>
          {catEntries.map(([cat, total]) => {
            const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
            return (
              <View key={cat} style={styles.catRow}>
                <View style={styles.catLabelRow}>
                  <Text style={styles.catLabel}>{CATEGORY_EMOJIS[cat] || ''} {cat}</Text>
                  <Text style={styles.catAmount}>{total.toFixed(0)} € ({pct.toFixed(0)}%)</Text>
                </View>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBar, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chartTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  chartBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.white },
  catRow: { marginBottom: spacing.sm },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catLabel: { fontSize: 12, color: colors.text, fontWeight: '500' },
  catAmount: { fontSize: 11, color: colors.textLight },
  catBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 4 },
  catBar: { height: 8, backgroundColor: colors.yellow, borderRadius: 4 },
});
