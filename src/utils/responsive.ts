import React from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Breakpoints para diferentes tamanhos de tela
const breakpoints = {
  phone: 480,
  tablet: 768,
  desktop: 1024,
};

// Detectar tipo de dispositivo
export const getDeviceType = () => {
  const width = screenWidth;
  const height = screenHeight;
  
  // Para tablets, consideramos que a largura é maior que 600px
  // ou que a altura é maior que 800px com proporção adequada
  if (width >= breakpoints.tablet || (height >= 800 && width >= 600)) {
    return 'tablet';
  }
  
  return 'phone';
};

// Verificar se é tablet
export const isTablet = () => getDeviceType() === 'tablet';

// Verificar se é phone
export const isPhone = () => getDeviceType() === 'phone';

// Dimensões da tela
export const screenDimensions = {
  width: screenWidth,
  height: screenHeight,
};

// Função para escalar tamanhos baseado no dispositivo
export const scale = (size: number) => {
  const deviceType = getDeviceType();
  const scaleFactor = deviceType === 'tablet' ? 1.2 : 1;
  return PixelRatio.roundToNearestPixel(size * scaleFactor);
};

// Função para escalar fontes
export const scaleFont = (size: number) => {
  const deviceType = getDeviceType();
  const scaleFactor = deviceType === 'tablet' ? 1.1 : 1;
  return PixelRatio.roundToNearestPixel(size * scaleFactor);
};

// Padding adaptativo baseado no dispositivo
export const getAdaptivePadding = () => {
  const deviceType = getDeviceType();
  
  return {
    screen: deviceType === 'tablet' ? 32 : 20,
    card: deviceType === 'tablet' ? 32 : 24,
    button: deviceType === 'tablet' ? 20 : 16,
    input: deviceType === 'tablet' ? 20 : 16,
  };
};

// Margens adaptativas
export const getAdaptiveMargins = () => {
  const deviceType = getDeviceType();
  
  return {
    xs: deviceType === 'tablet' ? 6 : 4,
    sm: deviceType === 'tablet' ? 12 : 8,
    md: deviceType === 'tablet' ? 20 : 16,
    lg: deviceType === 'tablet' ? 28 : 24,
    xl: deviceType === 'tablet' ? 36 : 32,
    xxl: deviceType === 'tablet' ? 56 : 48,
  };
};

// Border radius adaptativo
export const getAdaptiveBorderRadius = () => {
  const deviceType = getDeviceType();
  
  return {
    xs: deviceType === 'tablet' ? 6 : 4,
    sm: deviceType === 'tablet' ? 10 : 8,
    md: deviceType === 'tablet' ? 14 : 12,
    lg: deviceType === 'tablet' ? 18 : 16,
    xl: deviceType === 'tablet' ? 28 : 24,
    round: deviceType === 'tablet' ? 60 : 50,
  };
};

// Layout adaptativo para cards
export const getAdaptiveLayout = () => {
  const deviceType = getDeviceType();
  
  return {
    // Número de colunas para grid
    columns: deviceType === 'tablet' ? 2 : 1,
    
    // Largura máxima para cards em tablet
    maxCardWidth: deviceType === 'tablet' ? 400 : '100%',
    
    // Centralizar conteúdo em tablet
    centerContent: deviceType === 'tablet',
    
    // Padding horizontal para centralizar em tablet
    horizontalPadding: deviceType === 'tablet' ? 40 : 20,
  };
};

// Hook para detectar mudanças de orientação
export const useOrientation = () => {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>(
    screenHeight > screenWidth ? 'portrait' : 'landscape'
  );

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(window.height > window.width ? 'portrait' : 'landscape');
    });

    return () => subscription?.remove();
  }, []);

  return orientation;
};
