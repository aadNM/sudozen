/** /src/componenets/AnimatedOverlay.tsx */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../context/ThemeContext';

interface AnimatedOverlayProps {
  visible: boolean;
  source: any; //('path/to/animation.json')
  onFinish?: () => void;
  fullscreen?: boolean;
  children?: React.ReactNode;
}

const AnimatedOverlay: React.FC<AnimatedOverlayProps> = ({
  visible,
  source,
  onFinish,
  fullscreen = true,
  children,
}) => {
  const animationRef = useRef<LottieView>(null);
  const {theme} = useTheme();

  useEffect(() => {
    if (visible) {
      animationRef.current?.play();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[
      styles.overlay, 
      fullscreen && styles.fullscreen,
      { backgroundColor: theme.colors.background + 'CC' }
      ]}>
      <LottieView
        ref={animationRef}
        source={source}
        loop={true}
        autoPlay={false}
        onAnimationFinish={onFinish}
        style={fullscreen ? styles.fullscreen : styles.centered}
      />
      {children && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fullscreen: {
    width: '100%',
    height: '100%',
  },
  centered: {
    width: 250,
    height: 250,
  },
  childrenContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
  },
});

export default AnimatedOverlay;
