import React from 'react';
import { Pressable, Text, View, Image } from 'react-native';

export default function QuickAccessCard({ item, onPress, theme = 'dark', primaryColor, secondaryColor }) {
  const isDark = theme === 'dark';
  
  // Figma colors: 
  // Blue items: Online Attendance, Employee Performance, Payroll
  // Orange items: Leave, Overtime, Leave Calendar
  const isOrange = item.color === 'orange';
  
  // Custom styling for cards:
  // Use company primary and secondary colors dynamically. Fallback to default colors if not provided.
  const cardBgColor = isOrange 
    ? (primaryColor || '#F09A37') // Primary color (Orange fallback)
    : (secondaryColor || '#1A5F7A'); // Secondary color (Blue fallback)
    
  return (
    <Pressable 
      onPress={onPress}
      style={{
        backgroundColor: cardBgColor,
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
      }}
    >
      <View style={{ 
        marginBottom: 8, 
        alignItems: 'center', 
        justifyContent: 'center',
      }}>
        <Image 
          source={item.image}
          style={{ width: 105, height: 105 }}
          resizeMode="contain"
        />
      </View>
      
      <Text style={{ 
        color: 'white', 
        fontSize: 11, 
        fontWeight: '700', 
        textAlign: 'center', 
        marginTop: 2, 
        paddingHorizontal: 2,
        letterSpacing: 0.2
      }}>
        {item.label}
      </Text>
    </Pressable>
  );
}
