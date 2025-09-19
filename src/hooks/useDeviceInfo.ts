import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

interface DeviceInfo {
  isIPhone11: boolean;
  isIPhone: boolean;
  screenWidth: number;
  screenHeight: number;
  isSmallScreen: boolean;
}

export const useDeviceInfo = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    const { width, height } = Dimensions.get('window');
    
    // iPhone 11 tem dimensões específicas: 414x896
    const isIPhone11 = Platform.OS === 'ios' && width === 414 && height === 896;
    const isIPhone = Platform.OS === 'ios';
    const isSmallScreen = height < 800; // Para telas menores que 800px de altura
    
    return {
      isIPhone11,
      isIPhone,
      screenWidth: width,
      screenHeight: height,
      isSmallScreen,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window;
      
      const isIPhone11 = Platform.OS === 'ios' && width === 414 && height === 896;
      const isIPhone = Platform.OS === 'ios';
      const isSmallScreen = height < 800;
      
      setDeviceInfo({
        isIPhone11,
        isIPhone,
        screenWidth: width,
        screenHeight: height,
        isSmallScreen,
      });
    });

    return () => subscription?.remove();
  }, []);

  return deviceInfo;
};
