import useAuthStore from '../stores/useAuthStore';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, Alert, Dimensions, Animated,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Polygon, Line, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, ClipPath } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/theme';
import { scannerService } from '../services/api';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────────────
const POLL_MS         = 500;
const LERP_ALPHA      = 0.20;
const CONF_EMA_ALPHA  = 0.40;
const DETECTED_THRESH = 0.35;
const STABLE_FRAMES   = 3;
const AUTO_DELAY_MS   = 800;
const MIN_RAW_CONF    = 0.25;
const BL              = 40;

// ── Pure helpers ──────────────────────────────────────────────────────────────
const lerp   = (a, b, t) => a + (b - a) * t;
const lerpPt = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
function norm2D(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}
function polyStr(pts) {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
function makeGuide(w, h) {
  const px = w * 0.08, py = h * 0.28;
  return [
    { x: px,     y: py },
    { x: w - px, y: py },
    { x: w - px, y: h - py },
    { x: px,     y: h - py },
  ];
}
function serverToView(pts, vw, vh) {
  return pts.map(p => ({ x: p.x * vw, y: p.y * vh }));
}

// ── ScanOverlay — premium laser-sweep + vignette + glowing brackets ───────────
const ScanOverlay = React.memo(({ corners, detected, scanY, vw, vh }) => {
  const neonColor = '#00FF88';
  const idleColor = 'rgba(255,255,255,0.70)';
  const stroke    = detected ? neonColor : idleColor;
  const bracketW  = 4;
  const clipId    = 'docClip';
  const gradId    = 'laserGrad';

  const scanX1 = scanY !== null
    ? lerp(corners[0].x, corners[3].x,
        (scanY - corners[0].y) / ((corners[3].y - corners[0].y) || 1))
    : 0;
  const scanX2 = scanY !== null
    ? lerp(corners[1].x, corners[2].x,
        (scanY - corners[1].y) / ((corners[2].y - corners[1].y) || 1))
    : 0;

  const xs = corners.map(c => c.x);
  const qx = Math.min(...xs);
  const qw = Math.max(...xs) - qx;

  return (
    <Svg width={vw} height={vh} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"    stopColor="transparent" stopOpacity="0" />
          <Stop offset="0.15" stopColor={neonColor}   stopOpacity="0.1" />
          <Stop offset="0.40" stopColor={neonColor}   stopOpacity="0.9" />
          <Stop offset="0.60" stopColor="#FFFFFF"     stopOpacity="1" />
          <Stop offset="0.85" stopColor={neonColor}   stopOpacity="0.9" />
          <Stop offset="1"    stopColor="transparent" stopOpacity="0" />
        </SvgLinearGradient>
        <ClipPath id={clipId}>
          <Polygon points={polyStr(corners)} />
        </ClipPath>
      </Defs>

      {/* Dark vignette over the full frame */}
      <Rect x={0} y={0} width={vw} height={vh} fill="rgba(0,0,0,0.45)" />
      {/* Clear the quad area */}
      <Polygon points={polyStr(corners)} fill="rgba(0,0,0,0)" />

      {/* Quad inner fill */}
      <Polygon
        points={polyStr(corners)}
        fill={detected ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.03)'}
        stroke="none"
      />

      {/* Quad border */}
      <Polygon
        points={polyStr(corners)}
        fill="none"
        stroke={stroke}
        strokeWidth={detected ? 1.5 : 1}
        strokeDasharray={detected ? '' : '9,6'}
        opacity={detected ? 1 : 0.55}
      />

      {/* L-bracket corners */}
      {corners.map((pt, i) => {
        const next   = corners[(i + 1) % 4];
        const prev   = corners[(i + 3) % 4];
        const toNext = norm2D({ x: next.x - pt.x, y: next.y - pt.y });
        const toPrev = norm2D({ x: prev.x - pt.x, y: prev.y - pt.y });
        return (
          <React.Fragment key={i}>
            {detected && (
              <>
                <Line x1={pt.x} y1={pt.y}
                  x2={pt.x + toNext.x * BL} y2={pt.y + toNext.y * BL}
                  stroke={neonColor} strokeWidth={bracketW + 6} strokeLinecap="round" opacity={0.22} />
                <Line x1={pt.x} y1={pt.y}
                  x2={pt.x + toPrev.x * BL} y2={pt.y + toPrev.y * BL}
                  stroke={neonColor} strokeWidth={bracketW + 6} strokeLinecap="round" opacity={0.22} />
              </>
            )}
            <Line x1={pt.x} y1={pt.y}
              x2={pt.x + toNext.x * BL} y2={pt.y + toNext.y * BL}
              stroke={stroke} strokeWidth={bracketW} strokeLinecap="round" />
            <Line x1={pt.x} y1={pt.y}
              x2={pt.x + toPrev.x * BL} y2={pt.y + toPrev.y * BL}
              stroke={stroke} strokeWidth={bracketW} strokeLinecap="round" />
          </React.Fragment>
        );
      })}

      {/* Laser sweep */}
      {detected && scanY !== null && (
        <>
          <Line x1={scanX1} y1={scanY + 5} x2={scanX2} y2={scanY + 5}
            stroke={neonColor} strokeWidth={10} opacity={0.08}
            clipPath={`url(#${clipId})`} />
          <Line x1={qx} y1={scanY} x2={qx + qw} y2={scanY}
            stroke={`url(#${gradId})`} strokeWidth={3}
            clipPath={`url(#${clipId})`} />
        </>
      )}
    </Svg>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
export default function DocumentScannerScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const [perm, requestPerm] = useCameraPermissions();

  const [mode,         setMode]         = useState('idle');
  const [cameraFacing, setCameraFacing] = useState('back');
  const [sourceImage,  setSourceImage]  = useState(null);  const [scannedImage, setScannedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg,     setErrorMsg]     = useState(null);

  const [viewSize, setViewSize] = useState({ w: SW, h: SH });
  const [dispCorners,  setDispCorners]  = useState(() => makeGuide(SW, SH));
  const [dispDetected, setDispDetected] = useState(false);
  const [dispScanY,    setDispScanY]    = useState(null);
  const [statusMsg,    setStatusMsg]    = useState('Point camera at a document');

  const cameraRef       = useRef(null);
  const smoothCorners   = useRef(makeGuide(SW, SH));
  const targetCorners   = useRef(makeGuide(SW, SH));
  const smoothConf      = useRef(0);
  const stableCount     = useRef(0);
  const isPolling       = useRef(false);
  const isCameraMode    = useRef(false);
  const autoCaptureRef  = useRef(null);
  const pollRef         = useRef(null);
  const smoothLoopRef   = useRef(null);
  const scanPhaseRef    = useRef(0);
  const scanDirRef      = useRef(1);
  const viewSizeRef     = useRef({ w: SW, h: SH });
  const hapticFiredRef  = useRef(false);
  // Keep a ref in sync with cameraFacing so pollFrame always reads the latest value
  const cameraFacingRef = useRef('back');
  useEffect(() => { cameraFacingRef.current = cameraFacing; }, [cameraFacing]);

  const pulseAnim      = useRef(new Animated.Value(1)).current;
  const pulseLoop      = useRef(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const resultScale    = useRef(new Animated.Value(0.82)).current;
  const resultOpacity  = useRef(new Animated.Value(0)).current;
  const checkScale     = useRef(new Animated.Value(0)).current;
  const checkOpacity   = useRef(new Animated.Value(0)).current;
  const screenFade     = useRef(new Animated.Value(0)).current;

  const onCameraLayout = useCallback((e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    viewSizeRef.current = { w, h };
    setViewSize({ w, h });
    const guide = makeGuide(w, h);
    smoothCorners.current = guide;
    targetCorners.current = guide;
    setDispCorners(guide);
  }, []);

  useEffect(() => {
    if (mode === 'camera') {
      overlayOpacity.setValue(0);
      Animated.timing(overlayOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'camera') {
      screenFade.setValue(0);
      Animated.timing(screenFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    }
  }, [mode]);

  const startSmoothLoop = useCallback(() => {
    if (smoothLoopRef.current) return;
    smoothLoopRef.current = setInterval(() => {
      const det = smoothConf.current >= DETECTED_THRESH;

      smoothCorners.current = smoothCorners.current.map((c, i) =>
        lerpPt(c, targetCorners.current[i], LERP_ALPHA)
      );

      let sy = null;
      if (det) {
        scanPhaseRef.current += scanDirRef.current * 0.013;
        if (scanPhaseRef.current >= 1) { scanPhaseRef.current = 1; scanDirRef.current = -1; }
        if (scanPhaseRef.current <= 0) { scanPhaseRef.current = 0; scanDirRef.current =  1; }
        const c       = smoothCorners.current;
        const topY    = lerp(c[0].y, c[1].y, 0.5);
        const bottomY = lerp(c[3].y, c[2].y, 0.5);
        sy = lerp(topY, bottomY, scanPhaseRef.current);
      }

      setDispScanY(sy);
      setDispCorners([...smoothCorners.current]);
      setDispDetected(det);
    }, 16);
  }, []);

  const stopSmoothLoop = useCallback(() => {
    clearInterval(smoothLoopRef.current);
    smoothLoopRef.current = null;
  }, []);

  useEffect(() => {
    if (dispDetected) {
      pulseLoop.current = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]));
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
      hapticFiredRef.current = false;
    }
  }, [dispDetected]);

  const pollFrame = useCallback(async () => {
    if (!cameraRef.current || isPolling.current || !isCameraMode.current) return;
    isPolling.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.20, skipProcessing: true });
      const res = await scannerService.detectDocument(photo.uri);
      const { w, h } = viewSizeRef.current;

      if (res.detected && res.confidence >= MIN_RAW_CONF) {
        // Front camera mirrors the image — flip X coordinates so the overlay
        // aligns with what the user actually sees on screen
        const rawPoints = serverToView(res.points, w, h);
        const points = cameraFacingRef.current === 'front'
          ? rawPoints.map(p => ({ x: w - p.x, y: p.y }))
          : rawPoints;
        targetCorners.current = points;
        smoothConf.current =
          smoothConf.current * (1 - CONF_EMA_ALPHA) + res.confidence * CONF_EMA_ALPHA;
        stableCount.current += 1;
        const pct = Math.round(smoothConf.current * 100);

        if (stableCount.current >= STABLE_FRAMES) {
          setStatusMsg(`Locked (${pct}%) — capturing…`);
          if (!hapticFiredRef.current) {
            hapticFiredRef.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          if (!autoCaptureRef.current)
            autoCaptureRef.current = setTimeout(captureAndProcess, AUTO_DELAY_MS);
        } else {
          setStatusMsg(`Detecting… ${pct}%`);
        }
      } else {
        smoothConf.current *= 0.55;
        stableCount.current = 0;
        targetCorners.current = makeGuide(w, h);
        if (smoothConf.current < DETECTED_THRESH) {
          setStatusMsg('Point camera at a document');
          clearTimeout(autoCaptureRef.current);
          autoCaptureRef.current = null;
        }
      }
    } catch { /* silent */ } finally {
      isPolling.current = false;
    }
  }, []);

  useEffect(() => {
    if (mode === 'camera') {
      isCameraMode.current = true;
      smoothConf.current   = 0;
      stableCount.current  = 0;
      hapticFiredRef.current = false;
      setStatusMsg('Point camera at a document');
      setDispDetected(false);
      startSmoothLoop();
      setTimeout(() => {
        if (isCameraMode.current)
          pollRef.current = setInterval(pollFrame, POLL_MS);
      }, 700);
    } else {
      isCameraMode.current = false;
      clearInterval(pollRef.current);
      clearTimeout(autoCaptureRef.current);
      autoCaptureRef.current = null;
      stopSmoothLoop();
      setDispDetected(false);
      setDispScanY(null);
    }
    return () => {
      isCameraMode.current = false;
      clearInterval(pollRef.current);
      clearTimeout(autoCaptureRef.current);
      stopSmoothLoop();
    };
  }, [mode]);

  const captureAndProcess = useCallback(async () => {
    if (!cameraRef.current) return;
    isCameraMode.current = false;
    clearInterval(pollRef.current);
    clearTimeout(autoCaptureRef.current);
    autoCaptureRef.current = null;
    stopSmoothLoop();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      resultScale.setValue(0.82);
      resultOpacity.setValue(0);
      checkScale.setValue(0);
      checkOpacity.setValue(0);
      setMode('result');
      setSourceImage(photo.uri);
      setIsProcessing(true);
      setErrorMsg(null);
      try {
        const result = await scannerService.scanDocument(photo.uri);
        setScannedImage(result);
        Animated.parallel([
          Animated.spring(resultScale,   { toValue: 1, tension: 65, friction: 8,  useNativeDriver: true }),
          Animated.timing(resultOpacity, { toValue: 1, duration: 280,              useNativeDriver: true }),
        ]).start(() => {
          Animated.sequence([
            Animated.parallel([
              Animated.spring(checkScale,   { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
              Animated.timing(checkOpacity, { toValue: 1, duration: 180,             useNativeDriver: true }),
            ]),
            Animated.delay(900),
            Animated.timing(checkOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start();
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (err) {
        setErrorMsg(err.message || 'Failed to process document');
      } finally {
        setIsProcessing(false);
      }
    } catch {
      Alert.alert('Error', 'Failed to capture photo.');
      setMode('camera');
    }
  }, []);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Gallery access needed.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled && res.assets?.length) {
      // Convert to a real JPEG file:// URI — handles iOS ph:// URIs and HEIC format
      const raw = res.assets[0].uri;
      let uri = raw;
      try {
        const converted = await ImageManipulator.manipulateAsync(
          raw,
          [],
          { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
        );
        uri = converted.uri;
      } catch (_) { /* use original if conversion fails */ }
      resultScale.setValue(0.82);
      resultOpacity.setValue(0);
      checkScale.setValue(0);
      checkOpacity.setValue(0);
      setMode('result');
      setSourceImage(uri);
      setIsProcessing(true);
      setErrorMsg(null);
      try {
        const result = await scannerService.scanDocument(uri);
        setScannedImage(result);
        Animated.parallel([
          Animated.spring(resultScale,   { toValue: 1, tension: 65, friction: 8,  useNativeDriver: true }),
          Animated.timing(resultOpacity, { toValue: 1, duration: 280,              useNativeDriver: true }),
        ]).start(() => {
          Animated.sequence([
            Animated.parallel([
              Animated.spring(checkScale,   { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
              Animated.timing(checkOpacity, { toValue: 1, duration: 180,             useNativeDriver: true }),
            ]),
            Animated.delay(900),
            Animated.timing(checkOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start();
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (err) {
        setErrorMsg(err.message || 'Failed to process document');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const openCamera = async () => {
    if (!perm?.granted) {
      const { granted } = await requestPerm();
      if (!granted) { Alert.alert('Permission required', 'Camera access needed.'); return; }
    }
    setMode('camera');
  };

  const resetState = () => {
    setSourceImage(null); setScannedImage(null); setErrorMsg(null); setMode('idle');
  };

  const cardBg   = isDark ? COLORS.dark.card : '#FFFFFF';
  const textMain = isDark ? COLORS.dark.text  : '#1F2937';
  const textSub  = isDark ? '#9CA3AF'         : '#6B7280';
  const bgColor  = isDark ? COLORS.dark.bg    : '#F5F5F7';
  const divider  = isDark ? '#374151'         : '#E5E7EB';

  // ════════════════════════════════════════════════════════════════════════
  // CAMERA MODE
  // ════════════════════════════════════════════════════════════════════════
  if (mode === 'camera') {
    return (
      <View
        style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' }}
        onLayout={onCameraLayout}
      >
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} zoom={0} />

        <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]} pointerEvents="none">
          <ScanOverlay
            corners={dispCorners}
            detected={dispDetected}
            scanY={dispScanY}
            vw={viewSize.w}
            vh={viewSize.h}
          />
        </Animated.View>

        {/* Top bar */}
        <Animated.View style={[cam.topBar, { opacity: overlayOpacity }]}>
          <TouchableOpacity onPress={() => setMode('idle')} style={cam.iconBtn}>
            <MaterialIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={cam.topTitle}>Document Scanner</Text>
          <View style={{ width: 44 }} />
        </Animated.View>

        {/* Hint text when idle */}
        {!dispDetected && (
          <Animated.Text style={[cam.hintText, { opacity: overlayOpacity }]}>
            Align document within the frame
          </Animated.Text>
        )}

        {/* Status pill */}
        <Animated.View style={[
          cam.pill,
          {
            backgroundColor: dispDetected ? 'rgba(0,255,136,0.12)' : 'rgba(0,0,0,0.58)',
            borderColor:      dispDetected ? '#00FF88' : 'rgba(255,255,255,0.22)',
            transform: [{ scale: pulseAnim }],
          },
        ]}>
          <Animated.View style={[
            cam.dot,
            { backgroundColor: dispDetected ? '#00FF88' : '#9CA3AF' },
          ]} />
          <Text style={[cam.pillTxt, { color: dispDetected ? '#00FF88' : '#E5E7EB' }]}>
            {statusMsg}
          </Text>
        </Animated.View>

        {/* Bottom controls */}
        <Animated.View style={[cam.bottomBar, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            onPress={() => {
              setCameraFacing(f => f === 'back' ? 'front' : 'back');
              // Reset detection so stale corners don't linger after flip
              smoothConf.current  = 0;
              stableCount.current = 0;
              hapticFiredRef.current = false;
              const { w, h } = viewSizeRef.current;
              const guide = makeGuide(w, h);
              smoothCorners.current = guide;
              targetCorners.current = guide;
              setDispCorners(guide);
              setDispDetected(false);
              setDispScanY(null);
              setStatusMsg('Point camera at a document');
              clearTimeout(autoCaptureRef.current);
              autoCaptureRef.current = null;
            }}
            style={cam.iconBtn}
          >
            <MaterialIcons name="flip-camera-ios" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={captureAndProcess}
            style={[cam.shutterRing, dispDetected && cam.shutterRingDetected]}
            activeOpacity={0.75}
          >
            <View style={[cam.shutterInner, dispDetected && cam.shutterInnerDetected]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickFromGallery} style={cam.iconBtn}>
            <MaterialIcons name="photo-library" size={26} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // RESULT
  // ════════════════════════════════════════════════════════════════════════
  if (mode === 'result') {
    return (
      <Animated.View style={[s.container, { backgroundColor: bgColor, opacity: screenFade }]}>
        <View style={[s.header, { backgroundColor: primaryColor }]}>
          <TouchableOpacity onPress={resetState} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Scan Result</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Text style={[s.sectionLabel, { color: textSub }]}>Original</Text>
          <View style={[s.imgCard, { backgroundColor: cardBg, borderColor: divider }]}>
            <Image source={{ uri: sourceImage }} style={s.imgPreview} resizeMode="contain" />
          </View>

          <Text style={[s.sectionLabel, { color: textSub }]}>Scanned &amp; Enhanced</Text>
          <View style={[s.imgCard, { backgroundColor: cardBg, borderColor: divider }]}>
            {isProcessing ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={[s.centerTxt, { color: textSub }]}>Cropping &amp; enhancing…</Text>
              </View>
            ) : errorMsg ? (
              <View style={s.centerBox}>
                <MaterialIcons name="error-outline" size={40} color="#EF4444" />
                <Text style={[s.centerTxt, { color: '#EF4444' }]}>{errorMsg}</Text>
              </View>
            ) : (
              <View style={{ position: 'relative' }}>
                <Animated.View style={{ transform: [{ scale: resultScale }], opacity: resultOpacity }}>
                  <Image source={{ uri: scannedImage }} style={s.imgPreview} resizeMode="contain" />
                </Animated.View>
                <Animated.View
                  style={[s.checkOverlay, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}
                  pointerEvents="none"
                >
                  <View style={s.checkCircle}>
                    <MaterialIcons name="check" size={42} color="#fff" />
                  </View>
                </Animated.View>
              </View>
            )}
          </View>

          {!isProcessing && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: cardBg, borderColor: divider }]}
                onPress={() => { resetState(); openCamera(); }}
              >
                <MaterialIcons name="camera-alt" size={20} color={textMain} />
                <Text style={[s.actionBtnTxt, { color: textMain }]}>Scan Again</Text>
              </TouchableOpacity>
              {!errorMsg && (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: primaryColor, borderColor: primaryColor }]}
                  onPress={async () => {
                    try {
                      await scannerService.saveToGallery(scannedImage);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                      Alert.alert('Success', 'Document saved successfully.');
                    } catch (err) {
                      Alert.alert('Error', err.message || 'Could not save image.');
                    }
                  }}
                >
                  <MaterialIcons name="save-alt" size={20} color="#fff" />
                  <Text style={[s.actionBtnTxt, { color: '#fff' }]}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // IDLE
  // ════════════════════════════════════════════════════════════════════════
  return (
    <Animated.View style={[s.container, { backgroundColor: bgColor, opacity: screenFade }]}>
      <View style={[s.header, { backgroundColor: primaryColor }]}>
        <TouchableOpacity onPress={() => navigateTo('Home')} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Document Scanner</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.idleContent}>
        <View style={[s.heroBox, { backgroundColor: cardBg, borderColor: divider, shadowColor: isDark ? '#000' : '#00000018' }]}>
          <View style={[s.iconRing, { borderColor: primaryColor + '33' }]}>
            <FontAwesome5 name="file-alt" size={52} color={primaryColor} />
          </View>
          <Text style={[s.heroTitle, { color: textMain }]}>Scan a Document</Text>
          <Text style={[s.heroSub, { color: textSub }]}>
            AI-powered detection crops and enhances your document in real time.
          </Text>
          <View style={s.chipRow}>
            {['Auto-detect', 'Perspective fix', 'Enhancement'].map((label) => (
              <View key={label} style={[s.chip, { backgroundColor: primaryColor + '18', borderColor: primaryColor + '40' }]}>
                <Text style={[s.chipTxt, { color: primaryColor }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[s.srcBtn, { backgroundColor: primaryColor }]} onPress={openCamera} activeOpacity={0.82}>
          <MaterialIcons name="camera-alt" size={22} color="#fff" />
          <Text style={s.srcBtnTxt}>Open Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.srcBtn, s.srcBtnOutline, { backgroundColor: cardBg, borderColor: divider }]}
          onPress={pickFromGallery}
          activeOpacity={0.82}
        >
          <MaterialIcons name="photo-library" size={22} color={primaryColor} />
          <Text style={[s.srcBtnTxt, { color: textMain }]}>Upload from Gallery</Text>
        </TouchableOpacity>

        <Text style={[s.hint, { color: textSub }]}>
          Supports ID cards, passports, contracts, and other flat documents
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

// ── Camera overlay styles ─────────────────────────────────────────────────────
const cam = StyleSheet.create({
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  topTitle:  { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  iconBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hintText: {
    position: 'absolute', bottom: 220, alignSelf: 'center',
    color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: '500', letterSpacing: 0.4,
  },
  pill: {
    position: 'absolute', bottom: 152, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1,
  },
  dot:     { width: 9, height: 9, borderRadius: 4.5 },
  pillTxt: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  bottomBar: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around', paddingHorizontal: 36,
  },
  shutterRing: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3.5, borderColor: '#fff',
  },
  shutterRingDetected: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0,255,136,0.12)',
  },
  shutterInner:         { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  shutterInnerDetected: { backgroundColor: '#00FF88' },
});

// ── Main styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1, color: '#fff', fontSize: 18, fontWeight: '700',
    textAlign: 'center', marginRight: 28,
  },
  idleContent: { padding: 24, gap: 16 },
  heroBox: {
    borderRadius: 24, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 14, marginBottom: 8,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
  },
  iconRing: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroTitle:  { fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
  heroSub:    { fontSize: 13.5, textAlign: 'center', lineHeight: 21, maxWidth: 270 },
  chipRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  chip:       { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  chipTxt:    { fontSize: 11.5, fontWeight: '700' },
  srcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17, borderRadius: 18,
  },
  srcBtnOutline: { borderWidth: 1 },
  srcBtnTxt:     { fontSize: 15, fontWeight: '700', color: '#fff' },
  hint:          { fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1,
  },
  imgCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  imgPreview: { width: '100%', height: 280 },
  centerBox:  { height: 200, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  centerTxt:  { fontSize: 14, textAlign: 'center' },
  actionRow:  { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1,
  },
  actionBtnTxt: { fontSize: 14, fontWeight: '700' },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,200,100,0.88)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00FF88', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 8,
  },
});
