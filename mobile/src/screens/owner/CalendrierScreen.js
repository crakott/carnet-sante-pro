import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Screen } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';

const ANIMAL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function CalendrierScreen() {
  const { animals } = useAnimals();
  const todayStr = getTodayStr();
  const now = new Date();

  const [currentMonth, setCurrentMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [activeFilters, setActiveFilters] = useState(() => animals.map(a => a.id));
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setActiveFilters(prev => {
      const newIds = animals.filter(a => !prev.includes(a.id)).map(a => a.id);
      if (newIds.length === 0) return prev;
      return [...prev, ...newIds];
    });
  }, [animals]);

  const goToPrevMonth = () => setCurrentMonth(prev =>
    prev.month === 0
      ? { year: prev.year - 1, month: 11 }
      : { year: prev.year, month: prev.month - 1 }
  );

  const goToNextMonth = () => setCurrentMonth(prev =>
    prev.month === 11
      ? { year: prev.year + 1, month: 0 }
      : { year: prev.year, month: prev.month + 1 }
  );

  const toggleFilter = (animalId) => {
    setActiveFilters(prev => {
      if (prev.includes(animalId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== animalId);
      }
      return [...prev, animalId];
    });
  };

  const animalColorMap = useMemo(() => {
    const map = {};
    animals.forEach((animal, idx) => {
      map[animal.id] = ANIMAL_COLORS[idx % ANIMAL_COLORS.length];
    });
    return map;
  }, [animals]);

  // Build a map: dateStr -> array of event objects
  const eventsMap = useMemo(() => {
    const map = {};
    const add = (dateStr, event) => {
      if (!dateStr || typeof dateStr !== 'string' || dateStr.length !== 10) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    animals.forEach(animal => {
      if (!activeFilters.includes(animal.id)) return;
      const color = animalColorMap[animal.id];
      const name = animal.nom || 'Animal';

      (animal.rdvs || []).forEach(rdv => {
        if (rdv.date) add(rdv.date, { animalName: name, animalColor: color, type: 'RDV', label: rdv.motif || 'Rendez-vous' });
      });

      (animal.vaccins || []).forEach(v => {
        if (v.rappel) add(v.rappel, { animalName: name, animalColor: color, type: 'Vaccin', label: v.nom || 'Vaccin' });
      });

      (animal.antiparasitaires || []).forEach(a => {
        if (a.prochaine) add(a.prochaine, { animalName: name, animalColor: color, type: 'Antiparasitaire', label: a.produit || 'Antiparasitaire' });
      });

      (animal.vermifuges || []).forEach(v => {
        if (v.prochaine) add(v.prochaine, { animalName: name, animalColor: color, type: 'Vermifuge', label: v.produit || 'Vermifuge' });
      });
    });

    return map;
  }, [animals, activeFilters, animalColorMap]);

  const { rows, year, month } = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    // Convert Sunday-based (0=Sun) to Monday-based (0=Mon)
    let startOffset = firstDay.getDay();
    startOffset = startOffset === 0 ? 6 : startOffset - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return { rows, year, month };
  }, [currentMonth]);

  const getDayStr = (day) => {
    if (!day) return null;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDayPress = (day) => {
    const str = getDayStr(day);
    setSelectedDay(prev => (prev === str ? null : str));
  };

  const selectedEvents = selectedDay ? (eventsMap[selectedDay] || []) : [];

  return (
    <Screen>
      <Text style={styles.title}>📅 Calendrier</Text>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Text style={styles.navArrow}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Text style={styles.navArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {animals.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersRow}
          contentContainerStyle={styles.filtersContent}
        >
          {animals.map(animal => {
            const color = animalColorMap[animal.id];
            const isActive = activeFilters.includes(animal.id);
            return (
              <TouchableOpacity
                key={animal.id}
                onPress={() => toggleFilter(animal.id)}
                activeOpacity={0.7}
                style={[
                  styles.filterChip,
                  { borderColor: color, backgroundColor: isActive ? color : 'transparent' },
                ]}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#fff' : color }]}>
                  {animal.nom || 'Animal'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.calendar}>
        {/* Day-of-week header row */}
        <View style={styles.calendarRow}>
          {DAY_HEADERS.map(d => (
            <View key={d} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Week rows */}
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.calendarRow}>
            {row.map((day, colIdx) => {
              const dayStr = getDayStr(day);
              const isToday = dayStr === todayStr;
              const isPast = !!(day && dayStr < todayStr);
              const isSelected = dayStr !== null && dayStr === selectedDay;
              const events = dayStr ? (eventsMap[dayStr] || []) : [];
              const dots = events.slice(0, 3);

              return (
                <TouchableOpacity
                  key={colIdx}
                  style={[
                    styles.calendarCell,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                  ]}
                  onPress={day ? () => handleDayPress(day) : undefined}
                  activeOpacity={day ? 0.7 : 1}
                  disabled={!day}
                >
                  {day ? (
                    <>
                      <Text style={[
                        styles.dayNum,
                        isToday && styles.dayNumToday,
                        isPast && !isToday && styles.dayNumPast,
                      ]}>
                        {day}
                      </Text>
                      {dots.length > 0 && (
                        <View style={styles.dotsRow}>
                          {dots.map((dot, i) => (
                            <View
                              key={i}
                              style={[styles.dot, { backgroundColor: dot.animalColor }]}
                            />
                          ))}
                        </View>
                      )}
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {selectedDay && (
        <View style={styles.detailsPanel}>
          <Text style={styles.detailsTitle}>
            {(() => {
              const parts = selectedDay.split('-');
              return `${parseInt(parts[2], 10)} ${MONTH_NAMES[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
            })()}
          </Text>
          {selectedEvents.length === 0 ? (
            <Text style={styles.noEvents}>Aucun événement ce jour.</Text>
          ) : (
            selectedEvents.map((event, i) => (
              <View
                key={i}
                style={[styles.eventItem, i === selectedEvents.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={[styles.eventDot, { backgroundColor: event.animalColor }]} />
                <View style={styles.eventBody}>
                  <Text style={styles.eventAnimal}>{event.animalName}</Text>
                  <Text style={styles.eventLabel}>{event.type} — {event.label}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    padding: spacing.sm,
  },
  navArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  filtersRow: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendar: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  calendarCell: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xs,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cellSelected: {
    backgroundColor: colors.greenLighter,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  dayNumToday: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
  dayNumPast: {
    opacity: 0.35,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailsPanel: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  noEvents: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
    flexShrink: 0,
  },
  eventBody: {
    flex: 1,
  },
  eventAnimal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  eventLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 1,
  },
});
