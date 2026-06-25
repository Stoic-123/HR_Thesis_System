import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { kpiService } from '../services/api';
import useAuthStore from '../stores/useAuthStore';

export default function EmployeeKpiEvaluationScreen({ theme, route, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const { employee, cycleId } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (employee && employee.employeekpi && employee.employeekpi.length > 0) {
      const kpi = employee.employeekpi[0]; // Active cycle KPI
      const kpiGoals = kpi.kpigoal || [];
      setGoals(kpiGoals);

      // Initialize scores state with existing manager scores if any
      const initScores = {};
      kpiGoals.forEach(g => {
        initScores[g.id] = (g.manager_score || 0).toString();
      });
      setScores(initScores);
    }
  }, [employee]);

  const handleScoreChange = (goalId, value) => {
    // Only allow numbers
    if (/^\d*\.?\d*$/.test(value)) {
      setScores(prev => ({ ...prev, [goalId]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!employee || !employee.employeekpi || employee.employeekpi.length === 0) return;
    const employee_kpi_id = employee.employeekpi[0].id;

    const formattedScores = goals.map(g => ({
      goal_id: g.id,
      score: parseFloat(scores[g.id]) || 0
    }));

    setLoading(true);
    try {
      await kpiService.submitManagerScore({
        employee_kpi_id,
        scores: formattedScores
      });
      Alert.alert('Success', 'Evaluation submitted successfully');
      navigateTo('KpiDashboard'); // Go back
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit evaluation');
    } finally {
      setLoading(false);
    }
  };

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
        <Pressable onPress={() => navigateTo('KpiDashboard')} style={{ padding: 4 }}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>Evaluate KPI</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        {employee && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? '#FFF' : '#111827' }}>
              {employee.first_name} {employee.last_name}
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 4 }}>
              Input manager scores for the current performance cycle.
            </Text>
          </View>
        )}

        {goals.length === 0 ? (
          <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>No KPI goals assigned to this employee.</Text>
        ) : (
          goals.map(goal => (
            <View key={goal.id} style={{
              backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: isDark ? COLORS.dark.border : '#E5E7EB'
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#FFF' : '#111827', marginBottom: 8 }}>
                {goal.title}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>Category: {goal.category}</Text>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.blue }}>Weight: {goal.weight}%</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151' }}>
                  Target: {goal.target_value} {goal.target_unit === '%' ? '%' : ''}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', marginRight: 8 }}>Score:</Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#D1D5DB',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      width: 80,
                      color: isDark ? '#FFF' : '#000',
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      textAlign: 'center'
                    }}
                    keyboardType="numeric"
                    value={scores[goal.id]}
                    onChangeText={(val) => handleScoreChange(goal.id, val)}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                  />
                </View>
              </View>
            </View>
          ))
        )}

        {goals.length > 0 && (
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: primaryColor,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: 10,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Submit Evaluation</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
