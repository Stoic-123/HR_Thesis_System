import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function CircularGauge({
  value,
  max,
  label,
  sublabel,
  color = '#F09A37',
  size = 130,
  strokeWidth = 13,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', margin: 8 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {/* Subtle background glow for the gauge */}
        <View style={{ 
          position: 'absolute', 
          width: size - 10, 
          height: size - 10, 
          borderRadius: size / 2, 
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' 
        }} />
        
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? '#2D2D2D' : '#E5E7EB'}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        
        {/* Inner Label Container */}
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text 
              style={{ fontSize: 30, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827', letterSpacing: -0.5 }}
            >
              {value}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '400', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginLeft: 2 }}>
              /{max}
            </Text>
          </View>
          <Text 
            style={{ fontSize: 9, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', marginTop: -2 }}
          >
            {sublabel}
          </Text>
        </View>
      </View>
      
      {label && (
        <Text 
          style={{ 
            marginTop: 10, 
            fontSize: 11, 
            fontWeight: '700', 
            color: isDark ? '#E5E7EB' : '#374151',
            opacity: 0.9
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
