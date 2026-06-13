import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from '../../context/LocalizationContext';
import { CalendarHeart, Clock, MapPin, CheckCircle2 } from 'lucide-react-native';

interface Appointment {
  id: string;
  title: string;
  dateStr: string;
  time: string;
  location: string;
  status: 'upcoming' | 'completed';
}

export default function AgendaScreen() {
  const { t, language } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<number>(14);

  // Mock de consultas estéticas
  const appointments: Appointment[] = [
    {
      id: 'app-1',
      title: t('agenda.treatment_deep_cleansing'),
      dateStr: t('agenda.day_14_jun'),
      time: '14:00 - 15:30',
      location: t('agenda.clinic_name'),
      status: 'upcoming',
    },
    {
      id: 'app-2',
      title: t('agenda.treatment_peeling'),
      dateStr: t('agenda.day_27_jun'),
      time: '10:00 - 11:00',
      location: t('agenda.clinic_name'),
      status: 'upcoming',
    }
  ];

  // Calendário horizontal mock
  const weekdays = {
    it: ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'],
    en: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    pt: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
  };

  const currentWeekdays = weekdays[language] || weekdays['it'];

  const days = [
    { day: currentWeekdays[0], date: 10 },
    { day: currentWeekdays[1], date: 11 },
    { day: currentWeekdays[2], date: 12 },
    { day: currentWeekdays[3], date: 13 },
    { day: currentWeekdays[4], date: 14 },
    { day: currentWeekdays[5], date: 15 },
    { day: currentWeekdays[6], date: 16 },
  ];

  return (
    <ScrollView className="flex-1 bg-brand-ivory px-6 pt-12 pb-24">
      {/* Header */}
      <View className="mb-8">
        <Text className="text-3xl font-serif text-brand-bronze font-bold leading-tight">
          {t('agenda.title')}
        </Text>
        <Text className="text-sm font-sans text-brand-sage-dark mt-1">
          {t('agenda.subtitle')}
        </Text>
      </View>

      {/* Calendário Elegante (Horizontal) */}
      <View className="mb-10">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
          {days.map(d => {
            const isSelected = d.date === selectedDate;
            return (
              <TouchableOpacity
                key={d.date}
                onPress={() => setSelectedDate(d.date)}
                className={`w-16 h-20 items-center justify-center rounded-full mr-3 shadow-sm border ${
                  isSelected ? 'bg-brand-rose-metallic border-brand-rose-metallic' : 'bg-white border-brand-warm-gray'
                }`}
              >
                <Text className={`font-sans text-xs font-semibold mb-1 ${isSelected ? 'text-brand-nude' : 'text-brand-sage-dark'}`}>
                  {d.day}
                </Text>
                <Text className={`font-serif text-xl font-bold ${isSelected ? 'text-white' : 'text-brand-charcoal'}`}>
                  {d.date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Consultas Agendadas */}
      <View className="mb-8">
        <Text className="font-serif text-xl text-brand-charcoal font-bold mb-4">{t('agenda.upcoming_treatments')}</Text>
        
        <View className="space-y-4">
          {appointments.map(app => (
            <View key={app.id} className="bg-white p-5 rounded-3xl border border-brand-warm-gray shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <Text className="font-sans text-base font-bold text-brand-charcoal">{app.title}</Text>
                  <Text className="font-sans text-sm font-semibold text-brand-rose-metallic mt-1">{app.dateStr}</Text>
                </View>
                <View className="w-12 h-12 bg-brand-nude rounded-full items-center justify-center">
                  <CalendarHeart size={20} color="#B97C63" />
                </View>
              </View>
              
              <View className="flex-row items-center mb-2 mt-2">
                <Clock size={14} color="#8C8E78" />
                <Text className="font-sans text-xs text-brand-sage-dark ml-2">{app.time}</Text>
              </View>
              <View className="flex-row items-center">
                <MapPin size={14} color="#8C8E78" />
                <Text className="font-sans text-xs text-brand-sage-dark ml-2">{app.location}</Text>
              </View>

              <View className="mt-4 pt-4 border-t border-brand-warm-gray flex-row justify-between items-center">
                <Text className="font-sans text-xs font-semibold text-brand-blue-tech uppercase tracking-widest">
                  {t('agenda.active_reminder')}
                </Text>
                <TouchableOpacity className="px-4 py-2 bg-brand-rose-light/10 rounded-full">
                  <Text className="font-sans text-xs font-bold text-brand-rose-metallic">{t('agenda.reschedule')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Histórico / Outros (Placeholder) */}
      <View className="mb-8">
        <Text className="font-serif text-xl text-brand-charcoal font-bold mb-4">{t('agenda.history')}</Text>
        <View className="bg-white p-5 rounded-3xl border border-brand-warm-gray shadow-sm flex-row items-center justify-between opacity-70">
          <View>
            <Text className="font-sans text-sm font-bold text-brand-charcoal line-through">{t('agenda.treatment_evaluation')}</Text>
            <Text className="font-sans text-xs text-brand-sage-dark mt-1">{t('agenda.day_01_jun')}</Text>
          </View>
          <CheckCircle2 size={24} color="#AEB09B" />
        </View>
      </View>

    </ScrollView>
  );
}
