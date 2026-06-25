import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import useAttendanceStore from '../stores/useAttendanceStore';
import { COLORS } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';

// ── Calendar helpers ─────────────────────────────────────────────────────────
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const daysInMonth    = (y, m) => new Date(y, m + 1, 0).getDate();
const firstDayOf     = (y, m) => new Date(y, m, 1).getDay();

const displayDate = (str) => {
  if (!str) return '';
  const [y, mo, d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(mo) - 1]} ${parseInt(d)}, ${y}`;
};

// ── Inline single-select calendar ────────────────────────────────────────────
function InlineCalendar({ year, month, selected, onSelect, isDark, primaryColor }) {
  const textMain = isDark ? '#F9FAFB' : '#1F2937';
  const textSub  = isDark ? '#9CA3AF' : '#6B7280';

  const total    = daysInMonth(year, month);
  const firstDay = firstDayOf(year, month);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const getStr = (day) => {
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  return (
    <View style={{ paddingHorizontal: 4 }}>
      {/* Day labels */}
      <View style={cal.row}>
        {DAY_LABELS.map((l) => (
          <Text key={l} style={[cal.dayLbl, { color: textSub }]}>{l}</Text>
        ))}
      </View>
      {/* Weeks */}
      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, wi) => (
        <View key={wi} style={cal.row}>
          {cells.slice(wi * 7, wi * 7 + 7).map((day, ci) => {
            const str       = day ? getStr(day) : null;
            const isToday   = str === fmtDate(new Date());
            const isSel     = str === selected;
            return (
              <TouchableOpacity
                key={ci}
                activeOpacity={day ? 0.65 : 1}
                onPress={() => day && onSelect(str)}
                style={[
                  cal.cell,
                  isToday && !isSel && { borderWidth: 1, borderColor: primaryColor, borderRadius: 20 },
                  isSel   && { backgroundColor: primaryColor, borderRadius: 20 },
                ]}
              >
                {day ? (
                  <Text style={[cal.cellTxt, { color: isSel ? '#fff' : textMain }]}>
                    {day}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cal = StyleSheet.create({
  row:    { flexDirection: 'row', marginBottom: 2 },
  dayLbl: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', paddingVertical: 6 },
  cell:   { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  cellTxt:{ fontSize: 13, fontWeight: '500' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
const AttendanceScreen = ({ theme, navigateTo }) => {
  const isDark = theme === 'dark';
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;
  const { attendanceRecords, isLoading, fetchRecords, error } = useAttendanceStore();

  const now = new Date();

  // Single selected date — default today
  const [selectedDate, setSelectedDate] = useState(fmtDate(now));
  const [showPicker,   setShowPicker]   = useState(false);
  const [calYear,      setCalYear]      = useState(now.getFullYear());
  const [calMonth,     setCalMonth]     = useState(now.getMonth());

  // Fetch whenever selected date changes
  useEffect(() => {
    fetchRecords({ date: selectedDate });
  }, [selectedDate]);

  const openPicker = () => {
    const d = new Date(selectedDate);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    setShowPicker(true);
  };

  const handleSelectDay = (str) => {
    setSelectedDate(str);
    setShowPicker(false);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const formatTime = (dateString) => {
    const d = new Date(dateString);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#4CAF50';
      case 'late':    return '#FF9800';
      case 'absent':  return '#F44336';
      default:        return '#2196F3';
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'ONLINE') return 'wifi';
    if (type === 'QR')     return 'qrcode';
    return 'fingerprint';
  };

  const getTypeLabel = (type) => {
    if (type === 'ONLINE') return 'Online Attendance';
    if (type === 'QR')     return 'QR Scan';
    return 'Finger Print';
  };

  // ── theme ─────────────────────────────────────────────────────────────────
  const cardBg  = isDark ? COLORS.dark.card : '#FFFFFF';
  const textMain= isDark ? COLORS.dark.text  : '#1F2937';
  const textSub = isDark ? '#9CA3AF'         : '#6B7280';
  const bgColor = isDark ? COLORS.dark.bg    : '#F5F5F7';
  const divider = isDark ? '#374151'         : '#E5E7EB';

  return (
    <View style={[s.container, { backgroundColor: bgColor }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: primaryColor }]}>
        <MaterialIcons
          name="arrow-back-ios"
          size={20}
          color="#FFFFFF"
          onPress={() => navigateTo('Home')}
          style={{ padding: 8 }}
        />
        <Text style={s.headerTitle}>Attendance</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Date filter bar ────────────────────────────────────────────── */}
      <View style={[s.filterBar, { backgroundColor: cardBg, borderBottomColor: divider }]}>
        <TouchableOpacity style={[s.dateBtn, { borderColor: divider }]} onPress={openPicker} activeOpacity={0.7}>
          <MaterialIcons name="calendar-today" size={16} color={primaryColor} />
          <Text style={[s.dateBtnText, { color: textMain }]}>{displayDate(selectedDate)}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* ── Records ────────────────────────────────────────────────────── */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={{ color: textMain, textAlign: 'center', marginTop: 40 }}>{error}</Text>
        ) : attendanceRecords.length === 0 ? (
          <View style={s.empty}>
            <MaterialIcons name="event-busy" size={48} color={textSub} />
            <Text style={[s.emptyText, { color: textSub }]}>No records for {displayDate(selectedDate)}</Text>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: cardBg }]}>
            {attendanceRecords.map((record, index) => (
              <View
                key={record.id}
                style={[
                  s.recordItem,
                  index < attendanceRecords.length - 1 && { borderBottomWidth: 1, borderBottomColor: divider },
                ]}
              >
                <View style={[s.iconWrap, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                  <FontAwesome5 name={getTypeIcon(record.type)} size={20} color={primaryColor} />
                </View>
                <View style={s.recordInfo}>
                  <Text style={[s.recordTime, { color: textMain }]}>{formatTime(record.work_at)}</Text>
                  <Text style={[s.recordType, { color: textSub }]}>
                    {getTypeLabel(record.type)}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: `${getStatusColor(record.status)}20` }]}>
                  <Text style={[s.badgeText, { color: getStatusColor(record.status) }]}>
                    {record.timemode?.name || 'Check In'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Date Picker Modal ──────────────────────────────────────────── */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPicker(false)} />
          <View style={[s.sheet, { backgroundColor: cardBg }]}>
            {/* handle */}
            <View style={[s.handle, { backgroundColor: divider }]} />

            {/* month nav */}
            <View style={s.calNav}>
              <TouchableOpacity onPress={prevMonth} style={s.calNavBtn}>
                <MaterialIcons name="chevron-left" size={26} color={primaryColor} />
              </TouchableOpacity>
              <Text style={[s.calNavTitle, { color: textMain }]}>
                {MONTHS[calMonth]} {calYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={s.calNavBtn}>
                <MaterialIcons name="chevron-right" size={26} color={primaryColor} />
              </TouchableOpacity>
            </View>

            {/* calendar */}
            <InlineCalendar
              year={calYear}
              month={calMonth}
              selected={selectedDate}
              onSelect={handleSelectDay}
              isDark={isDark}
              primaryColor={primaryColor}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 28,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
  },
  dateBtnText: { fontSize: 14, fontWeight: '600' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },
  empty:         { alignItems: 'center', marginTop: 64, gap: 12 },
  emptyText:     { fontSize: 15 },
  card: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo:  { flex: 1, marginLeft: 12 },
  recordTime:  { fontSize: 16, fontWeight: '600' },
  recordType:  { fontSize: 12, marginTop: 2 },
  badge:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText:   { fontSize: 12, fontWeight: '600' },
  // modal
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calNavBtn:   { padding: 6 },
  calNavTitle: { fontSize: 16, fontWeight: '700' },
});

export default AttendanceScreen;
