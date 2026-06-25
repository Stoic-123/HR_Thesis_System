import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function LeaveRequestCard({ item, theme = 'dark', onCancel, onViewDetails, primaryColor = COLORS.orange }) {
  const isDark = theme === 'dark';
  
  // Status config
  const statusConfig = {
    pending: {
      label: 'Pending',
      color: '#F09A37',
      bgColor: isDark ? '#3A250B' : '#FEF3C7',
      icon: 'schedule',
    },
    approved: {
      label: 'Approved',
      color: '#10B981',
      bgColor: isDark ? '#064E3B' : '#D1FAE5',
      icon: 'check-circle',
    },
    rejected: {
      label: 'Rejected',
      color: '#EF4444',
      bgColor: isDark ? '#4C0519' : '#FEE2E2',
      icon: 'cancel',
    },
  };

  const status = statusConfig[item.status] || statusConfig.pending;

  return (
    <View 
      style={[
        styles.card,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
        }
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.employeeInfo}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' }}
            style={styles.employeeAvatar}
          />
          <Text 
            style={[
              styles.employeeName,
              { color: isDark ? COLORS.dark.text : COLORS.light.text }
            ]}
          >
            {item.employee_name}
          </Text>
        </View>
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <MaterialIcons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>
      
      {/* Grid Fields */}
      <View style={styles.fieldsContainer}>
        <View style={[styles.fieldRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.fieldLabel, { color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }]}>Start Date</Text>
          <Text style={[styles.fieldValue, { color: isDark ? COLORS.dark.text : COLORS.light.text }]}>{item.startDate}</Text>
        </View>
        
        <View style={[styles.fieldRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.fieldLabel, { color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }]}>End Date</Text>
          <Text style={[styles.fieldValue, { color: isDark ? COLORS.dark.text : COLORS.light.text }]}>{item.endDate}</Text>
        </View>
        
        <View style={[styles.fieldRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.fieldLabel, { color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }]}>Duration</Text>
          <Text style={[styles.fieldValue, { color: isDark ? COLORS.dark.text : COLORS.light.text }]}>{item.duration}</Text>
        </View>
        
        <View style={[styles.fieldRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.fieldLabel, { color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }]}>Leave Type</Text>
          <Text style={[styles.fieldValue, { color: isDark ? COLORS.dark.text : COLORS.light.text }]}>{item.leaveType}</Text>
        </View>
        
        <View style={styles.reasonContainer}>
          <Text style={[styles.fieldLabel, { color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }]}>Reason</Text>
          <Text 
            style={[styles.reasonText, { color: isDark ? COLORS.dark.text : COLORS.light.text }]}
          >
            {item.reason}
          </Text>
        </View>
      </View>
      
      {/* Action Buttons */}
      {item.status === 'pending' && onCancel ? (
        <>
          <Pressable 
            onPress={onCancel}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>
              Cancel Leave Request
            </Text>
          </Pressable>
          {onViewDetails && (
            <Pressable 
              onPress={onViewDetails}
              style={[styles.actionButton, styles.viewButton, { marginTop: 8, borderColor: primaryColor }]}
            >
              <Text style={[styles.viewButtonText, { color: primaryColor }]}>
                View Leave Details
              </Text>
            </Pressable>
          )}
        </>
      ) : (
        <Pressable 
          onPress={onViewDetails}
          style={[styles.actionButton, styles.viewButton, { borderColor: primaryColor }]}
        >
          <Text style={[styles.viewButtonText, { color: primaryColor }]}>
            View Leave Details
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  employeeName: {
    fontWeight: '700',
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  fieldsContainer: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 12,
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonContainer: {
    paddingVertical: 8,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewButton: {
    borderWidth: 1,
    borderColor: COLORS.orange,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orange,
  },
});
