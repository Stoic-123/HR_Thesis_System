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
  Image,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import useLeaveStore from '../stores/useLeaveStore';
import useAuthStore from '../stores/useAuthStore';
import CircularGauge from '../components/CircularGauge';
import LeaveRequestCard from '../components/LeaveRequestCard';
import * as ImagePicker from 'expo-image-picker';

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

// ── Inline multiple-select calendar ────────────────────────────────────────────
function InlineCalendar({ year, month, selectedDates, onSelect, isDark, leaveHistory, primaryColor }) {
  const textMain = isDark ? '#F9FAFB' : '#1F2937';
  const textSub  = isDark ? '#9CA3AF' : '#6B7280';
  const disabledColor = isDark ? '#555' : '#ccc';

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

  // Get today's date without time for comparison
  const todayStr = fmtDate(new Date());

  // Function to check if a date is already in leave history (pending or approved)
  const isDateAlreadyTaken = (dateStr) => {
    return leaveHistory.some(leave => {
      if (leave.status === 'rejected') return false;
      
      // Check if dateStr is between leave.startDate and leave.endDate inclusive
      const leaveStart = new Date(leave.startDate.split('-').map(Number));
      const leaveEnd = new Date(leave.endDate.split('-').map(Number));
      const checkDate = new Date(dateStr.split('-').map(Number));
      
      return checkDate >= leaveStart && checkDate <= leaveEnd;
    });
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
            const isToday   = str === todayStr;
            const isSel     = str && selectedDates.includes(str);
            const isDisabled = str && (new Date(str) <= new Date(todayStr) || isDateAlreadyTaken(str));

            return (
              <TouchableOpacity
                key={ci}
                activeOpacity={day && !isDisabled ? 0.65 : 1}
                onPress={() => day && !isDisabled && onSelect(str)}
                style={[
                  cal.cell,
                  isToday && !isSel && !isDisabled && { borderWidth: 1, borderColor: primaryColor, borderRadius: 20 },
                  isSel   && { backgroundColor: primaryColor, borderRadius: 20 },
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
  row:    { flexDirection: 'row', marginBottom: 2 },
  dayLbl: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', paddingVertical: 6 },
  cell:   { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  cellTxt:{ fontSize: 13, fontWeight: '500' },
});

// ── Main Component ──────────────────────────────────────────────────────────
export default function LeaveHistoryScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  
  // Zustand Store
  const {
    leaveHistory,
    leaveTypes,
    leaveSummary,
    pendingLeaves,
    isLoading,
    error,
    fetchLeaveHistory,
    fetchLeaveTypes,
    fetchLeaveSummary,
    fetchPendingLeaves,
    requestLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
  } = useLeaveStore();

  // Determine if user is a manager or admin
  const userRole = user?.employee?.role?.toLowerCase() || '';
  const isManagerOrAdmin = user?.employee?.is_manager || 
    userRole.includes('manager') || 
    userRole.includes('admin') || 
    userRole.includes('hr');

  // Load backend data on mount
  useEffect(() => {
    fetchLeaveHistory().catch(err => console.log("History fetch failed:", err));
    fetchLeaveTypes().catch(err => console.log("Types fetch failed:", err));
    fetchLeaveSummary().catch(err => console.log("Summary fetch failed:", err));
    // Fetch pending for managers immediately
    if (isManagerOrAdmin) {
      fetchPendingLeaves().catch(err => console.log("Pending leaves fetch failed:", err));
    }
  }, []);

  // Fetch pending leaves when Requester tab is selected (refresh)
  useEffect(() => {
    if (activeTab === 'Requester') {
      fetchPendingLeaves().catch(err => console.log("Pending leaves fetch failed:", err));
    }
  }, [activeTab, fetchPendingLeaves]);

  // Filter leave types based on user gender
  const filteredLeaveTypes = leaveTypes.filter((type) => {
    if (type.code === 'ML') { // Maternity Leave
      return user?.employee?.gender === 'female';
    }
    return true;
  });

  // Tabs — show Requester tab only for managers/admins
  const tabs = isManagerOrAdmin
    ? ['History', 'Request Leave', 'Requester']
    : ['History', 'Request Leave'];
  const [activeTab, setActiveTab] = useState('History');
  
  // Filter category
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected
  
  // Month selector mock
  const [currentMonth, setCurrentMonth] = useState('October, 2025');

  // Form State
  const [selectedLeaveType, setSelectedLeaveType] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [photoPath, setPhotoPath] = useState(null);
  const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Date selection triggers
  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleSelectDay = (str) => {
    if (selectedDates.includes(str)) {
      // Deselect if already selected
      setSelectedDates(selectedDates.filter(date => date !== str));
    } else {
      // Select if not already selected
      setSelectedDates([...selectedDates, str]);
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // Image Picking
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photo library to upload medical certificates.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setPhotoPath(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your camera to snap photo evidence.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setPhotoPath(result.assets[0].uri);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!selectedLeaveType) {
      Alert.alert('Selection Required', 'Please select a leave type.');
      return;
    }
    if (selectedDates.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one date.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please state a reason for your leave.');
      return;
    }

    const code = selectedLeaveType.code;
    if ((code === 'SL' || code === 'ML') && !photoPath) {
      Alert.alert('Attachment Required', 'A photo reference/medical certificate is required for Sick Leave or Maternity Leave.');
      return;
    }

    const formattedReason = reason.trim();

    // Sort selected dates
    const sortedDates = [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    try {
      const response = await requestLeave({
        leave_type_id: selectedLeaveType.id,
        dates: selectedDates,
        reason: formattedReason,
        photoPath: photoPath,
      });

      if (response.result) {
        Alert.alert('Success', 'Your leave request has been submitted successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setSelectedLeaveType(null);
              setSelectedDates([]);
              setReason('');
              setPhotoPath(null);
              setActiveTab('History');
            },
          },
        ]);
      } else {
        Alert.alert('Submission Failed', response.message || 'Unable to register leave.');
      }
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'An error occurred during leave registration.');
    }
  };

  // Filter history requests
  const filteredRequests = leaveHistory.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status.toLowerCase() === filterStatus.toLowerCase();
  });

  // Themes
  const cardBg  = isDark ? COLORS.dark.card : '#FFFFFF';
  const textMain= isDark ? COLORS.dark.text  : '#1F2937';
  const textSub = isDark ? '#9CA3AF'         : '#6B7280';
  const divider = isDark ? '#374151'         : '#E5E7EB';
  const inputBg = isDark ? '#27272A'         : '#F3F4F6';

  return (
    <View 
      className="flex-1"
      style={{ backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}
    >
      {/* Header Bar */}
      <View 
        style={{ backgroundColor: primaryColor }}
        className="pt-12 pb-4 px-4 flex-row items-center justify-between"
      >
        <Pressable onPress={() => navigateTo('Home')} className="p-1 active:opacity-75">
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-base font-bold flex-1 text-center mr-6">Leave Menu</Text>
      </View>

      {/* Main Container */}
      <View className="flex-1">
        {/* 1. Main Navigation Segmented Control */}
        <View className="flex-row p-1 m-3 rounded-xl bg-slate-200/50 dark:bg-zinc-800/40">
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-lg items-center justify-center"
              style={{ backgroundColor: activeTab === tab ? primaryColor : 'transparent' }}
            >
              <Text 
                className={`text-[11px] font-bold ${activeTab === tab ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'History' ? (
          /* Render History Sub-view */
          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                {/* 2. Quotas Statistics gauges */}
            <View 
              className="p-3 m-3 rounded-2xl border"
              style={{
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              }}
            >
              <View className="flex-row flex-wrap justify-center gap-2">
                {leaveSummary.details && leaveSummary.details.length > 0 ? (
                  leaveSummary.details.map((item) => (
                    <CircularGauge 
                      key={item.id}
                      value={item.used}
                      max={Math.max(item.assignment, 1)}
                      label={item.leaveType}
                      sublabel="days"
                      color={primaryColor}
                      size={80}
                      strokeWidth={7}
                      theme={theme}
                    />
                  ))
                ) : (
                  <>
                    <CircularGauge 
                      value={leaveSummary.totalLeave}
                      max={Math.max(leaveSummary.totalLeave, 1)}
                      label="Total Leave"
                      sublabel="days"
                      color={primaryColor}
                      size={90}
                      strokeWidth={8}
                      theme={theme}
                    />
                    <CircularGauge 
                      value={leaveSummary.leaveUsed}
                      max={Math.max(leaveSummary.totalLeave, 1)}
                      label="Leave Used"
                      sublabel="days"
                      color="#2563EB"
                      size={90}
                      strokeWidth={8}
                      theme={theme}
                    />
                  </>
                )}
              </View>
            </View>

                {/* 3. Month Picker Scroller Widget */}
                <View 
                  className="flex-row justify-between items-center px-4 py-2.5 mx-3 rounded-xl border"
                  style={{
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  }}
                >
                  <Pressable className="p-1 active:opacity-60">
                    <MaterialIcons name="chevron-left" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
                  </Pressable>
                  <Text className="text-xs font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.light.text }}>
                    {currentMonth}
                  </Text>
                  <Pressable className="p-1 active:opacity-60">
                    <MaterialIcons name="chevron-right" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
                  </Pressable>
                </View>

                {/* 4. Filter chips segmented controls */}
                <View className="flex-row justify-between px-3 py-4 space-x-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'rejected', label: 'Rejected' },
                  ].map((chip) => (
                    <Pressable
                      key={chip.id}
                      onPress={() => setFilterStatus(chip.id)}
                      className="flex-1 py-1.5 rounded-lg border items-center justify-center"
                      style={{ 
                        backgroundColor: filterStatus === chip.id ? primaryColor : 'transparent',
                        borderColor: filterStatus === chip.id ? 'transparent' : (isDark ? COLORS.dark.border : COLORS.light.border) 
                      }}
                    >
                      <Text 
                        className={`text-[10px] font-bold ${filterStatus === chip.id ? 'text-white' : 'text-slate-500'}`}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <LeaveRequestCard 
                item={item} 
                theme={theme} 
                primaryColor={primaryColor}
                onCancel={async () => {
                  try {
                    await cancelLeave(item.id);
                  } catch (error) {
                    console.error('Cancel leave error:', error);
                  }
                }} 
                onViewDetails={() => {
                  setSelectedLeaveForDetails(item);
                  setShowDetailsModal(true);
                }}
              />
            )}
            ListEmptyComponent={
              <View className="items-center justify-center p-10">
                <MaterialIcons name="inbox" size={40} color={isDark ? '#4B5563' : '#9CA3AF'} />
                <Text className="text-xs mt-2" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
                  No leave records found
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        ) : activeTab === 'Request Leave' ? (
          /* Render Request Leave Form */
          <ScrollView 
            className="flex-1 px-4 py-2"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 48 }}
          >
            <View 
              className="p-5 rounded-2xl border"
              style={{
                backgroundColor: cardBg,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              }}
            >
              <Text className="text-base font-extrabold mb-4" style={{ color: textMain }}>
                Request New Leave
              </Text>

              {/* 1. Leave Type Selector */}
              <Text style={[s.sectionLabel, { color: textSub }]}>
                Leave Type
              </Text>
              <Pressable
                onPress={() => setShowTypePicker(true)}
                style={[
                  s.selector,
                  {
                    backgroundColor: inputBg,
                    borderColor: divider,
                  }
                ]}
              >
                <Text style={[s.selectorText, { color: selectedLeaveType ? textMain : textSub }]}>
                  {selectedLeaveType ? selectedLeaveType.name : 'Select Leave Type'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={primaryColor} />
              </Pressable>

              {/* 2. Select Dates */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[s.sectionLabel, { color: textSub }]}>
                  Select Dates
                </Text>
                <Pressable
                  onPress={openDatePicker}
                  style={[
                    s.selector,
                    {
                      backgroundColor: inputBg,
                      borderColor: divider,
                    }
                  ]}
                >
                  <Text style={[s.selectorText, { color: selectedDates.length > 0 ? textMain : textSub }]}>
                    {selectedDates.length > 0 
                      ? selectedDates.sort().map(date => displayDate(date)).join(', ')
                      : 'Select Dates'}
                  </Text>
                  <MaterialIcons name="date-range" size={16} color={primaryColor} />
                </Pressable>
              </View>

              {/* 3. Reason Input */}
              <Text style={[s.sectionLabel, { color: textSub }]}>
                Reason / Description
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Brief reason for your request"
                placeholderTextColor={textSub}
                multiline
                numberOfLines={3}
                style={[
                  s.textInput,
                  {
                    backgroundColor: inputBg,
                    borderColor: divider,
                    color: textMain,
                    textAlignVertical: 'top',
                  }
                ]}
              />

              {/* 4. Photo/Attachment Selector (Only show for SL/ML codes) */}
              {selectedLeaveType && (selectedLeaveType.code === 'SL' || selectedLeaveType.code === 'ML') && (
                <View style={s.photoSection}>
                  <Text style={[s.sectionLabel, { color: textSub }]}>
                    Medical Certificate / Document (Required)
                  </Text>
                  
                  {photoPath ? (
                    <View style={[s.selectedPhoto, { backgroundColor: inputBg, borderColor: divider }]}>
                      <View style={s.selectedPhotoLeft}>
                        <Image source={{ uri: photoPath }} style={s.photoThumbnail} />
                        <Text style={[s.selectedPhotoText, { color: textMain }]} numberOfLines={1}>
                          Selected Certificate Image
                        </Text>
                      </View>
                      <Pressable 
                        onPress={() => setPhotoPath(null)}
                        style={s.deletePhotoBtn}
                      >
                        <MaterialIcons name="delete" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={s.photoButtons}>
                      <Pressable
                        onPress={pickImage}
                        style={[
                          s.photoButton,
                          {
                            borderColor: primaryColor,
                            backgroundColor: isDark ? 'rgba(226, 135, 36, 0.05)' : 'rgba(226, 135, 36, 0.02)',
                          }
                        ]}
                      >
                        <MaterialIcons name="photo-library" size={18} color={primaryColor} />
                        <Text style={[s.photoButtonText, { color: primaryColor }]}>Gallery</Text>
                      </Pressable>

                      <Pressable
                        onPress={takePhoto}
                        style={[
                          s.photoButton,
                          {
                            borderColor: primaryColor,
                            backgroundColor: isDark ? 'rgba(226, 135, 36, 0.05)' : 'rgba(226, 135, 36, 0.02)',
                          }
                        ]}
                      >
                        <MaterialIcons name="photo-camera" size={18} color={primaryColor} />
                        <Text style={[s.photoButtonText, { color: primaryColor }]}>Camera</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* Approver info for managers */}
              {isManagerOrAdmin && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
                }}>
                  <MaterialIcons name="info-outline" size={16} color="#6366F1" style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: 11, color: '#6366F1', flex: 1, lineHeight: 16 }}>
                    As a manager, your leave request will be reviewed and approved by <Text style={{ fontWeight: '700' }}>Admin / HR</Text>.
                  </Text>
                </View>
              )}

              {/* 5. Submit Button */}
              {isLoading ? (
                <View style={s.loadingButton}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <Pressable
                  onPress={handleSubmit}
                  style={[s.submitButton, { backgroundColor: primaryColor }]}
                >
                  <Text style={s.submitButtonText}>
                    Submit Leave Request
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        ) : (
          /* Render Requester/Approvals list */
          <FlatList
            data={pendingLeaves}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => fetchPendingLeaves()}
                colors={[primaryColor]}
                tintColor={primaryColor}
              />
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: textSub }}>
                  Pending Approvals ({pendingLeaves.length})
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <MaterialIcons name="check-circle-outline" size={52} color={isDark ? '#374151' : '#E5E7EB'} />
                <Text style={{ fontSize: 14, fontWeight: '700', marginTop: 16, color: isDark ? COLORS.dark.text : COLORS.light.text }}>
                  All Clear!
                </Text>
                <Text style={{ fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 32, color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
                  No pending leave approval requests from your team.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                className="mx-3 my-2 p-4 rounded-2xl border"
                style={{
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                }}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-2">
                  <View style={{ flex: 1 }}>
                    <Text className="text-base font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.light.text }}>
                      {item.employee}
                    </Text>
                    {item.department && (
                      <Text style={{ fontSize: 11, color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary, marginTop: 2 }}>
                        {item.department}
                      </Text>
                    )}
                  </View>
                  <View style={{ backgroundColor: primaryColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: primaryColor }}>{item.type}</Text>
                  </View>
                </View>

                {/* Date range */}
                <View className="flex-row items-center mb-1">
                  <MaterialIcons name="event" size={13} color={isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary} />
                  <Text className="text-xs ml-2" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
                    {item.from} → {item.to}
                  </Text>
                </View>

                {item.reason && (
                  <View style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderRadius: 10,
                    padding: 10,
                    marginVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}>
                    <MaterialIcons name="notes" size={13} color={isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary} />
                    <Text className="text-xs flex-1" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary, lineHeight: 18 }}>
                      {item.reason}
                    </Text>
                  </View>
                )}

                <View className="flex-row space-x-2" style={{ marginTop: item.reason ? 0 : 10 }}>
                  <Pressable
                    onPress={async () => {
                      try {
                        const result = await approveLeave(item.id);
                        if (result?.result) {
                          Alert.alert('Approved', 'Leave request approved successfully.');
                        }
                      } catch (error) {
                        Alert.alert('Error', error.message || 'Failed to approve');
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl items-center justify-center active:opacity-75"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <Text className="text-white text-xs font-bold">✓ Approve</Text>
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      Alert.alert(
                        'Reject Request',
                        'Are you sure you want to reject this leave request?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Reject',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await rejectLeave(item.id);
                              } catch (error) {
                                Alert.alert('Error', error.message || 'Failed to reject');
                              }
                            }
                          }
                        ]
                      );
                    }}
                    className="flex-1 py-2.5 rounded-xl items-center justify-center border active:opacity-75"
                    style={{ borderColor: '#EF4444' }}
                  >
                    <Text className="text-xs font-bold" style={{ color: '#EF4444' }}>✕ Reject</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* ── Date Picker Modal ── */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDatePicker(false)} />
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
              selectedDates={selectedDates}
              onSelect={handleSelectDay}
              isDark={isDark}
              leaveHistory={leaveHistory}
              primaryColor={primaryColor}
            />
          </View>
        </View>
      </Modal>

      {/* ── Leave Type Dropdown Bottom Sheet Modal ── */}
      <Modal visible={showTypePicker} transparent animationType="slide" onRequestClose={() => setShowTypePicker(false)}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTypePicker(false)} />
          <View style={[s.sheet, { backgroundColor: cardBg }]}>
            <View style={[s.handle, { backgroundColor: divider }]} />
            <Text style={[s.modalTitle, { color: textMain }]}>Select Leave Type</Text>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {filteredLeaveTypes.length === 0 ? (
                <Text style={{ color: textSub, textAlign: 'center', marginVertical: 20, fontSize: 13 }}>
                  No leave types configured.
                </Text>
              ) : (
                filteredLeaveTypes.map((type) => {
                  // Find the employee's leave profile for this leave type
                  const leaveProfile = leaveSummary.details.find(d => d.code === type.code);
                  const balance = leaveProfile ? leaveProfile.balance : type.default_balance;
                  const used = leaveProfile ? leaveProfile.used : 0;
                  const assignment = leaveProfile ? leaveProfile.assignment : type.default_balance;
                  
                  return (
                    <Pressable
                      key={type.id}
                      onPress={() => {
                        setSelectedLeaveType(type);
                        setShowTypePicker(false);
                        if (type.code !== 'SL' && type.code !== 'ML') {
                          setPhotoPath(null);
                        }
                      }}
                      style={[s.modalItem, { borderBottomColor: divider }]}
                    >
                      <View style={{ flexDirection: 'column' }}>
                        <Text style={[s.modalItemText, { color: textMain }]}>{type.name}</Text>
                        <Text style={{ color: textSub, fontSize: 10, marginTop: 2 }}>
                          Used: {used} / Balance: {balance}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Leave Details Modal ── */}
      <Modal visible={showDetailsModal} transparent animationType="slide" onRequestClose={() => setShowDetailsModal(false)}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDetailsModal(false)} />
          <View style={[s.sheet, { backgroundColor: cardBg }]}>
            <View style={[s.handle, { backgroundColor: divider }]} />
            <Text style={[s.modalTitle, { color: textMain }]}>Leave Details</Text>
            {selectedLeaveForDetails && (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {/* Employee Name */}
                <View style={[s.detailRow, { borderBottomColor: divider }]}>
                  <Text style={[s.detailLabel, { color: textSub }]}>Employee</Text>
                  <Text style={[s.detailValue, { color: textMain }]}>{selectedLeaveForDetails.employee_name}</Text>
                </View>

                {/* Status */}
                <View style={[s.detailRow, { borderBottomColor: divider }]}>
                  <Text style={[s.detailLabel, { color: textSub }]}>Status</Text>
                  <Text style={[s.detailValue, { 
                    color: selectedLeaveForDetails.status === 'pending' ? '#F09A37' : 
                          selectedLeaveForDetails.status === 'approved' ? '#10B981' : '#EF4444',
                    fontWeight: '700'
                  }]}>
                    {selectedLeaveForDetails.status.charAt(0).toUpperCase() + selectedLeaveForDetails.status.slice(1)}
                  </Text>
                </View>

                {/* Leave Type */}
                <View style={[s.detailRow, { borderBottomColor: divider }]}>
                  <Text style={[s.detailLabel, { color: textSub }]}>Leave Type</Text>
                  <Text style={[s.detailValue, { color: textMain }]}>{selectedLeaveForDetails.leaveType}</Text>
                </View>

                {/* Start Date */}
                <View style={[s.detailRow, { borderBottomColor: divider }]}>
                  <Text style={[s.detailLabel, { color: textSub }]}>Start Date</Text>
                  <Text style={[s.detailValue, { color: textMain }]}>{selectedLeaveForDetails.startDate}</Text>
                </View>

                {/* End Date */}
                <View style={[s.detailRow, { borderBottomColor: divider }]}>
                  <Text style={[s.detailLabel, { color: textSub }]}>End Date</Text>
                  <Text style={[s.detailValue, { color: textMain }]}>{selectedLeaveForDetails.endDate}</Text>
                </View>

                {/* Duration */}
                <View style={[s.detailRow, { borderBottomColor: divider }]}>
                  <Text style={[s.detailLabel, { color: textSub }]}>Duration</Text>
                  <Text style={[s.detailValue, { color: textMain }]}>{selectedLeaveForDetails.duration}</Text>
                </View>

                {/* Reason */}
                <View style={{ paddingVertical: 12 }}>
                  <Text style={[s.detailLabel, { color: textSub, marginBottom: 8 }]}>Reason</Text>
                  <Text style={[s.reasonText, { color: textMain }]}>{selectedLeaveForDetails.reason}</Text>
                </View>

                {/* Photo (if any) */}
                {selectedLeaveForDetails.photo_path && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[s.detailLabel, { color: textSub, marginBottom: 8 }]}>Attachment</Text>
                    <Image 
                      source={{ 
                        uri: `${process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8080'}${selectedLeaveForDetails.photo_path}` 
                      }}
                      style={{ width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' }}
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
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
  modalTitle:  { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16, marginTop: 4 },
  modalItem:   { paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 15, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickersContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  datePicker: {
    flex: 1,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    minHeight: 100,
  },
  loadingButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: `${COLORS.orange}80`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  photoSection: {
    marginBottom: 16,
  },
  selectedPhoto: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedPhotoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  photoThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  selectedPhotoText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  deletePhotoBtn: {
    padding: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 999,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  photoButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
