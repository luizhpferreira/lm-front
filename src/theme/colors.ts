export const colors = {
  // Cores principais - Gradiente moderno
  primary: {
    main: '#667eea', // Azul roxo moderno
    light: '#764ba2',
    dark: '#4c63d2',
    contrast: '#ffffff',
  },
  
  // Cores secundárias - Verde vibrante
  secondary: {
    main: '#11998e', // Verde teal moderno
    light: '#38ef7d',
    dark: '#0f7a6b',
    contrast: '#ffffff',
  },
  
  // Cores de sucesso
  success: {
    main: '#00b894', // Verde esmeralda
    light: '#00cec9',
    dark: '#00a085',
    contrast: '#ffffff',
  },
  
  // Cores de erro
  error: {
    main: '#e17055', // Vermelho coral
    light: '#fab1a0',
    dark: '#d63031',
    contrast: '#ffffff',
  },
  
  // Cores de aviso
  warning: {
    main: '#fdcb6e', // Amarelo dourado
    light: '#ffeaa7',
    dark: '#e17055',
    contrast: '#2d3436',
  },
  
  // Cores de informação
  info: {
    main: '#74b9ff', // Azul claro
    light: '#a29bfe',
    dark: '#0984e3',
    contrast: '#ffffff',
  },
  
  // Cores neutras - Escala moderna
  neutral: {
    50: '#f8f9fa',
    100: '#e9ecef',
    200: '#dee2e6',
    300: '#ced4da',
    400: '#adb5bd',
    500: '#6c757d',
    600: '#495057',
    700: '#343a40',
    800: '#212529',
    900: '#1a1d20',
  },
  
  // Cores de fundo - Gradientes suaves
  background: {
    primary: '#f8f9fa',
    secondary: '#ffffff',
    tertiary: '#e9ecef',
    gradient: ['#667eea', '#764ba2'],
  },
  
  // Cores de texto - Alta legibilidade
  text: {
    primary: '#2d3436',
    secondary: '#636e72',
    tertiary: '#b2bec3',
    disabled: '#dfe6e9',
    inverse: '#ffffff',
    onPrimary: '#ffffff',
  },
  
  // Cores de borda - Suaves e modernas
  border: {
    light: '#e9ecef',
    medium: '#dee2e6',
    dark: '#ced4da',
  },
  
  // Cores de sombra - Efeitos sutis
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.15)',
  },
  
  // Gradientes modernos
  gradients: {
    primary: ['#667eea', '#764ba2'],
    secondary: ['#11998e', '#38ef7d'],
    sunset: ['#f093fb', '#f5576c'],
    ocean: ['#4facfe', '#00f2fe'],
    forest: ['#43e97b', '#38f9d7'],
    fire: ['#fa709a', '#fee140'],
  },
};

export const darkColors = {
  // Cores principais para modo escuro
  primary: {
    main: '#a29bfe',
    light: '#6c5ce7',
    dark: '#5f3dc4',
    contrast: '#2d3436',
  },
  
  // Cores de fundo para modo escuro
  background: {
    primary: '#2d3436',
    secondary: '#636e72',
    tertiary: '#b2bec3',
  },
  
  // Cores de texto para modo escuro
  text: {
    primary: '#f8f9fa',
    secondary: '#e9ecef',
    tertiary: '#dee2e6',
    disabled: '#adb5bd',
    inverse: '#2d3436',
  },
  
  // Cores de borda para modo escuro
  border: {
    light: '#636e72',
    medium: '#b2bec3',
    dark: '#dfe6e9',
  },
};

// Exportação padrão para compatibilidade
export default colors;
