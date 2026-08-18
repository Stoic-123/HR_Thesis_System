import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../constants/theme';

const CHART_HEIGHT = 140;
const MAX_VALUE = 680;

export default function SalaryBarChart({ data, isDark }) {
  const [chartWidth, setChartWidth] = useState(0);
  const textSub = isDark ? COLORS.dark.textSecondary : '#6B7280';
  const gridColor = isDark ? '#374151' : '#BFDBFE';
  const yLabels = ['$680', '$340', '$0'];

  return (
    <View style={styles.container}>
      <View
        style={styles.chartArea}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 44)}
      >
        {chartWidth > 0 && (
          <Svg
            style={[StyleSheet.absoluteFill, { right: 44 }]}
            width={chartWidth}
            height={CHART_HEIGHT + 24}
            pointerEvents="none"
          >
            {[0, 0.5, 1].map((ratio, i) => (
              <Line
                key={i}
                x1="0"
                y1={CHART_HEIGHT * ratio + 8}
                x2={chartWidth}
                y2={CHART_HEIGHT * ratio + 8}
                stroke={gridColor}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
          </Svg>
        )}

        <View style={styles.barsRow}>
          {data.map((item) => {
            const barHeight = (item.value / MAX_VALUE) * CHART_HEIGHT;
            return (
              <View key={item.month} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: Math.max(barHeight, 8) }]} />
                </View>
                <Text style={[styles.monthLabel, { color: textSub }]}>{item.month}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {yLabels.map((label) => (
            <Text key={label} style={[styles.yLabel, { color: textSub }]}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    paddingTop: 8,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: CHART_HEIGHT + 24,
    paddingRight: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    width: '70%',
    maxWidth: 44,
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.orange,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 8,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  yAxis: {
    width: 44,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 24,
  },
  yLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
