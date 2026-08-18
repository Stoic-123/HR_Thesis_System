import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { payrollOverview as mockOverview, payrollHistory as mockHistory, availableYears as mockYears } from '../mockData/payrollData';
import { getMobilePayrollOverview, getMobilePayrollHistory } from '../services/payroll.services';
import SalaryBarChart from '../components/SalaryBarChart';
import PayrollHistoryCard from '../components/PayrollHistoryCard';
import useAuthStore from '../stores/useAuthStore';

const TABS = ['Overview', 'History'];

function BreakdownRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
  bgColor,
  expandable,
  expanded,
  onToggle,
  children,
  isDark,
}) {
  const textMain = isDark ? COLORS.dark.text : '#1F2937';

  return (
    <View style={{ marginBottom: 8 }}>
      <Pressable
        onPress={expandable ? onToggle : undefined}
        style={[styles.breakdownRow, { backgroundColor: bgColor }]}
      >
        {icon && (
          <View style={[styles.breakdownIcon, { backgroundColor: iconBg }]}>
            <Text style={{ color: iconColor, fontSize: 14, fontWeight: '700' }}>{icon}</Text>
          </View>
        )}
        <Text style={[styles.breakdownLabel, { color: textMain }, label === 'Gross Salary' && { color: '#2563EB', fontWeight: '700' }]}>
          {label}
        </Text>
        <Text style={[styles.breakdownValue, { color: valueColor || textMain }, label === 'Gross Salary' && { color: '#2563EB', fontWeight: '700' }]}>
          {value}
        </Text>
        {expandable && (
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
        )}
      </Pressable>
      {expanded && children}
    </View>
  );
}

function OverviewTab({ isDark, overview, primaryColor }) {
  const [allowancesExpanded, setAllowancesExpanded] = useState(false);
  const [deductionsExpanded, setDeductionsExpanded] = useState(false);

  const cardBg = isDark ? COLORS.dark.card : '#FFFFFF';
  const borderColor = isDark ? COLORS.dark.border : '#E5E7EB';
  const textMain = isDark ? COLORS.dark.text : '#1F2937';
  const textSub = isDark ? COLORS.dark.textSecondary : '#6B7280';
  const breakdown = overview?.breakdown;

  if (!overview) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 }}>
        <MaterialIcons name="error-outline" size={48} color={textSub} />
        <Text style={{ color: textSub, marginTop: 16, fontSize: 16 }}>No payroll data found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Net Salary Card */}
      <View style={[styles.netSalaryCard, { backgroundColor: primaryColor }]}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTopLabel}>
            Net Salary - {overview.currentMonth}
          </Text>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="briefcase" size={14} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.netSalaryAmount}>${overview.netSalary}</Text>
        <Text style={styles.cardSubtext}>Your latest salary this month</Text>
        <View style={styles.trendRow}>
          <View style={styles.trendBadge}>
            <MaterialIcons name="trending-up" size={12} color="#FFFFFF" />
            <Text style={styles.trendPercent}>{overview.trendPercent}%</Text>
          </View>
          <Text style={styles.trendLabel}>from last month</Text>
        </View>
      </View>

      {/* Next Payroll Card */}
      <View style={[styles.nextPayrollCard, { backgroundColor: COLORS.blue }]}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTopLabel}>Next Payroll</Text>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="briefcase" size={14} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.nextPayrollDays}>{overview.nextPayrollDays} days</Text>
        <Text style={styles.cardSubtext}>Keep doing a good job</Text>
      </View>

      {/* Salary Chart Card */}
      <View style={[styles.whiteCard, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textMain }]}>Salary</Text>
        <Text style={[styles.sectionSubtitle, { color: textSub }]}>
          Your salary over the 6 months in this year
        </Text>
        <SalaryBarChart data={overview.salaryChart} isDark={isDark} />
      </View>

      {/* Salary Breakdown Card */}
      <View style={[styles.whiteCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.breakdownHeader}>
          <Text style={[styles.sectionTitle, { color: textMain }]}>Salary Breakdown</Text>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>{overview.currentMonth}</Text>
          </View>
        </View>

        <BreakdownRow
          icon="$"
          iconBg="#DBEAFE"
          iconColor="#2563EB"
          label="Basic Salary"
          value={`$${breakdown?.basicSalary ?? 0}`}
          bgColor={isDark ? COLORS.dark.cardLight : '#F9FAFB'}
          isDark={isDark}
        />

        <BreakdownRow
          icon="+"
          iconBg="#FEF3C7"
          iconColor={primaryColor}
          label="Allowances"
          value={`+$${breakdown?.allowances?.total ?? 0}`}
          valueColor={primaryColor}
          bgColor={isDark ? 'rgba(34,197,94,0.1)' : '#ECFDF5'}
          expandable
          expanded={allowancesExpanded}
          onToggle={() => setAllowancesExpanded((v) => !v)}
          isDark={isDark}
        >
          {allowancesExpanded && (
            <View style={[styles.subItems, { backgroundColor: isDark ? COLORS.dark.cardLight : '#F0FDF4' }]}>
              {breakdown?.allowances?.items?.map((item) => (
                <View key={item.label} style={styles.subItemRow}>
                  <Text style={[styles.subItemLabel, { color: textSub }]}>{item.label}</Text>
                  <Text style={[styles.subItemValue, { color: primaryColor }]}>+${item.amount}</Text>
                </View>
              ))}
            </View>
          )}
        </BreakdownRow>

        <BreakdownRow
          label="Gross Salary"
          value={`$${breakdown?.grossSalary ?? 0}`}
          bgColor={isDark ? 'rgba(37,99,235,0.1)' : '#EFF6FF'}
          isDark={isDark}
        />

        <BreakdownRow
          icon="−"
          iconBg="#FEE2E2"
          iconColor="#EF4444"
          label="Deductions"
          value={`-$${breakdown?.deductions?.total ?? 0}`}
          valueColor="#EF4444"
          bgColor={isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2'}
          expandable
          expanded={deductionsExpanded}
          onToggle={() => setDeductionsExpanded((v) => !v)}
          isDark={isDark}
        >
          {deductionsExpanded && (
            <View style={[styles.subItems, { backgroundColor: isDark ? COLORS.dark.cardLight : '#FFF1F2' }]}>
              {breakdown?.deductions?.items?.map((item) => (
                <View key={item.label} style={styles.subItemRow}>
                  <Text style={[styles.subItemLabel, { color: textSub }]}>{item.label}</Text>
                  <Text style={[styles.subItemValue, { color: '#EF4444' }]}>-${item.amount}</Text>
                </View>
              ))}
            </View>
          )}
        </BreakdownRow>

        {/* Take Home Pay */}
        <View style={[styles.takeHomeCard, { backgroundColor: primaryColor }]}>
          <View>
            <Text style={styles.takeHomeLabel}>Take Home Pay</Text>
            <Text style={styles.takeHomeAmount}>${breakdown?.takeHomePay ?? 0}</Text>
          </View>
          <View style={styles.takeHomeIcon}>
            <FontAwesome5 name="dollar-sign" size={28} color="rgba(255,255,255,0.5)" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function HistoryTab({ isDark, selectedYear, onYearChange, history, years }) {
  const cardBg = isDark ? COLORS.dark.card : '#F3F4F6';
  const borderColor = isDark ? COLORS.dark.border : '#E5E7EB';
  const textMain = isDark ? COLORS.dark.text : '#1F2937';

  const yearIndex = years.indexOf(selectedYear);
  const canGoPrev = yearIndex > 0;
  const canGoNext = yearIndex < years.length - 1;

  const filteredHistory = history.filter((item) => item.year === selectedYear);

  return (
    <View style={styles.historyContainer}>
      {/* Year Selector */}
      <View style={[styles.yearSelector, { backgroundColor: cardBg, borderColor }]}>
        <Pressable
          onPress={() => onYearChange(selectedYear - 1)}
          style={[styles.yearArrow, !years.includes(selectedYear - 1) && { opacity: 0.3 }]}
          disabled={!years.includes(selectedYear - 1)}
        >
          <MaterialIcons name="chevron-left" size={22} color={textMain} />
        </Pressable>
        <Text style={styles.yearText}>{selectedYear}</Text>
        <Pressable
          onPress={() => onYearChange(selectedYear + 1)}
          style={[styles.yearArrow, !years.includes(selectedYear + 1) && { opacity: 0.3 }]}
          disabled={!years.includes(selectedYear + 1)}
        >
          <MaterialIcons name="chevron-right" size={22} color={textMain} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.historyScroll}
      >
        {filteredHistory.map((item) => (
          <PayrollHistoryCard key={item.id} item={item} isDark={isDark} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function PayrollScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [years, setYears] = useState([new Date().getFullYear()]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, historyRes] = await Promise.all([
          getMobilePayrollOverview(),
          getMobilePayrollHistory(new Date().getFullYear()),
        ]);
        if (overviewRes?.result && overviewRes.data) {
          setOverview(overviewRes.data);
        }
        if (historyRes?.result && historyRes.data) {
          setHistory(historyRes.data.history || []);
          setYears(historyRes.data.availableYears || [new Date().getFullYear()]);
        }
      } catch (error) {
        console.log("Payroll fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    getMobilePayrollHistory(selectedYear)
      .then((res) => {
        if (res?.result && res.data?.history) {
          setHistory(res.data.history);
          if (res.data.availableYears) setYears(res.data.availableYears);
        }
      })
      .catch(() => {});
  }, [selectedYear]);

  return (
    <View
      style={[styles.screen, { backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <Pressable onPress={() => navigateTo('Home')} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Payroll</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(55,65,81,0.4)' : 'rgba(226,232,240,0.5)' }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: primaryColor },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab ? styles.tabTextActive : { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : activeTab === 'Overview' ? (
        <OverviewTab isDark={isDark} overview={overview} primaryColor={primaryColor} />
      ) : (
        <HistoryTab
          isDark={isDark}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          history={history}
          years={years}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.orange,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    margin: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.orange,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  netSalaryCard: {
    backgroundColor: COLORS.orange,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  nextPayrollCard: {
    backgroundColor: COLORS.blue,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTopLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  netSalaryAmount: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 4,
  },
  nextPayrollDays: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtext: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendPercent: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  trendLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  whiteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  breakdownIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  subItems: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: -4,
    marginBottom: 4,
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  subItemLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  subItemValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  takeHomeCard: {
    backgroundColor: COLORS.orange,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  takeHomeLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  takeHomeAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  takeHomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContainer: {
    flex: 1,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  yearArrow: {
    padding: 4,
  },
  yearText: {
    color: '#3B82F6', // we could leave this blue or use primaryColor, leaving blue is fine for contrast, wait, I will let it be blue
    fontSize: 15,
    fontWeight: '700',
  },
  historyScroll: {
    paddingBottom: 100,
  },
});
