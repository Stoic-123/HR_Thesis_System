export const mockEmployee = {
  id: 1,
  first_name: "leng",
  last_name: "kimlong",
  full_name: "leng kimlong",
  email: "leng.kimlong@example.com",
  phone: "+855 12 345 678",
  position: "Senior UI/UX Designer",
  department: "Design Department",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", // High quality avatar
  
  // Dashboard Metrics
  hoursToday: 6,
  hoursTarget: 8,
  leaveBalance: 15,
  leaveUsed: 2,
  totalLeave: 25,
};

export const mockLeaveRequests = [
  {
    id: 101,
    employee_name: "leng kimlong",
    status: "pending", // pending, approved, rejected
    startDate: "19-09-2025",
    endDate: "26-09-2025",
    duration: "2 days",
    leaveType: "Sick Leave",
    reason: "Hell bong I will have a trip with my wife 2days",
  },
  {
    id: 102,
    employee_name: "leng kimlong",
    status: "approved",
    startDate: "19-09-2025",
    endDate: "26-09-2025",
    duration: "2 days",
    leaveType: "Sick Leave",
    reason: "Hell bong I will have a trip with my wife 2days",
  },
  {
    id: 103,
    employee_name: "leng kimlong",
    status: "rejected",
    startDate: "19-09-2025",
    endDate: "26-09-2025",
    duration: "2 days",
    leaveType: "Sick Leave",
    reason: "Hell bong I will have a trip with my wife 2days",
  }
];

export const mockNotifications = {
  today: [
    {
      id: 1,
      type: "alert",
      message: "You haven't logged in yet today. Please log in as soon as possible or inform us if you're on leave or facing any issues.",
      highlight: "Touch Chansothea",
      time: "11:30 AM",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
    },
    {
      id: 2,
      type: "hr",
      message: "Remember to take short breaks during work — it helps boost productivity and focus.",
      time: "07:40 AM"
    }
  ],
  yesterday: [
    {
      id: 3,
      type: "hr",
      message: "Reminder: Your shift starts in 30 minutes.",
      time: "02:30 PM"
    },
    {
      id: 4,
      type: "leave",
      message: "Your Sick leave request for April 15 has been approved.",
      highlight: "Sick Leave",
      time: "09:13 AM",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
    },
    {
      id: 5,
      type: "hr",
      message: "New company policy update – please review it under \"Documents.\"",
      time: "08:50 AM"
    }
  ]
};

export const mockQuickAccess = [
  { id: "online-attendance", label: "Online Attendance", image: require('../../assets/online.png'), color: "blue" },
  { id: "leave", label: "Leave", image: require('../../assets/leave.png'), color: "orange" },
  { id: "overtime", label: "Overtime", image: require('../../assets/overtime.png'), color: "orange" },
  { id: "performance", label: "Employee Performance", image: require('../../assets/performance.png'), color: "blue" },
  { id: "calendar", label: "Holiday Calendar", image: require('../../assets/calendar.png'), color: "blue" },
  { id: "document-scanner", label: "Document Scanner", image: require('../../assets/scanner.png'), color: "orange" },
  { id: "asset", label: "Asset Management", image: require('../../assets/scanner.png'), color: "blue" },
];
