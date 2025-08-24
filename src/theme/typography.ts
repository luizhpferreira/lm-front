import { scaleFont } from '../utils/responsive';

export const typography = {
  // Tamanhos de fonte (agora responsivos)
  get fontSize() {
    return {
      xs: scaleFont(12),
      sm: scaleFont(14),
      md: scaleFont(16),
      lg: scaleFont(18),
      xl: scaleFont(20),
      xxl: scaleFont(24),
      xxxl: scaleFont(32),
      display: scaleFont(40),
    };
  },
  
  // Pesos de fonte
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
  
  // Estilos de texto pré-definidos (agora responsivos)
  get styles() {
    return {
      h1: {
        fontSize: scaleFont(32),
        fontWeight: '700',
        lineHeight: 1.2,
      },
      h2: {
        fontSize: scaleFont(24),
        fontWeight: '600',
        lineHeight: 1.3,
      },
      h3: {
        fontSize: scaleFont(20),
        fontWeight: '600',
        lineHeight: 1.4,
      },
      h4: {
        fontSize: scaleFont(18),
        fontWeight: '500',
        lineHeight: 1.4,
      },
      body: {
        fontSize: scaleFont(16),
        fontWeight: '400',
        lineHeight: 1.5,
      },
      bodySmall: {
        fontSize: scaleFont(14),
        fontWeight: '400',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: scaleFont(12),
        fontWeight: '400',
        lineHeight: 1.4,
      },
      button: {
        fontSize: scaleFont(16),
        fontWeight: '600',
        lineHeight: 1.2,
      },
      buttonSmall: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        lineHeight: 1.2,
      },
    };
  },
};
