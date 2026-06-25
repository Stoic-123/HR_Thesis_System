import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { COLORS } from '../constants/theme';
import { apiRequest } from '../services/api';
import useAuthStore from '../stores/useAuthStore';

export default function LeaveCalendarScreen({ navigation, theme }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async (year, month) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/calendar/mobile?year=${year}&month=${month}`);
      if (res.result) {
        setEvents(res.data);
      }
    } catch (error) {
      console.log('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  }, [currentMonth]);

  const generateMarkedDates = () => {
    const marks = {};
    events.forEach(event => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      
      let curr = new Date(start);
      while (curr <= end) {
        const dateStr = curr.toISOString().split('T')[0];
        if (!marks[dateStr]) {
          marks[dateStr] = { periods: [] };
        }
        marks[dateStr].periods.push({
          color: event.type === 'holiday' ? '#EF4444' : '#3B82F6',
          name: event.name,
          type: event.type
        });
        curr.setDate(curr.getDate() + 1);
      }
    });
    return marks;
  };

  const renderDay = ({ date, state, marking }) => {
    const isToday = state === 'today';
    const isDisabled = state === 'disabled';
    
    return (
      <View style={styles.dayContainer}>
        <Text style={[
          styles.dayText, 
          isDark && { color: '#E5E7EB' },
          isDisabled && { color: isDark ? '#4B5563' : '#D1D5DB' },
          isToday && styles.todayText
        ]}>
          {date.day}
        </Text>
        {marking?.periods?.map((p, index) => (
          <View key={index} style={[styles.badge, { backgroundColor: p.color }]}>
            <Text style={styles.badgeText} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Leave Calendar</Text>
            <View style={{ width: 28 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Illustration Placeholder */}
        <View style={styles.illustrationContainer}>
           <Image 
             source={require('../../assets/icon.png')} // Replace with actual illustration if available
             style={{ width: 120, height: 120, opacity: 0.5 }} 
             resizeMode="contain"
           />
        </View>

        {/* Calendar Card */}
        <View style={[styles.card, isDark && styles.darkCard]}>
          <Calendar
            current={currentMonth.toISOString().split('T')[0]}
            onMonthChange={(month) => setCurrentMonth(new Date(month.timestamp))}
            dayComponent={renderDay}
            markedDates={generateMarkedDates()}
            theme={{
              calendarBackground: 'transparent',
              textSectionTitleColor: isDark ? '#9CA3AF' : '#6B7280',
              monthTextColor: isDark ? '#FFFFFF' : '#1F2937',
              arrowColor: primaryColor,
              textMonthFontWeight: 'bold',
              textMonthFontSize: 16,
            }}
          />
          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          )}
        </View>

        {/* Event List */}
        <View style={styles.listContainer}>
          {events.map((event, index) => {
            const startDate = new Date(event.start_date);
            const dayName = startDate.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = startDate.getDate();
            const isHoliday = event.type === 'holiday';

            return (
              <View key={index} style={[styles.listItem, isDark && styles.darkListItem]}>
                <View style={[styles.dateCircle, { backgroundColor: isHoliday ? '#EF4444' : '#3B82F6' }]}>
                  <Text style={styles.dateCircleDayName}>{dayName}</Text>
                  <Text style={styles.dateCircleDayNum}>{dayNum}</Text>
                </View>
                <Text style={[styles.eventName, isDark && { color: '#FFFFFF' }, isHoliday && { color: '#EF4444' }]}>
                  {event.name}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: COLORS.orange,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
    position: 'relative',
    minHeight: 350,
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  dayContainer: {
    width: 42,
    minHeight: 46,
    alignItems: 'center',
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  dayText: {
    fontSize: 12,
    color: '#1F2937',
    marginBottom: 2,
  },
  todayText: {
    color: COLORS.orange,
    fontWeight: 'bold',
  },
  badge: {
    width: '100%',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 2,
    marginBottom: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  darkListItem: {
    backgroundColor: '#1F2937',
  },
  dateCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dateCircleDayName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dateCircleDayNum: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
});
