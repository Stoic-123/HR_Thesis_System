import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

function DetailRow({ label, value, isTotal, isDark, isNegative }) {
  const textMain = isDark ? COLORS.dark.text : '#1F2937';
  const divider = isDark ? '#374151' : '#E5E7EB';

  return (
    <View style={[styles.detailRow, { borderBottomColor: divider }]}>
      <Text style={[styles.detailLabel, { color: textMain }, isTotal && styles.bold]}>
        {label}
      </Text>
      <Text
        style={[
          styles.detailValue,
          { color: textMain },
          isTotal && styles.bold,
          isNegative && { color: '#EF4444' },
        ]}
      >
        {isNegative ? `- ${formatCurrency(value)}` : formatCurrency(value)}
      </Text>
    </View>
  );
}

import { downloadPayslip } from '../services/payroll.services';

export default function PayrollHistoryCard({ item, isDark }) {
  const cardBg = isDark ? COLORS.dark.card : '#FFFFFF';
  const borderColor = isDark ? COLORS.dark.border : '#E5E7EB';
  const textMain = isDark ? COLORS.dark.text : '#1F2937';

  const handleDownload = async () => {
    if (item.payslipUrl || item.status === 'paid' || item.status === 'approved') {
      try {
        await downloadPayslip(item.id, item.month, item.year);
      } catch (error) {
        Alert.alert('Error', 'Could not download the payslip. Please try again later.');
      }
      return;
    }
    Alert.alert('Download Payslip', `Payslip for ${item.month} ${item.year} will be available when payroll is finalized.`);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'paid':
        return { bg: '#22C55E', text: 'Paid', icon: 'check' };
      case 'approved':
        return { bg: '#3B82F6', text: 'Approved', icon: 'verified' };
      case 'generated':
      default:
        return { bg: '#F59E0B', text: 'Pending', icon: 'pending-actions' };
    }
  };

  const statusConfig = getStatusConfig(item.status);

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: item.employee.avatar }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={[styles.employeeName, { color: textMain }]}>
            {item.employee.full_name}
          </Text>
          <Text style={styles.period}>
            {item.month} {item.year}
          </Text>
        </View>
        <View style={[styles.paidBadge, { backgroundColor: statusConfig.bg }]}>
          <MaterialIcons name={statusConfig.icon} size={12} color="#FFFFFF" />
          <Text style={styles.paidText}>{statusConfig.text}</Text>
        </View>
      </View>

      {/* Details */}
      <DetailRow label="Base Salary" value={item.baseSalary} isDark={isDark} />
      <DetailRow label="Allowance" value={item.allowance} isDark={isDark} />
      <DetailRow label="Deduction" value={item.deduction} isDark={isDark} />
      <DetailRow label="13th Salary" value={item.thirteenthSalary} isDark={isDark} />
      <DetailRow label="Tax" value={item.tax} isDark={isDark} isNegative />
      <DetailRow label="Overtime" value={item.overtime} isDark={isDark} />
      <DetailRow label="Total" value={item.total} isDark={isDark} isTotal />

      {/* Download button */}
      <Pressable
        onPress={handleDownload}
        style={({ pressed }) => [
          styles.downloadBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.downloadBtnText}>Download Payslip PDF</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  period: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blue,
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  paidText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  bold: {
    fontWeight: '700',
  },
  downloadBtn: {
    marginTop: 14,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
