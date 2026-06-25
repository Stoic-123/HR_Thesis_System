import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import useOvertimeStore from '../stores/useOvertimeStore';
import useAuthStore from '../stores/useAuthStore';

// ── Calendar helpers ─────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const firstDayOf = (y, m) => new Date(y, m, 1).getDay();

const displayDate = (str) => {
  if (!str) return '';
  const [y, mo, d] = str.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo) - 1]} ${parseInt(d)}, ${y}`;
};

// ── Inline multiple-select calendar ────────────────────────────────────────────
function InlineCalendar({ year, month, selectedDates, onSelect, isDark, primaryColor }) {
  const textMain = isDark ? '#F9FAFB' : '#1F2937';
  const textSub = isDark ? '#9CA3AF' : '#6B7280';
  const disabledColor = isDark ? '#555' : '#ccc';

  const total = daysInMonth(year, month);
  const firstDay = firstDayOf(year, month);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const getStr = (day) => {
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Get today's date without time for comparison
  const todayStr = fmtDate(new Date());

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
            const str = day ? getStr(day) : null;
            const isToday = str === todayStr;
            const isSel = str && selectedDates.includes(str);
            const isDisabled = str && (new Date(str) <= new Date(todayStr));

            return (
              <TouchableOpacity
                key={ci}
                activeOpacity={day && !isDisabled ? 0.65 : 1}
                onPress={() => day && !isDisabled && onSelect(str)}
                style={[
                  cal.cell,
                  isToday && !isSel && !isDisabled && { borderWidth: 1, borderColor: primaryColor, borderRadius: 20 },
                  isSel && { backgroundColor: primaryColor, borderRadius: 20 },
                  isDisabled && { opacity: 0.4 },
                ]}
              >
                {day ? (
                  <Text style={[
                    cal.cellTxt,
                    {
                      color: isSel ? '#fff' :
                             isDisabled ? disabledColor :
                             textMain
                    }
                  ]}>
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
  row: { flexDirection: 'row', marginBottom: 2 },
  dayLbl: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', paddingVertical: 6 },
  cell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  cellTxt: { fontSize: 13, fontWeight: '500' },
});

// ── Overtime Card ────────────────────────────────────────────────────────────
function OvertimeCard({ item, isDark, onViewDetails, primaryColor }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'approved': return 'check-circle';
      case 'rejected': return 'cancel';
      default: return 'schedule';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return primaryColor;
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return primaryColor;
    }
  };

  const startDate = new Date(item.start_date);
  const endDate = new Date(item.end_date);
  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  const statusColor = getStatusColor(item.status);

  return (
    <View style={[
      leaveStyles.card,
      {
        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
        borderColor: isDark ? COLORS.dark.border : COLORS.light.border
      }
    ]}>
      <View style={leaveStyles.cardHeader}>
        <View style={[leaveStyles.leaveTypeBadge, { backgroundColor: statusColor + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }]}>
          <MaterialIcons name="timer" size={13} color={statusColor} />
          <Text style={[leaveStyles.leaveTypeText, { color: statusColor }]}>
            Overtime
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor }}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
          <MaterialIcons name={getStatusIcon(item.status)} size={18} color={statusColor} />
        </View>
      </View>
      <View style={leaveStyles.cardBody}>
        <View style={leaveStyles.dateRange}>
          <MaterialIcons name="date-range" size={15} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[leaveStyles.dateText, { color: isDark ? '#E5E7EB' : '#374151', fontSize: 13 }]}>
            {formatDate(startDate)}
          </Text>
          <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 12 }}>→</Text>
          <Text style={[leaveStyles.dateText, { color: isDark ? '#E5E7EB' : '#374151', fontSize: 13 }]}>
            {formatDate(endDate)}
          </Text>
        </View>
        {item.reason && (
          <View style={leaveStyles.reasonContainer}>
            <MaterialIcons name="notes" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[leaveStyles.reasonText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
              {item.reason}
            </Text>
          </View>
        )}
      </View>
      <View style={leaveStyles.cardFooter}>
        <View />
        {onViewDetails && (
          <Pressable onPress={onViewDetails} style={[leaveStyles.viewDetailsBtn, { backgroundColor: primaryColor }]}>
            <Text style={leaveStyles.viewDetailsText}>View Details</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const leaveStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaveTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardBody: {
    gap: 10,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonText: {
    fontSize: 13,
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewDetailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

// ── Main Component ──────────────────────────────────────────────────────────
export default function OvertimeScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';

  // Determine if user is a manager or admin
  const userRole = user?.employee?.role?.toLowerCase() || '';
  const isManagerOrAdmin = user?.employee?.is_manager || 
    userRole.includes('manager') || 
    userRole.includes('admin') || 
    userRole.includes('hr');

  // Zustand Store
  const {
    overtimeHistory,
    pendingOvertimes,
    isLoading,
    error,
    fetchOvertimeHistory,
    fetchPendingOvertimes,
    requestOvertime,
    approveOvertime,
    rejectOvertime,
    cancelOvertime,
  } = useOvertimeStore();

  // Tabs — show Requester tab only for managers/admins
  const tabs = isManagerOrAdmin
    ? ['History', 'Request Overtime', 'Requester']
    : ['History', 'Request Overtime'];
  const [activeTab, setActiveTab] = useState('History');

  // Load backend data on mount
  useEffect(() => {
    fetchOvertimeHistory().catch(err => console.log("Overtime history fetch failed:", err));
    // Fetch pending for managers immediately so they have data ready
    if (isManagerOrAdmin) {
      fetchPendingOvertimes().catch(err => console.log("Pending overtimes fetch failed:", err));
    }
  }, []);

  // Fetch pending overtimes when Requester tab is selected (refresh)
  useEffect(() => {
    if (activeTab === 'Requester') {
      fetchPendingOvertimes().catch(err => console.log("Pending overtimes fetch failed:", err));
    }
  }, [activeTab]);

  // Filter category
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected

  // Form State
  const [selectedDate, setSelectedDate] = useState('');
  const [startHour, setStartHour] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('17');
  const [endMinute, setEndMinute] = useState('00');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedOvertimeForDetails, setSelectedOvertimeForDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Date selection triggers
  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleSelectDay = (str) => {
    setSelectedDate(str);
    setShowDatePicker(false);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const handleRequestOvertime = async () => {
    if (!selectedDate) {
      Alert.alert('Validation Error', 'Please select a date.');
      return;
    }
    if (!startHour || !startMinute || !endHour || !endMinute) {
      Alert.alert('Validation Error', 'Please provide complete start and end times.');
      return;
    }
    if (!reason || !reason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for overtime.');
      return;
    }

    const startMins = parseInt(startHour || 0) * 60 + parseInt(startMinute || 0);
    const endMins = parseInt(endHour || 0) * 60 + parseInt(endMinute || 0);
    if (endMins <= startMins) {
      Alert.alert('Validation Error', 'End time must be after start time.');
      return;
    }

    try {
      const sh = startHour.padStart(2, '0');
      const sm = startMinute.padStart(2, '0');
      const eh = endHour.padStart(2, '0');
      const em = endMinute.padStart(2, '0');
      
      const startIso = `${selectedDate}T${sh}:${sm}:00`;
      const endIso = `${selectedDate}T${eh}:${em}:00`;

      const response = await requestOvertime({
        start_date: startIso,
        end_date: endIso,
        reason: reason.trim(),
      });

      if (response.result) {
        Alert.alert('Success', 'Overtime request submitted successfully!');
        setReason('');
        setSelectedDate('');
      } else {
        Alert.alert('Error', response.message || 'Failed to submit overtime request');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    }
  };

  const filteredHistory = overtimeHistory.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  // Themes
  const cardBg = isDark ? COLORS.dark.card : COLORS.light.card;
  const textMain = isDark ? COLORS.dark.text : '#1F2937';
  const textSub = isDark ? '#9CA3AF' : '#6B7280';
  const divider = isDark ? '#374151' : '#E5E7EB';
  const inputBg = isDark ? '#27272A' : '#F3F4F6';

  const formatDateForDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}>
      {/* Header */}
      <View style={{
        padding: 20,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: primaryColor,
      }}>
        <Pressable onPress={() => navigateTo('Home')}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1 }}>
          Overtime
        </Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        {tabs.map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              {
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: activeTab === tab ? primaryColor : 'transparent',
              }
            ]}
          >
            <Text style={{
              color: activeTab === tab ? '#FFF' : isDark ? '#9CA3AF' : '#6B7280',
              fontSize: 11,
              fontWeight: 'bold',
            }}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'History' ? (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 12, paddingTop: 0, paddingBottom: 16 }}>
              {/* Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              >
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => setFilterStatus(status)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: filterStatus === status
                        ? primaryColor
                        : isDark ? COLORS.dark.card : COLORS.light.card,
                      borderWidth: 1,
                      borderColor: filterStatus === status ? 'transparent' : (isDark ? COLORS.dark.border : COLORS.light.border),
                    }}
                  >
                    <Text style={{
                      color: filterStatus === status
                        ? '#FFF'
                        : isDark ? '#E5E7EB' : '#1F2937',
                      fontSize: 10,
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <MaterialIcons name="timer-off" size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
              <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 14 }}>
                No overtime records found
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 12 }}>
              <OvertimeCard 
                item={item} 
                isDark={isDark}
                primaryColor={primaryColor}
                onViewDetails={() => {
                  setSelectedOvertimeForDetails(item);
                  setShowDetailsModal(true);
                }}
              />
            </View>
          )}
        />
      ) : activeTab === 'Request Overtime' ? (
        <ScrollView style={{ flex: 1, padding: 16, paddingTop: 0 }} showsVerticalScrollIndicator={false}>
          {/* Form Card */}
          <View style={{
            padding: 20,
            borderRadius: 20,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
          }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: textMain }}>
              Request New Overtime
            </Text>

            {/* Select Date */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 8, color: textSub, textTransform: 'uppercase' }}>
                Select Date
              </Text>
              <Pressable onPress={openDatePicker} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                borderWidth: 1,
                backgroundColor: inputBg,
                borderColor: divider,
              }}>
                <Text style={{ color: textMain, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>
                  {selectedDate ? displayDate(selectedDate) : 'Select Date'}
                </Text>
                <MaterialIcons name="date-range" size={16} color={primaryColor} />
              </Pressable>
            </View>

            {/* Time Selection */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              {/* Start Time */}
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 8, color: textSub, textTransform: 'uppercase' }}>
                  Start Time (HH:MM)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={startHour}
                    onChangeText={(t) => {
                      let val = t.replace(/[^0-9]/g, '');
                      if (val.length === 2 && parseInt(val) > 23) val = '23';
                      setStartHour(val);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="HH"
                    placeholderTextColor={textSub}
                    style={{ flex: 1, textAlign: 'center', height: 48, backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor: divider, color: textMain, fontSize: 16, fontWeight: 'bold' }}
                  />
                  <Text style={{ marginHorizontal: 8, color: textMain, fontWeight: 'bold', fontSize: 18 }}>:</Text>
                  <TextInput
                    value={startMinute}
                    onChangeText={(t) => {
                      let val = t.replace(/[^0-9]/g, '');
                      if (val.length === 2 && parseInt(val) > 59) val = '59';
                      setStartMinute(val);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor={textSub}
                    style={{ flex: 1, textAlign: 'center', height: 48, backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor: divider, color: textMain, fontSize: 16, fontWeight: 'bold' }}
                  />
                </View>
              </View>

              {/* End Time */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 8, color: textSub, textTransform: 'uppercase' }}>
                  End Time (HH:MM)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={endHour}
                    onChangeText={(t) => {
                      let val = t.replace(/[^0-9]/g, '');
                      if (val.length === 2 && parseInt(val) > 23) val = '23';
                      setEndHour(val);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="HH"
                    placeholderTextColor={textSub}
                    style={{ flex: 1, textAlign: 'center', height: 48, backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor: divider, color: textMain, fontSize: 16, fontWeight: 'bold' }}
                  />
                  <Text style={{ marginHorizontal: 8, color: textMain, fontWeight: 'bold', fontSize: 18 }}>:</Text>
                  <TextInput
                    value={endMinute}
                    onChangeText={(t) => {
                      let val = t.replace(/[^0-9]/g, '');
                      if (val.length === 2 && parseInt(val) > 59) val = '59';
                      setEndMinute(val);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor={textSub}
                    style={{ flex: 1, textAlign: 'center', height: 48, backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor: divider, color: textMain, fontSize: 16, fontWeight: 'bold' }}
                  />
                </View>
              </View>
            </View>

            {/* Reason */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 8, color: textSub, textTransform: 'uppercase' }}>
                Reason
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason for overtime"
                placeholderTextColor={textSub}
                multiline
                style={{
                  minHeight: 100,
                  backgroundColor: inputBg,
                  borderRadius: 16,
                  padding: 16,
                  textAlignVertical: 'top',
                  color: textMain,
                  borderWidth: 1,
                  borderColor: divider,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              />
            </View>

            {/* Approver info for managers */}
            {isManagerOrAdmin && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                gap: 8,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
              }}>
                <MaterialIcons name="info-outline" size={16} color="#6366F1" style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 11, color: '#6366F1', flex: 1, lineHeight: 16 }}>
                  As a manager, your overtime request will be reviewed and approved by <Text style={{ fontWeight: '700' }}>Admin / HR</Text>.
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <Pressable
              onPress={handleRequestOvertime}
              disabled={isLoading}
              style={{
                height: 48,
                backgroundColor: primaryColor,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Submit Request
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={pendingOvertimes}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => fetchPendingOvertimes()}
              colors={[primaryColor]}
              tintColor={primaryColor}
            />
          }
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: textSub }}>
                Pending Approvals ({pendingOvertimes.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <MaterialIcons name="check-circle-outline" size={52} color={isDark ? '#374151' : '#E5E7EB'} />
              <Text style={{ fontSize: 14, fontWeight: '700', marginTop: 16, color: textMain }}>
                All Clear!
              </Text>
              <Text style={{ fontSize: 12, textAlign: 'center', marginTop: 6, color: textSub, lineHeight: 18 }}>
                No pending overtime requests from your team.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{
              marginHorizontal: 12,
              marginVertical: 6,
              padding: 16,
              borderRadius: 20,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: textMain }}>
                    {item.employee}
                  </Text>
                  {item.department && (
                    <Text style={{ fontSize: 11, color: textSub, marginTop: 2 }}>
                      {item.department}
                    </Text>
                  )}
                </View>
                <View style={{ backgroundColor: primaryColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: primaryColor, textTransform: 'uppercase' }}>Overtime</Text>
                </View>
              </View>

              {/* Time */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                <MaterialIcons name="access-time" size={14} color={textSub} />
                <Text style={{ fontSize: 12, color: textSub, flex: 1 }}>
                  {formatDateForDisplay(item.start_date)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: item.reason ? 8 : 14, gap: 6 }}>
                <MaterialIcons name="timer-off" size={14} color={textSub} />
                <Text style={{ fontSize: 12, color: textSub, flex: 1 }}>
                  {formatDateForDisplay(item.end_date)}
                </Text>
              </View>

              {item.reason && (
                <View style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 6,
                }}>
                  <MaterialIcons name="notes" size={13} color={textSub} />
                  <Text style={{ fontSize: 12, color: textSub, flex: 1, lineHeight: 18 }}>
                    {item.reason}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={async () => {
                    try {
                      const result = await approveOvertime(item.id);
                      if (result?.result) {
                        Alert.alert('Approved', 'Overtime request approved successfully.');
                      }
                    } catch (error) {
                      Alert.alert('Error', error.message || 'Failed to approve');
                    }
                  }}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓ Approve</Text>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    Alert.alert(
                      'Reject Request',
                      'Are you sure you want to reject this overtime request?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reject',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await rejectOvertime(item.id);
                            } catch (error) {
                              Alert.alert('Error', error.message || 'Failed to reject');
                            }
                          }
                        }
                      ]
                    );
                  }}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>✕ Reject</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDatePicker(false)} />
          <View style={{
            backgroundColor: cardBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 16,
            paddingBottom: 36,
          }}>
            <View style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: divider,
              alignSelf: 'center',
              marginTop: 12,
              marginBottom: 12,
            }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity onPress={prevMonth} style={{ padding: 6 }}>
                <MaterialIcons name="chevron-left" size={26} color={primaryColor} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '700', color: textMain }}>
                {MONTHS[calMonth]} {calYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={{ padding: 6 }}>
                <MaterialIcons name="chevron-right" size={26} color={primaryColor} />
              </TouchableOpacity>
            </View>

            <InlineCalendar
              year={calYear}
              month={calMonth}
              selectedDates={selectedDate ? [selectedDate] : []}
              onSelect={handleSelectDay}
              isDark={isDark}
              primaryColor={primaryColor}
            />
          </View>
        </View>
      </Modal>

      {/* Overtime Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDetailsModal(false)} />
          <View style={{
            backgroundColor: cardBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 16,
            paddingBottom: 36,
          }}>
            <View style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: divider,
              alignSelf: 'center',
              marginTop: 12,
              marginBottom: 12,
            }} />
            <Text style={{ fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16, color: textMain }}>
              Overtime Details
            </Text>
            {selectedOvertimeForDetails && (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {/* Employee Name */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: divider,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textSub }}>Employee</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: textMain }}>
                    {selectedOvertimeForDetails.employee_name}
                  </Text>
                </View>

                {/* Status */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: divider,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textSub }}>Status</Text>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selectedOvertimeForDetails.status === 'pending'
                      ? primaryColor
                      : selectedOvertimeForDetails.status === 'approved'
                        ? '#10B981'
                        : '#EF4444',
                  }}>
                    {selectedOvertimeForDetails.status.charAt(0).toUpperCase() + selectedOvertimeForDetails.status.slice(1)}
                  </Text>
                </View>

                {/* Start Date */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: divider,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textSub }}>Start Date</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: textMain }}>
                    {formatDateForDisplay(selectedOvertimeForDetails.start_date)}
                  </Text>
                </View>

                {/* End Date */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: divider,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textSub }}>End Date</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: textMain }}>
                    {formatDateForDisplay(selectedOvertimeForDetails.end_date)}
                  </Text>
                </View>

                {/* Reason */}
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textSub, marginBottom: 8 }}>Reason</Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: textMain }}>
                    {selectedOvertimeForDetails.reason}
                  </Text>
                </View>

                {/* Cancel Request Button */}
                {selectedOvertimeForDetails.status === 'pending' && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Cancel Request',
                        'Are you sure you want to cancel this overtime request?',
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Yes',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const response = await cancelOvertime(selectedOvertimeForDetails.id);
                                if (response.result) {
                                  Alert.alert('Success', 'Overtime request cancelled successfully.');
                                  setShowDetailsModal(false);
                                } else {
                                  Alert.alert('Error', response.message || 'Failed to cancel request.');
                                }
                              } catch (err) {
                                Alert.alert('Error', err.message || 'Failed to cancel request.');
                              }
                            }
                          }
                        ]
                      );
                    }}
                    style={{
                      backgroundColor: '#EF4444',
                      paddingVertical: 12,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 16,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }}>
                      Cancel Request
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
