import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function MapViewWrapper({
  location,
  primaryColor,
  isDark,
  style,
  showsUserLocation = false,
  followsUserLocation = false,
  markerSize = 100,
}) {
  return (
    <View
      style={[
        style,
        {
          backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#E5E7EB',
          borderRadius: 16,
        },
      ]}
    >
      <MaterialIcons name="map" size={48} color={primaryColor} />
      <Text
        style={{
          color: isDark ? '#E5E7EB' : '#1F2937',
          marginTop: 12,
          fontWeight: 'bold',
          fontSize: 14,
        }}
      >
        Map View (Web Preview)
      </Text>
      {location ? (
        <Text
          style={{
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontSize: 12,
            marginTop: 4,
          }}
        >
          Lat: {location.latitude.toFixed(6)}, Lon: {location.longitude.toFixed(6)}
        </Text>
      ) : (
        <Text
          style={{
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontSize: 12,
            marginTop: 4,
          }}
        >
          No location coordinates provided.
        </Text>
      )}
    </View>
  );
}
