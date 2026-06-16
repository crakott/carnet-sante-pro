import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'carnet-sante-rappels';

export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappels soins animaux',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
      sound: 'default',
    });
  }
};

// Returns the date on which the notification should fire: eventDate minus daysBefore, at 9:00 AM
const buildTriggerDate = (eventDateStr, daysBefore) => {
  if (!eventDateStr) return null;
  const d = new Date(eventDateStr);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - Math.max(0, daysBefore));
  d.setHours(9, 0, 0, 0);
  return d;
};

// Cancel all scheduled notifications and reschedule from scratch for all animals
export const scheduleAnimalNotifications = async (animals, settings) => {
  await setupNotificationChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const vaccinDays = settings.vaccin ?? 3;
  const medDays = settings.medicament ?? 3;
  const antiDays = settings.antiparasitaire ?? 14;
  const vermDays = settings.vermifuge ?? 14;
  let count = 0;

  for (const animal of animals) {
    // Vaccins
    for (const v of (animal.vaccins || [])) {
      const trigger = buildTriggerDate(v.rappel || v.date, vaccinDays);
      if (!trigger || trigger <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💉 Vaccin à venir — ${animal.nom}`,
          body: `${v.nom} dans ${vaccinDays} jour${vaccinDays > 1 ? 's' : ''}`,
          sound: true,
          data: { type: 'vaccin', animalId: animal.id },
        },
        trigger: { date: trigger, channelId: CHANNEL_ID },
      });
      count++;
    }

    // Médicaments
    for (const m of (animal.medicaments || [])) {
      const trigger = buildTriggerDate(m.dateFin, medDays);
      if (!trigger || trigger <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 Traitement à venir — ${animal.nom}`,
          body: `${m.nom} se termine dans ${medDays} jour${medDays > 1 ? 's' : ''}`,
          sound: true,
          data: { type: 'medicament', animalId: animal.id },
        },
        trigger: { date: trigger, channelId: CHANNEL_ID },
      });
      count++;
    }

    // Antiparasitaires
    for (const t of (animal.antiparasitaires || [])) {
      const trigger = buildTriggerDate(t.prochainTraitement, antiDays);
      if (!trigger || trigger <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🦟 Antiparasitaire à venir — ${animal.nom}`,
          body: `${t.nom || 'Traitement'} dans ${antiDays} jour${antiDays > 1 ? 's' : ''}`,
          sound: true,
          data: { type: 'antiparasitaire', animalId: animal.id },
        },
        trigger: { date: trigger, channelId: CHANNEL_ID },
      });
      count++;
    }

    // Vermifuges
    for (const t of (animal.vermifuges || [])) {
      const trigger = buildTriggerDate(t.prochainTraitement, vermDays);
      if (!trigger || trigger <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🪱 Vermifuge à venir — ${animal.nom}`,
          body: `${t.nom || 'Vermifuge'} dans ${vermDays} jour${vermDays > 1 ? 's' : ''}`,
          sound: true,
          data: { type: 'vermifuge', animalId: animal.id },
        },
        trigger: { date: trigger, channelId: CHANNEL_ID },
      });
      count++;
    }
  }

  return count;
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
