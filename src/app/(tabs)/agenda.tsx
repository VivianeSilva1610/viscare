import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from '../../context/LocalizationContext';
import { useAuth } from '../../context/AuthContext';
import { DataService } from '../../services/dataService';
import { Appointment } from '../../services/mockDb';
import { CalendarHeart, Clock, MapPin, CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react-native';

export default function AgendaScreen() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<number>(14);

  // Estados de dados dinâmicos
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados do Modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);

  // Campos do Formulário
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formTime, setFormTime] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');

  const loadAppointments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await DataService.getAppointments(user.id);
      setAppointments(data);
    } catch (e) {
      console.warn('Erro ao carregar agenda', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user?.id]);

  const resetForm = () => {
    setFormTitle('');
    setFormDate('');
    setFormTime('');
    setFormLocation('');
    setEditingApp(null);
  };

  const openEditModal = (app: Appointment) => {
    setEditingApp(app);
    setFormTitle(app.title.startsWith('agenda.') ? t(app.title) : app.title);
    setFormDate(app.dateStr.startsWith('agenda.') ? t(app.dateStr) : app.dateStr);
    setFormTime(app.time);
    setFormLocation(app.location.startsWith('agenda.') ? t(app.location) : app.location);
    setModalVisible(true);
  };

  const handleAddOrEdit = async () => {
    if (!formTitle.trim() || !formDate.trim() || !formTime.trim() || !formLocation.trim()) {
      Alert.alert(t('common.error'), t('alert.fields_required'));
      return;
    }

    if (!user) return;

    try {
      if (editingApp) {
        // Editar agendamento existente
        const updated = await DataService.updateAppointment(user.id, editingApp.id, {
          title: formTitle,
          dateStr: formDate,
          time: formTime,
          location: formLocation
        });
        setAppointments(updated);
      } else {
        // Adicionar novo agendamento
        const newApp = await DataService.addAppointment(user.id, {
          title: formTitle,
          dateStr: formDate,
          time: formTime,
          location: formLocation,
          status: 'upcoming'
        });
        setAppointments(prev => [...prev, newApp]);
      }
      setModalVisible(false);
      resetForm();
    } catch (e) {
      console.warn('Erro ao salvar agendamento', e);
      Alert.alert(t('common.error'), t('common.connection_error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    Alert.alert(
      t('common.warning'),
      t('alert.delete_product_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DataService.deleteAppointment(user.id, id);
              setAppointments(prev => prev.filter(a => a.id !== id));
            } catch (e) {
              console.warn('Erro ao deletar', e);
            }
          }
        }
      ]
    );
  };

  const toggleStatus = async (app: Appointment) => {
    if (!user) return;
    const nextStatus = app.status === 'upcoming' ? 'completed' : 'upcoming';
    try {
      const updated = await DataService.updateAppointment(user.id, app.id, { status: nextStatus });
      setAppointments(updated);
    } catch (e) {
      console.warn('Erro ao atualizar status', e);
    }
  };

  const getDisplayValue = (val: string) => {
    if (val.startsWith('agenda.')) {
      return t(val);
    }
    return val;
  };

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

  const upcomingList = appointments.filter(a => a.status === 'upcoming');
  const completedList = appointments.filter(a => a.status === 'completed');

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-ivory">
        <ActivityIndicator size="large" color="#B97C63" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-brand-ivory px-6 pt-12 pb-24">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-8">
        <View className="flex-1 pr-4">
          <Text className="text-3xl font-serif text-brand-bronze font-bold leading-tight">
            {t('agenda.title')}
          </Text>
          <Text className="text-sm font-sans text-brand-sage-dark mt-1">
            {t('agenda.subtitle')}
          </Text>
        </View>
      </View>

      {/* Botão Adicionar Agendamento */}
      <TouchableOpacity
        onPress={() => { setEditingApp(null); setModalVisible(true); }}
        className="flex-row items-center justify-center bg-brand-rose-metallic py-3.5 px-6 rounded-full mb-8 shadow-sm"
      >
        <Plus size={16} color="white" />
        <Text className="font-sans text-xs font-bold text-white uppercase tracking-widest ml-2">
          {t('agenda.add_treatment')}
        </Text>
      </TouchableOpacity>

      {/* Calendário Elegante (Horizontal) */}
      <View className="mb-8">
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
        <Text className="font-serif text-xl text-brand-charcoal font-bold mb-4">
          {t('agenda.upcoming_treatments')}
        </Text>
        
        {upcomingList.length === 0 ? (
          <View className="bg-white p-8 rounded-3xl border border-brand-warm-gray items-center shadow-sm mb-6">
            <Text className="text-sm font-sans text-brand-sage-dark text-center mb-4 leading-relaxed">
              {t('agenda.no_treatments')}
            </Text>
            <TouchableOpacity
              onPress={() => { setEditingApp(null); setModalVisible(true); }}
              className="px-5 py-2.5 bg-brand-rose-metallic rounded-full flex-row items-center shadow-sm"
            >
              <Text className="font-sans text-xs font-semibold text-white uppercase tracking-wider">
                {t('agenda.schedule_cta')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-4">
            {upcomingList.map(app => (
              <View key={app.id} className="bg-white p-5 rounded-3xl border border-brand-warm-gray shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <TouchableOpacity onPress={() => toggleStatus(app)} className="flex-1 pr-2 flex-row items-start">
                    <Circle size={20} color="#E7D8D0" style={{ marginTop: 2, marginRight: 8 }} />
                    <View className="flex-1">
                      <Text className="font-sans text-base font-bold text-brand-charcoal">
                        {getDisplayValue(app.title)}
                      </Text>
                      <Text className="font-sans text-sm font-semibold text-brand-rose-metallic mt-1">
                        {getDisplayValue(app.dateStr)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity onPress={() => openEditModal(app)} className="p-2 bg-brand-nude/40 rounded-full mr-1">
                      <CalendarHeart size={16} color="#B97C63" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(app.id)} className="p-2 bg-red-50 rounded-full">
                      <Trash2 size={16} color="#D97D64" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View className="flex-row items-center mb-2 mt-2">
                  <Clock size={14} color="#8C8E78" />
                  <Text className="font-sans text-xs text-brand-sage-dark ml-2">{app.time}</Text>
                </View>
                <View className="flex-row items-center">
                  <MapPin size={14} color="#8C8E78" />
                  <Text className="font-sans text-xs text-brand-sage-dark ml-2">
                    {getDisplayValue(app.location)}
                  </Text>
                </View>

                <View className="mt-4 pt-4 border-t border-brand-warm-gray flex-row justify-between items-center">
                  <Text className="font-sans text-xs font-semibold text-brand-rose-metallic uppercase tracking-widest">
                    {t('agenda.active_reminder')}
                  </Text>
                  <TouchableOpacity onPress={() => openEditModal(app)} className="px-4 py-2 bg-brand-rose-light/10 rounded-full">
                    <Text className="font-sans text-xs font-bold text-brand-rose-metallic">{t('agenda.reschedule')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Histórico */}
      <View className="mb-16">
        <Text className="font-serif text-xl text-brand-charcoal font-bold mb-4">
          {t('agenda.history')}
        </Text>
        
        {completedList.length === 0 ? (
          <View className="bg-white/40 p-5 rounded-2xl border border-dashed border-brand-warm-gray items-center justify-center">
            <Text className="font-sans text-xs text-brand-sage-dark italic">Nenhum histórico disponível</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {completedList.map(app => (
              <View key={app.id} className="bg-white p-5 rounded-3xl border border-brand-warm-gray shadow-sm flex-row items-center justify-between opacity-75">
                <TouchableOpacity onPress={() => toggleStatus(app)} className="flex-row items-center flex-1 pr-4">
                  <CheckCircle2 size={24} color="#AEB09B" style={{ marginRight: 12 }} />
                  <View className="flex-1">
                    <Text className="font-sans text-sm font-bold text-brand-charcoal line-through">
                      {getDisplayValue(app.title)}
                    </Text>
                    <Text className="font-sans text-xs text-brand-sage-dark mt-1">
                      {getDisplayValue(app.dateStr)} • {app.time}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(app.id)} className="p-2 bg-red-50 rounded-full">
                  <Trash2 size={16} color="#D97D64" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* MODAL PARA ADICIONAR E EDITAR */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-white w-full rounded-3xl p-6 shadow-xl border border-brand-warm-gray max-w-sm">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-serif text-brand-charcoal font-bold">
                {editingApp ? t('agenda.modal_title_edit') : t('agenda.modal_title_add')}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <X size={20} color="#8C8E78" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16 }}>
              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  {t('agenda.placeholder_title')}
                </Text>
                <TextInput
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="ex: Limpeza de Pele"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  Data
                </Text>
                <TextInput
                  value={formDate}
                  onChangeText={setFormDate}
                  placeholder="ex: Sexta-feira, 14 de Junho"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  Horário
                </Text>
                <TextInput
                  value={formTime}
                  onChangeText={setFormTime}
                  placeholder="ex: 14:00 - 15:30"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  {t('agenda.placeholder_location')}
                </Text>
                <TextInput
                  value={formLocation}
                  onChangeText={setFormLocation}
                  placeholder="ex: Clínica VisCare"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>
            </View>

            <View className="flex-row space-x-3 mt-8">
              <TouchableOpacity
                onPress={() => { setModalVisible(false); resetForm(); }}
                className="flex-1 py-3 bg-brand-warm-gray rounded-full items-center mr-2"
              >
                <Text className="font-sans text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddOrEdit}
                className="flex-1 py-3 bg-brand-rose-metallic rounded-full items-center"
              >
                <Text className="font-sans text-xs font-bold text-white uppercase tracking-wider">
                  {t('agenda.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
