import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { kpiService } from '../services/api';
import useAuthStore from '../stores/useAuthStore';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = [
  { val: 1, label: 'Jan' },
  { val: 2, label: 'Feb' },
  { val: 3, label: 'Mar' },
  { val: 4, label: 'Apr' },
  { val: 5, label: 'May' },
  { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' },
  { val: 8, label: 'Aug' },
  { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' },
  { val: 11, label: 'Nov' },
  { val: 12, label: 'Dec' },
];

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

export default function KPIScreen({ theme, navigateTo }) {
  const isDark = theme === 'dark';
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const [activeTab, setActiveTab] = useState('my_kpi'); // 'my_kpi' or 'team_review'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Filter months to only show from current month down (no future months)
  const availableMonths = React.useMemo(() => {
    if (selectedYear === currentYear) {
      return MONTHS.filter((m) => m.val <= currentMonth);
    } else if (selectedYear < currentYear) {
      return MONTHS;
    } else {
      return [];
    }
  }, [selectedYear]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [myKPIData, setMyKPIData] = useState(null);
  const [teamKPIData, setTeamKPIData] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form states for manager evaluation
  const [discipline, setDiscipline] = useState('good');
  const [output, setOutput] = useState('good');
  const [attitude, setAttitude] = useState('good');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSwitchTab = (newTab) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (_) {}
    setActiveTab(newTab);
  };

  const setRatingWithAnim = (setter, value) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (_) {}
    setter(value);
  };

  const fetchMyKPI = async () => {
    try {
      setLoading(true);
      const res = await kpiService.getMyKPI(selectedYear);
      if (res && res.data) {
        setMyKPIData(res.data);
      }
    } catch (err) {
      console.warn('[KPIScreen] fetchMyKPI error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTeamKPI = async () => {
    try {
      setLoading(true);
      const res = await kpiService.getTeamKPI(selectedMonth, selectedYear);
      if (res && res.data) {
        setTeamKPIData(res.data);
        if (res.data.team && res.data.team.length > 0) {
          const first = res.data.team[0];
          setSelectedMember(first);
          if (first.evaluation) {
            setDiscipline(first.evaluation.discipline_rating || 'good');
            setOutput(first.evaluation.output_rating || 'good');
            setAttitude(first.evaluation.attitude_rating || 'good');
            setComment(first.evaluation.manager_comment || '');
          } else {
            setDiscipline('good');
            setOutput('good');
            setAttitude('good');
            setComment('');
          }
        }
      }
    } catch (err) {
      console.warn('[KPIScreen] fetchTeamKPI error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_kpi') {
      fetchMyKPI();
    } else {
      fetchTeamKPI();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'my_kpi') fetchMyKPI();
    else fetchTeamKPI();
  };

  // Team Filter State: 'all', 'pending', 'evaluated'
  const [teamFilter, setTeamFilter] = useState('all');

  const pendingCount = React.useMemo(() => {
    return teamKPIData?.team?.filter((item) => !item.isEvaluated).length || 0;
  }, [teamKPIData]);

  const evaluatedCount = React.useMemo(() => {
    return teamKPIData?.team?.filter((item) => item.isEvaluated).length || 0;
  }, [teamKPIData]);

  const filteredTeam = React.useMemo(() => {
    if (!teamKPIData?.team) return [];
    if (teamFilter === 'pending') {
      return teamKPIData.team.filter((item) => !item.isEvaluated);
    }
    if (teamFilter === 'evaluated') {
      return teamKPIData.team.filter((item) => item.isEvaluated);
    }
    return teamKPIData.team;
  }, [teamKPIData, teamFilter]);

  const handleFilterChange = (filter) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (_) {}
    setTeamFilter(filter);

    const newFiltered =
      filter === 'pending'
        ? teamKPIData?.team?.filter((i) => !i.isEvaluated) || []
        : filter === 'evaluated'
        ? teamKPIData?.team?.filter((i) => i.isEvaluated) || []
        : teamKPIData?.team || [];

    if (newFiltered.length > 0) {
      const isStillPresent = newFiltered.some((i) => i.employee.id === selectedMember?.employee?.id);
      if (!isStillPresent) {
        handleSelectMember(newFiltered[0]);
      }
    } else {
      setSelectedMember(null);
    }
  };

  const handleSelectMember = (member) => {
    if (!member) {
      setSelectedMember(null);
      return;
    }
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (_) {}
    setSelectedMember(member);
    if (member.evaluation) {
      setDiscipline(member.evaluation.discipline_rating || 'good');
      setOutput(member.evaluation.output_rating || 'good');
      setAttitude(member.evaluation.attitude_rating || 'good');
      setComment(member.evaluation.manager_comment || '');
    } else {
      setDiscipline('good');
      setOutput('good');
      setAttitude('good');
      setComment('');
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedMember) return;
    try {
      setSubmitting(true);
      const res = await kpiService.submitKPI({
        employeeId: selectedMember.employee.id,
        month: selectedMonth,
        year: selectedYear,
        disciplineRating: discipline,
        outputRating: output,
        attitudeRating: attitude,
        managerComment: comment,
      });

      if (res && res.success) {
        Alert.alert('Success', 'Performance evaluation saved successfully!');
        fetchTeamKPI();
      } else {
        Alert.alert('Error', res?.message || 'Failed to submit evaluation');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute live preview score & grade
  const dVal = discipline === 'good' ? 3 : discipline === 'average' ? 2 : 1;
  const oVal = output === 'good' ? 3 : output === 'average' ? 2 : 1;
  const aVal = attitude === 'good' ? 3 : attitude === 'average' ? 2 : 1;
  const previewScore = ((dVal + oVal + aVal) / 3).toFixed(2);
  const previewGrade =
    Number(previewScore) >= 2.5 ? 'GOOD' : Number(previewScore) >= 1.7 ? 'AVERAGE' : 'NEEDS_IMPROVEMENT';

  // Theme colors
  const bgMain = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textMain = isDark ? '#F9FAFB' : '#111827';
  const textSub = isDark ? '#9CA3AF' : '#64748B';
  const borderCol = isDark ? '#374151' : '#E2E8F0';

  // Determine if the user is a manager or has subordinates
  const roleName = user?.employee?.role?.name?.toLowerCase() || (typeof user?.employee?.role === 'string' ? user.employee.role.toLowerCase() : '');
  const isManagerRole = roleName.includes('manager') || roleName.includes('admin') || roleName.includes('hr') || roleName.includes('lead') || roleName.includes('head');
  const hasSubordinates = teamKPIData?.isManager === true || (teamKPIData?.team && teamKPIData.team.length > 0);
  const isManagerUser = isManagerRole || hasSubordinates;

  return (
    <View style={{ flex: 1, backgroundColor: bgMain }}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      {/* ── 1. Curved Primary Header with Safe Area ────────────────── */}
      <View
        style={{
          backgroundColor: primaryColor,
          paddingBottom: isManagerUser ? 34 : 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          elevation: 8,
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          zIndex: 10,
        }}
      >
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigateTo('Home')}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <Feather name="chevron-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                {isManagerUser ? 'Performance Evaluation' : 'My Performance KPI'}
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>
                {isManagerUser ? 'Monthly KPI' : 'My Results'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── 2. Floating Segmented Tabs (Shown ONLY for Managers) ──────── */}
      {isManagerUser && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
            borderRadius: 18,
            padding: 4,
            marginHorizontal: 20,
            marginTop: -20,
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            zIndex: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleSwitchTab('my_kpi')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTab === 'my_kpi' ? primaryColor : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTab === 'my_kpi' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#475569'),
              }}
            >
              My Results (ផ្ទាល់ខ្លួន)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleSwitchTab('team_review')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTab === 'team_review' ? primaryColor : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTab === 'team_review' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#475569'),
              }}
            >
              Team Review (វាយតម្លៃ)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 3. Month Filter Chips ───────────────────────────────────── */}
      <View style={{ marginTop: 14, marginBottom: 4 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {availableMonths.map((m) => {
            const isSel = selectedMonth === m.val;
            return (
              <TouchableOpacity
                key={m.val}
                activeOpacity={0.75}
                onPress={() => {
                  try {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  } catch (_) {}
                  setSelectedMonth(m.val);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isSel ? primaryColor : (isDark ? '#1F2937' : '#FFFFFF'),
                  borderWidth: 1,
                  borderColor: isSel ? primaryColor : (isDark ? '#374151' : '#E2E8F0'),
                  elevation: isSel ? 3 : 1,
                  shadowColor: isSel ? primaryColor : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isSel ? 0.2 : 0.03,
                  shadowRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSel ? '800' : '600',
                    color: isSel ? '#FFFFFF' : (isDark ? '#F9FAFB' : '#334155'),
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 4. Main Content Area ────────────────────────────────────── */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={{ marginTop: 12, color: textSub, fontSize: 13 }}>Loading KPI details...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[primaryColor]} />}
        >
          {/* ======================================================== */}
          {/* TAB 1: MY RESULTS                                       */}
          {/* ======================================================== */}
          {activeTab === 'my_kpi' && (
            <View style={{ gap: 16 }}>
              {/* Annual Scorecard Card */}
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 24,
                  padding: 20,
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  borderWidth: 1,
                  borderColor: borderCol,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Year {selectedYear} Performance
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: textMain, marginTop: 3 }}>
                      Grade: {myKPIData?.summary?.yearlyGrade || 'NONE'}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: `${primaryColor}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FontAwesome5 name="award" size={22} color={primaryColor} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: isDark ? '#111827' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: isDark ? '#374151' : '#F1F5F9',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: textSub }}>Avg. Score</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: textMain, marginTop: 4 }}>
                      {myKPIData?.summary?.yearlyAverageScore || '0.00'}{' '}
                      <Text style={{ fontSize: 11, color: textSub, fontWeight: 'normal' }}>/ 3.0</Text>
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: isDark ? '#111827' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: isDark ? '#374151' : '#F1F5F9',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: textSub }}>Evaluated Months</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: textMain, marginTop: 4 }}>
                      {myKPIData?.summary?.totalEvaluatedMonths || 0}{' '}
                      <Text style={{ fontSize: 11, color: textSub, fontWeight: 'normal' }}>Months</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Monthly Breakdown List */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: textMain, letterSpacing: -0.2 }}>
                  Monthly Evaluations
                </Text>
              </View>

              {(() => {
                const filteredEvaluations = (myKPIData?.evaluations || []).filter(
                  (ev) => !selectedMonth || ev.month === selectedMonth
                );

                if (filteredEvaluations.length === 0) {
                  return (
                    <View
                      style={{
                        padding: 32,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: isDark ? '#374151' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? 'transparent' : '#FFFFFF',
                      }}
                    >
                      <MaterialIcons name="fact-check" size={38} color={textSub} style={{ marginBottom: 10 }} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>
                        No evaluation for {MONTHS.find((m) => m.val === selectedMonth)?.label || `Month ${selectedMonth}`}
                      </Text>
                      <Text style={{ fontSize: 11, color: textSub, marginTop: 3 }}>
                        No supervisor evaluation recorded for this month yet.
                      </Text>
                    </View>
                  );
                }

                return filteredEvaluations.map((ev) => (
                  <View
                    key={ev.id}
                    style={{
                      backgroundColor: cardBg,
                      borderRadius: 22,
                      padding: 18,
                      elevation: 2,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      borderWidth: 1,
                      borderColor: borderCol,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: textMain }}>
                          Month {ev.month} / {ev.year}
                        </Text>
                        <Text style={{ fontSize: 11, color: textSub, marginTop: 2 }}>
                          Evaluator: {ev.evaluator?.first_name ? `${ev.evaluator.first_name} ${ev.evaluator.last_name || ''}` : 'Department Manager'}
                        </Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 20,
                          backgroundColor:
                            ev.overall_grade === 'GOOD'
                              ? '#ECFDF5'
                              : ev.overall_grade === 'AVERAGE'
                              ? '#FEF3C7'
                              : '#FEF2F2',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color:
                              ev.overall_grade === 'GOOD'
                                ? '#059669'
                                : ev.overall_grade === 'AVERAGE'
                                ? '#D97706'
                                : '#DC2626',
                          }}
                        >
                          {ev.overall_grade === 'GOOD' ? 'GOOD (⭐⭐⭐)' : ev.overall_grade === 'AVERAGE' ? 'AVERAGE (⭐⭐)' : 'NEEDS IMP (⭐)'}
                        </Text>
                      </View>
                    </View>

                    {/* 3 Metric Pills */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <View
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 14,
                          alignItems: 'center',
                          backgroundColor: isDark ? '#111827' : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: isDark ? '#374151' : '#F1F5F9',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '600', color: textSub }}>Discipline</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: textMain, marginTop: 3 }}>
                          {ev.discipline_rating === 'good' ? 'Good' : ev.discipline_rating === 'average' ? 'Avg' : 'Needs Imp'}
                        </Text>
                      </View>

                      <View
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 14,
                          alignItems: 'center',
                          backgroundColor: isDark ? '#111827' : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: isDark ? '#374151' : '#F1F5F9',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '600', color: textSub }}>Output</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: textMain, marginTop: 3 }}>
                          {ev.output_rating === 'good' ? 'Good' : ev.output_rating === 'average' ? 'Avg' : 'Needs Imp'}
                        </Text>
                      </View>

                      <View
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 14,
                          alignItems: 'center',
                          backgroundColor: isDark ? '#111827' : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: isDark ? '#374151' : '#F1F5F9',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '600', color: textSub }}>Attitude</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: textMain, marginTop: 3 }}>
                          {ev.attitude_rating === 'good' ? 'Good' : ev.attitude_rating === 'average' ? 'Avg' : 'Needs Imp'}
                        </Text>
                      </View>
                    </View>

                    {/* Comment */}
                    {ev.manager_comment ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                          padding: 12,
                          borderRadius: 14,
                          backgroundColor: isDark ? '#0F172A' : '#EFF6FF',
                          borderWidth: 1,
                          borderColor: isDark ? '#1E293B' : '#DBEAFE',
                        }}
                      >
                        <Feather name="message-circle" size={14} color="#2563EB" style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 12, flex: 1, fontStyle: 'italic', color: textMain }}>
                          "{ev.manager_comment}"
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ));
              })()}
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 2: TEAM REVIEW (MANAGER 2-MINUTE EVALUATION FLOW)     */}
          {/* ======================================================== */}
          {activeTab === 'team_review' && (
            <View style={{ gap: 16 }}>
              {/* Subordinate Selector with Filter Segment */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: textMain, letterSpacing: -0.2 }}>
                    Team Members ({filteredTeam.length})
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: textSub }}>
                    {evaluatedCount}/{teamKPIData?.team?.length || 0} Evaluated
                  </Text>
                </View>

                {/* Filter Segments: All | Pending | Evaluated */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? '#111827' : '#F1F5F9',
                    borderRadius: 14,
                    padding: 4,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#E2E8F0',
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleFilterChange('all')}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: teamFilter === 'all' ? (isDark ? '#1F2937' : '#FFFFFF') : 'transparent',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: teamFilter === 'all' ? 0.08 : 0,
                      shadowRadius: 2,
                      elevation: teamFilter === 'all' ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: teamFilter === 'all' ? primaryColor : textSub,
                      }}
                    >
                      All ({teamKPIData?.team?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleFilterChange('pending')}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: teamFilter === 'pending' ? (isDark ? '#1F2937' : '#FFFFFF') : 'transparent',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: teamFilter === 'pending' ? 0.08 : 0,
                      shadowRadius: 2,
                      elevation: teamFilter === 'pending' ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: teamFilter === 'pending' ? '#F59E0B' : textSub,
                      }}
                    >
                      ⏳ Pending ({pendingCount})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleFilterChange('evaluated')}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: teamFilter === 'evaluated' ? (isDark ? '#1F2937' : '#FFFFFF') : 'transparent',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: teamFilter === 'evaluated' ? 0.08 : 0,
                      shadowRadius: 2,
                      elevation: teamFilter === 'evaluated' ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: teamFilter === 'evaluated' ? '#10B981' : textSub,
                      }}
                    >
                      ✓ Evaluated ({evaluatedCount})
                    </Text>
                  </TouchableOpacity>
                </View>

                {!teamKPIData?.team || teamKPIData.team.length === 0 ? (
                  <View
                    style={{
                      padding: 28,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: isDark ? '#374151' : '#CBD5E1',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="users" size={32} color={textSub} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>
                      No team members found
                    </Text>
                    <Text style={{ fontSize: 11, color: textSub, marginTop: 2 }}>
                      No staff assigned under your department.
                    </Text>
                  </View>
                ) : filteredTeam.length === 0 ? (
                  <View
                    style={{
                      padding: 24,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: isDark ? '#374151' : '#CBD5E1',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather
                      name={teamFilter === 'pending' ? 'check-circle' : 'users'}
                      size={28}
                      color={teamFilter === 'pending' ? '#10B981' : textSub}
                      style={{ marginBottom: 6 }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: textMain }}>
                      {teamFilter === 'pending'
                        ? 'All Caught Up! 🎉'
                        : teamFilter === 'evaluated'
                        ? 'No Evaluated Members Yet'
                        : 'No team members found'}
                    </Text>
                    <Text style={{ fontSize: 11, color: textSub, marginTop: 2, textAlign: 'center' }}>
                      {teamFilter === 'pending'
                        ? 'All team members have been evaluated for this month.'
                        : teamFilter === 'evaluated'
                        ? 'No evaluations have been submitted yet for this month.'
                        : 'No matching team members.'}
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {filteredTeam.map((item) => {
                      const isSelected = selectedMember?.employee?.id === item.employee.id;
                      return (
                        <TouchableOpacity
                          key={item.employee.id}
                          activeOpacity={0.75}
                          onPress={() => handleSelectMember(item)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 10,
                            paddingHorizontal: 14,
                            borderRadius: 18,
                            backgroundColor: cardBg,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? primaryColor : borderCol,
                            gap: 10,
                            minWidth: 150,
                            elevation: isSelected ? 3 : 1,
                            shadowColor: isSelected ? primaryColor : '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isSelected ? 0.2 : 0.03,
                            shadowRadius: 4,
                          }}
                        >
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: `${primaryColor}20`,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: primaryColor, fontWeight: 'bold', fontSize: 13 }}>
                              {item.employee.first_name?.[0] || 'E'}
                            </Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: textMain }}>
                              {item.employee.first_name} {item.employee.last_name}
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '600',
                                color: item.isEvaluated ? '#10B981' : '#F59E0B',
                                marginTop: 1,
                              }}
                            >
                              {item.isEvaluated ? '✓ Evaluated' : '• Pending'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Evaluation Form Card */}
              {selectedMember && (
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 24,
                    padding: 20,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    borderWidth: 1,
                    borderColor: borderCol,
                  }}
                >
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: textMain, letterSpacing: -0.3 }}>
                      {selectedMember.employee.first_name} {selectedMember.employee.last_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: textSub, marginTop: 2 }}>
                      {selectedMember.employee.positions?.name || 'Staff'} • Month {selectedMonth}/{selectedYear}
                    </Text>
                  </View>

                  {/* 1. Discipline */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textMain, marginBottom: 8 }}>
                      1. Discipline (វិន័យការងារ)
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { id: 'good', label: 'Good (ល្អ ⭐⭐⭐)' },
                        { id: 'average', label: 'Avg (មធ្យម ⭐⭐)' },
                        { id: 'needs_improvement', label: 'Needs Imp. (⭐)' },
                      ].map((t) => {
                        const isSel = discipline === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            activeOpacity={0.75}
                            onPress={() => setRatingWithAnim(setDiscipline, t.id)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSel
                                ? t.id === 'good'
                                  ? '#10B981'
                                  : t.id === 'average'
                                  ? '#F59E0B'
                                  : '#EF4444'
                                : isDark
                                ? '#111827'
                                : '#F1F5F9',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isSel ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#475569'),
                              }}
                            >
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 2. Work Output */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textMain, marginBottom: 8 }}>
                      2. Work Output (លទ្ធផលការងារ)
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { id: 'good', label: 'Good (ល្អ ⭐⭐⭐)' },
                        { id: 'average', label: 'Avg (មធ្យម ⭐⭐)' },
                        { id: 'needs_improvement', label: 'Needs Imp. (⭐)' },
                      ].map((t) => {
                        const isSel = output === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            activeOpacity={0.75}
                            onPress={() => setRatingWithAnim(setOutput, t.id)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSel
                                ? t.id === 'good'
                                  ? '#10B981'
                                  : t.id === 'average'
                                  ? '#F59E0B'
                                  : '#EF4444'
                                : isDark
                                ? '#111827'
                                : '#F1F5F9',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isSel ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#475569'),
                              }}
                            >
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 3. Attitude */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textMain, marginBottom: 8 }}>
                      3. Attitude (អាកប្បកិរិយា)
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { id: 'good', label: 'Good (ល្អ ⭐⭐⭐)' },
                        { id: 'average', label: 'Avg (មធ្យម ⭐⭐)' },
                        { id: 'needs_improvement', label: 'Needs Imp. (⭐)' },
                      ].map((t) => {
                        const isSel = attitude === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            activeOpacity={0.75}
                            onPress={() => setRatingWithAnim(setAttitude, t.id)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSel
                                ? t.id === 'good'
                                  ? '#10B981'
                                  : t.id === 'average'
                                  ? '#F59E0B'
                                  : '#EF4444'
                                : isDark
                                ? '#111827'
                                : '#F1F5F9',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isSel ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#475569'),
                              }}
                            >
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Comment Input */}
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textMain, marginBottom: 6 }}>
                      Manager Feedback Note
                    </Text>
                    <TextInput
                      placeholder="Type short feedback or recommendation..."
                      placeholderTextColor={textSub}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      numberOfLines={3}
                      style={{
                        backgroundColor: isDark ? '#111827' : '#F8FAFC',
                        color: textMain,
                        borderWidth: 1,
                        borderColor: isDark ? '#374151' : '#CBD5E1',
                        borderRadius: 14,
                        padding: 12,
                        fontSize: 13,
                        textAlignVertical: 'top',
                        minHeight: 70,
                      }}
                    />
                  </View>

                  {/* Calculated Grade & Action */}
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: borderCol,
                      paddingTop: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 11, color: textSub, fontWeight: '600' }}>Calculated Grade:</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: primaryColor, marginTop: 2 }}>
                        {previewGrade} ({previewScore}/3.0)
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleSubmitEvaluation}
                      disabled={submitting}
                      style={{
                        backgroundColor: primaryColor,
                        paddingHorizontal: 22,
                        paddingVertical: 12,
                        borderRadius: 14,
                        elevation: 3,
                        shadowColor: primaryColor,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                          Submit Review
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
