import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { kpiService } from '../services/api';
import CircularGauge from '../components/CircularGauge';
import useAuthStore from '../stores/useAuthStore';

export default function KpiDashboardScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCycle, setActiveCycle] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [teamData, setTeamData] = useState(null);

  const fetchKpiData = async () => {
    try {
      const cyclesRes = await kpiService.getCycles();
      const cycles = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes.data || []);
      const active = cycles.find(c => c.status === 'active');
      
      if (!active) {
        setLoading(false);
        return;
      }
      setActiveCycle(active);

      const dashRes = await kpiService.getMyDashboard(active.id);
      setKpiData(dashRes);

      if (dashRes && dashRes.is_manager) {
        const teamRes = await kpiService.getTeamDashboard(active.id);
        setTeamData(teamRes);
      }
    } catch (error) {
      console.error("Error fetching KPI:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKpiData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchKpiData();
  };

  const isManager = kpiData && kpiData.is_manager;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: primaryColor }} />
      
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16,
        backgroundColor: primaryColor,
        borderBottomWidth: 1, borderBottomColor: primaryColor
      }}>
        <Pressable onPress={() => navigateTo('Home')} style={{ padding: 4 }}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>
          {isManager ? 'Team KPIs' : 'Performance KPI'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {loading ? (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={{ marginTop: 15, color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading KPI data...</Text>
          </View>
        ) : !activeCycle ? (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <MaterialCommunityIcons name="calendar-remove" size={60} color={isDark ? '#374151' : '#D1D5DB'} />
            <Text style={{ marginTop: 15, fontSize: 18, fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }}>No Active Cycle</Text>
            <Text style={{ marginTop: 5, textAlign: 'center', color: isDark ? '#9CA3AF' : '#6B7280' }}>
              There is no active performance cycle at the moment.
            </Text>
          </View>
        ) : isManager && teamData ? (
          <View>
            <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 20 }}>
              Department: {teamData.department}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827', marginBottom: 15 }}>
              Team Members ({teamData.members?.length || 0})
            </Text>

            {teamData.members?.map((member, idx) => {
               const kpiList = member.employeekpi || [];
               const currentKpi = kpiList[0];
               const status = currentKpi?.evaluation_status || 'pending_manager';
               const statusText = status === 'completed' ? 'Completed' : (status === 'pending_hr' ? 'Pending HR' : 'Pending Manager');
               const statusColor = status === 'completed' ? '#10B981' : (status === 'pending_hr' ? primaryColor : COLORS.blue);

               return (
                <Pressable key={member.id || idx} onPress={() => navigateTo('EmployeeKpiEvaluation', { employee: member, cycleId: activeCycle.id })} style={{
                  backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isDark ? COLORS.dark.border : '#F3F4F6',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#FFF' : '#111827' }}>
                      {member.first_name} {member.last_name}
                    </Text>
                    <View style={{ backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor }}>
                        {statusText}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    Tap to evaluate goals
                  </Text>
                </Pressable>
               );
            })}
          </View>
        ) : !isManager && (!kpiData || !kpiData.kpi) ? (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <MaterialCommunityIcons name="target-account" size={60} color={isDark ? '#374151' : '#D1D5DB'} />
            <Text style={{ marginTop: 15, fontSize: 18, fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }}>No KPIs Assigned</Text>
            <Text style={{ marginTop: 5, textAlign: 'center', color: isDark ? '#9CA3AF' : '#6B7280' }}>
              You don't have any KPI goals assigned for {activeCycle.name}.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 20 }}>
              Cycle: {activeCycle.name}
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              <CircularGauge 
                value={kpiData.kpi.total_score || 0}
                max={100}
                label="Final Score"
                sublabel="%"
                color={kpiData.kpi.evaluation_status === 'completed' ? '#10B981' : primaryColor}
                theme={theme}
                size={160}
                strokeWidth={16}
              />
              <Text style={{ marginTop: 10, fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                Status: {kpiData.kpi.evaluation_status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827', marginBottom: 15 }}>
              Your Goals
            </Text>

            {kpiData.kpi.kpigoal?.map((goal, idx) => {
               return (
                <View key={goal.id || idx} style={{
                  backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isDark ? COLORS.dark.border : '#F3F4F6',
                }}>
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#FFF' : '#111827' }}>{goal.title}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 4 }}>
                      Category: {goal.category} • Target: {goal.target_value}{goal.target_unit === '%' ? '%' : ''} • Weight: {goal.weight}%
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                    <View style={{ alignItems: 'center' }}>
                       <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Manager Score</Text>
                       <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.blue, marginTop: 4 }}>{goal.manager_score || 0}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                       <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>HR Score</Text>
                       <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#10B981', marginTop: 4 }}>{goal.hr_score || 0}</Text>
                    </View>
                  </View>
                </View>
               );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
