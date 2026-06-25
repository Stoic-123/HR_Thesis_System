import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiRequest, authService } from './api';

export const getMobilePayrollOverview = async () => {
  const res = await apiRequest('/api/payroll/mobile/overview');
  return res;
};

export const getMobilePayrollHistory = async (year) => {
  const query = year ? `?year=${year}` : '';
  const res = await apiRequest(`/api/payroll/mobile/history${query}`);
  return res;
};

export const getPayslipDownloadUrl = (payrollId) => {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8080';
  return `${base}/api/payroll/${payrollId}/payslip?download=true`;
};

export const downloadPayslip = async (payrollId, month, year) => {
  const { token } = await authService.getAuthState();
  const url = getPayslipDownloadUrl(payrollId);
  const fileUri = FileSystem.documentDirectory + `Payslip_${month}_${year}.pdf`;

  const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (downloadRes.status !== 200) {
    throw new Error('Failed to download payslip');
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(downloadRes.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save or Share Payslip',
      UTI: 'com.adobe.pdf'
    });
  }
  
  return downloadRes.uri;
};
