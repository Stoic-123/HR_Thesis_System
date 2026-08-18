import React from 'react';
import { View, Text, Image } from 'react-native';
import { COLORS } from '../constants/theme';

export default function NotificationCard({ item, theme = 'dark' }) {
  const isDark = theme === 'dark';
  
  // Custom parsing for highlights (e.g., Touch Chansothea, Sick Leave)
  const renderMessageContent = () => {
    if (!item.highlight) {
      return (
        <Text 
          className="text-xs leading-4"
          style={{ color: isDark ? COLORS.dark.text : COLORS.light.text }}
        >
          {item.message}
        </Text>
      );
    }
    
    const parts = item.message.split(item.highlight);
    return (
      <Text 
        className="text-xs leading-4"
        style={{ color: isDark ? COLORS.dark.text : COLORS.light.text }}
      >
        {parts[0]}
        <Text style={{ color: COLORS.orange }} className="font-bold">
          {item.highlight}
        </Text>
        {parts[1]}
      </Text>
    );
  };

  return (
    <View 
      className="flex-row items-start p-4 border-b"
      style={{
        borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
      }}
    >
      {/* Left Icon or Avatar */}
      {item.avatar ? (
        <Image 
          source={{ uri: item.avatar }} 
          className="w-10 h-10 rounded-full mr-3 mt-0.5"
        />
      ) : (
        <View className="w-10 h-10 rounded-full bg-[#155A75]/25 items-center justify-center mr-3 mt-0.5 border border-[#155A75]/50">
          <Text className="text-[#155A75] font-bold text-xs">HR</Text>
        </View>
      )}
      
      {/* Message Content & Time */}
      <View className="flex-1">
        <View className="pr-6">
          {renderMessageContent()}
        </View>
        <Text 
          className="text-[9px] mt-2 text-right self-end"
          style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}
        >
          {item.time}
        </Text>
      </View>
    </View>
  );
}
