import { getAdaptivePadding, getAdaptiveMargins, getAdaptiveBorderRadius } from '../utils/responsive';

export const spacing = {
  // Espaçamentos base
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Espaçamentos específicos (agora responsivos)
  get screenPadding() {
    return getAdaptivePadding().screen;
  },
  get cardPadding() {
    return getAdaptivePadding().card;
  },
  get buttonPadding() {
    return getAdaptivePadding().button;
  },
  get inputPadding() {
    return getAdaptivePadding().input;
  },
  
  // Margens (agora responsivas)
  get margin() {
    return getAdaptiveMargins();
  },
  
  // Padding (agora responsivas)
  get padding() {
    return getAdaptiveMargins(); // Reutiliza as margens adaptativas
  },
  
  // Border radius (agora responsivo)
  get borderRadius() {
    return getAdaptiveBorderRadius();
  },
};
