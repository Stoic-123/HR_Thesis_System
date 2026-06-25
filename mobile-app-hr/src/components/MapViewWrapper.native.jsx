import React from 'react';
import { View, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapViewWrapper({
  location,
  primaryColor,
  isDark,
  style,
  showsUserLocation = false,
  followsUserLocation = false,
  markerSize = 100,
}) {
  if (!location) return null;

  // Configuration based on size
  const isSmall = markerSize === 80;
  const outerSize = isSmall ? 80 : 100;
  const borderWidth = isSmall ? 8 : 6;
  const imageSize = isSmall ? 60 : 80;
  
  const pinLeftRight = isSmall ? 12 : 10;
  const pinTop = isSmall ? 20 : 16;
  const pinMarginTop = isSmall ? -6 : -4;

  return (
    <MapView
      style={style}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
      showsUserLocation={showsUserLocation}
      followsUserLocation={followsUserLocation}
    >
      <Marker coordinate={location}>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              borderWidth: borderWidth,
              borderColor: primaryColor,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={require('../../assets/login.png')}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: imageSize / 2,
              }}
            />
          </View>
          {/* Pin point */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: pinLeftRight,
              borderLeftColor: 'transparent',
              borderRightWidth: pinLeftRight,
              borderRightColor: 'transparent',
              borderTopWidth: pinTop,
              borderTopColor: primaryColor,
              marginTop: pinMarginTop,
            }}
          />
        </View>
      </Marker>
    </MapView>
  );
}
