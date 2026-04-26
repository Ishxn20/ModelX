import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

export const palette = {
  night0: '#0A0B0F',
  night1: '#101218',
  night2: '#171A22',
  night3: '#1F232C',
  night4: '#272C37',
  night5: '#2F3543',

  lilac: '#C2B5E8',
  lilacDeep: '#9D8DD0',
  lilacGlow: 'rgba(194, 181, 232, 0.18)',
  mint: '#A8D4C5',
  mintDeep: '#7FBAA8',
  peach: '#E5B5A0',
  peachDeep: '#D89478',
  coral: '#E89B85',
  amber: '#D4B07A',
  rose: '#E0A8B8',
  steel: '#A2B4C4',

  text0: '#F4F0E8',
  text1: '#B5AFA4',
  text2: '#76716A',
  text3: '#4A4640',

  hairline: 'rgba(244, 240, 232, 0.06)',
  hairlineStrong: 'rgba(244, 240, 232, 0.10)',
  divider: 'rgba(244, 240, 232, 0.04)',

  cream50: '#F4F0E8',
  cream100: '#171A22',
  cream200: '#1F232C',
  blush: '#E5B5A0',
  blushDeep: '#C2B5E8',
  butter: '#D4B07A',
  butterSoft: 'rgba(212, 176, 122, 0.18)',
  sage: '#A8D4C5',
  plum: '#C2B5E8',
  terracotta: '#E89B85',
  ink: '#F4F0E8',
  inkMuted: '#B5AFA4',
  inkSoft: '#76716A',
};

const springEase = 'cubic-bezier(0.16, 1, 0.3, 1)';
const standardEase = 'cubic-bezier(0.4, 0, 0.2, 1)';

const darkPalette = {
  background: {
    default: palette.night0,
    paper: palette.night1,
  },
  primary: {
    main: palette.lilac,
    light: '#D5CBEF',
    dark: palette.lilacDeep,
    contrastText: palette.night0,
  },
  secondary: {
    main: palette.peach,
    light: '#F0CDBC',
    dark: palette.peachDeep,
    contrastText: palette.night0,
  },
  success: {
    main: palette.mint,
    light: '#C5E2D6',
    dark: palette.mintDeep,
    contrastText: palette.night0,
  },
  warning: {
    main: palette.amber,
    light: '#E0C49B',
    dark: '#B8954E',
    contrastText: palette.night0,
  },
  error: {
    main: palette.coral,
    light: '#F0B8A6',
    dark: '#C97862',
    contrastText: palette.night0,
  },
  info: {
    main: palette.steel,
    light: '#BCC8D2',
    dark: '#7B8C9C',
    contrastText: palette.night0,
  },
  text: {
    primary: palette.text0,
    secondary: palette.text1,
    disabled: palette.text2,
  },
  divider: palette.hairline,
};

const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark' as const,
    ...darkPalette,
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Plus Jakarta Sans", sans-serif',
    h1: {
      fontSize: '3.25rem',
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: '-0.035em',
      color: palette.text0,
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.03em',
      color: palette.text0,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
      color: palette.text0,
    },
    h4: {
      fontSize: '1.4rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
      color: palette.text0,
    },
    h5: {
      fontSize: '1.15rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: palette.text0,
    },
    h6: {
      fontSize: '0.95rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '-0.005em',
      color: palette.text0,
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.65,
      fontWeight: 400,
      letterSpacing: '-0.005em',
    },
    body2: {
      fontSize: '0.85rem',
      lineHeight: 1.55,
      fontWeight: 400,
      letterSpacing: '-0.003em',
    },
    button: {
      textTransform: 'none' as const,
      fontWeight: 500,
      letterSpacing: '-0.005em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${palette.night4} ${palette.night1}`,
          color: palette.text0,
          backgroundColor: palette.night0,
          '&::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          '&::-webkit-scrollbar-track': {
            background: palette.night1,
          },
          '&::-webkit-scrollbar-thumb': {
            background: palette.night4,
            borderRadius: '6px',
            border: `2px solid ${palette.night1}`,
            '&:hover': {
              background: palette.night5,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.night1,
          backdropFilter: 'none',
          border: `1px solid ${palette.hairline}`,
          boxShadow: '0 1px 0 rgba(244, 240, 232, 0.02) inset, 0 8px 24px rgba(0, 0, 0, 0.25)',
          transition: `all 350ms ${springEase}`,
          '&:hover': {
            boxShadow: '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 16px 40px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(194, 181, 232, 0.08)',
            borderColor: 'rgba(194, 181, 232, 0.14)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.night1,
          backdropFilter: 'none',
          border: `1px solid ${palette.hairline}`,
          color: palette.text0,
        },
        elevation1: {
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        },
        elevation3: {
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '9px 20px',
          fontWeight: 500,
          textTransform: 'none',
          letterSpacing: '-0.005em',
          transition: `all 250ms ${springEase}`,
        },
        contained: {
          background: `linear-gradient(135deg, ${palette.lilac} 0%, ${palette.lilacDeep} 100%)`,
          color: palette.night0,
          boxShadow: '0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 4px 14px rgba(157, 141, 208, 0.32)',
          '&:hover': {
            background: `linear-gradient(135deg, #D5CBEF 0%, ${palette.lilac} 100%)`,
            boxShadow: '0 1px 0 rgba(255, 255, 255, 0.22) inset, 0 8px 22px rgba(157, 141, 208, 0.45)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.99)',
          },
          '&.Mui-disabled': {
            background: palette.night3,
            color: palette.text2,
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: '1px',
          borderColor: palette.hairlineStrong,
          color: palette.text0,
          backgroundColor: 'rgba(244, 240, 232, 0.02)',
          '&:hover': {
            borderWidth: '1px',
            backgroundColor: 'rgba(194, 181, 232, 0.08)',
            borderColor: 'rgba(194, 181, 232, 0.35)',
            transform: 'translateY(-1px)',
          },
        },
        text: {
          color: palette.lilac,
          '&:hover': {
            backgroundColor: 'rgba(194, 181, 232, 0.08)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: `all 200ms ${springEase}`,
          '&:hover': {
            backgroundColor: 'rgba(244, 240, 232, 0.06)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.75rem',
          letterSpacing: '-0.003em',
          backdropFilter: 'none',
          border: `1px solid ${palette.hairline}`,
          backgroundColor: 'transparent',
          color: palette.text0,
          transition: `all 200ms ${springEase}`,
        },
        filled: {
          backgroundColor: palette.night2,
          color: palette.text0,
          border: `1px solid ${palette.hairline}`,
        },
        outlined: {
          borderColor: palette.hairlineStrong,
        },
        colorPrimary: {
          backgroundColor: 'rgba(194, 181, 232, 0.12)',
          color: palette.lilac,
          border: '1px solid rgba(194, 181, 232, 0.22)',
        },
        colorSecondary: {
          backgroundColor: 'rgba(229, 181, 160, 0.12)',
          color: palette.peach,
          border: '1px solid rgba(229, 181, 160, 0.22)',
        },
        colorSuccess: {
          backgroundColor: 'rgba(168, 212, 197, 0.12)',
          color: palette.mint,
          border: '1px solid rgba(168, 212, 197, 0.22)',
        },
        colorWarning: {
          backgroundColor: 'rgba(212, 176, 122, 0.12)',
          color: palette.amber,
          border: '1px solid rgba(212, 176, 122, 0.22)',
        },
        colorError: {
          backgroundColor: 'rgba(232, 155, 133, 0.12)',
          color: palette.coral,
          border: '1px solid rgba(232, 155, 133, 0.22)',
        },
        colorInfo: {
          backgroundColor: 'rgba(162, 180, 196, 0.12)',
          color: palette.steel,
          border: '1px solid rgba(162, 180, 196, 0.22)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          backgroundColor: palette.night3,
        },
        bar: {
          borderRadius: 8,
          background: `linear-gradient(90deg, ${palette.lilac} 0%, ${palette.peach} 100%)`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: palette.night2,
            color: palette.text0,
            transition: `all 200ms ${springEase}`,
            borderRadius: 10,
            '& .MuiInputBase-input': {
              color: palette.text0,
              WebkitTextFillColor: palette.text0,
            },
            '& input': {
              color: palette.text0,
              WebkitTextFillColor: palette.text0,
            },
            '& textarea': {
              color: palette.text0,
              WebkitTextFillColor: palette.text0,
            },
            '& .MuiSelect-select': {
              color: palette.text0,
              WebkitTextFillColor: palette.text0,
            },
            '& fieldset': {
              borderColor: palette.hairline,
              borderWidth: '1px',
            },
            '&:hover': {
              backgroundColor: palette.night3,
            },
            '&:hover fieldset': {
              borderColor: palette.hairlineStrong,
            },
            '&.Mui-focused': {
              backgroundColor: palette.night3,
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(194, 181, 232, 0.55)',
              borderWidth: '1px',
              boxShadow: '0 0 0 3px rgba(194, 181, 232, 0.10)',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: palette.text2,
            opacity: 1,
            WebkitTextFillColor: palette.text2,
          },
          '& .MuiInputLabel-root': {
            color: palette.text1,
            '&.Mui-focused': {
              color: palette.lilac,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: palette.text1,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.night2,
          border: `1px solid ${palette.hairlineStrong}`,
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.48)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: palette.text0,
          fontSize: '0.9rem',
          '&.Mui-selected': {
            backgroundColor: 'rgba(194, 181, 232, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(194, 181, 232, 0.18)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(244, 240, 232, 0.05)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${palette.lilac} 0%, ${palette.peach} 100%)`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: palette.text1,
          fontWeight: 500,
          fontSize: '0.9rem',
          letterSpacing: '-0.005em',
          textTransform: 'none',
          minHeight: 44,
          transition: `all 200ms ${springEase}`,
          '&:hover': {
            color: palette.text0,
          },
          '&.Mui-selected': {
            color: palette.text0,
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: palette.night3,
          '&.Mui-active': {
            color: palette.lilac,
          },
          '&.Mui-completed': {
            color: palette.mint,
          },
        },
        text: {
          fill: palette.night0,
          fontWeight: 700,
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: palette.text2,
          fontWeight: 500,
          '&.Mui-active': {
            color: palette.lilac,
            fontWeight: 600,
          },
          '&.Mui-completed': {
            color: palette.mintDeep,
            fontWeight: 500,
          },
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: palette.hairlineStrong,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.night4,
          color: palette.text0,
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 8,
          padding: '6px 10px',
          border: `1px solid ${palette.hairlineStrong}`,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        },
        arrow: {
          color: palette.night4,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${palette.hairline}`,
          backgroundColor: palette.night2,
        },
        standardError: {
          backgroundColor: 'rgba(232, 155, 133, 0.10)',
          color: palette.coral,
          border: '1px solid rgba(232, 155, 133, 0.22)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(168, 212, 197, 0.10)',
          color: palette.mint,
          border: '1px solid rgba(168, 212, 197, 0.22)',
        },
        standardWarning: {
          backgroundColor: 'rgba(212, 176, 122, 0.10)',
          color: palette.amber,
          border: '1px solid rgba(212, 176, 122, 0.22)',
        },
        standardInfo: {
          backgroundColor: 'rgba(162, 180, 196, 0.10)',
          color: palette.steel,
          border: '1px solid rgba(162, 180, 196, 0.22)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: palette.divider,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: {
          backgroundColor: palette.night3,
        },
      },
    },
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 350,
      complex: 500,
      enteringScreen: 400,
      leavingScreen: 300,
    },
    easing: {
      easeInOut: standardEase,
      easeOut: springEase,
      easeIn: 'cubic-bezier(0.55, 0.05, 0.67, 0.19)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
};

export const darkTheme = createTheme(darkThemeOptions);

export const lightPalette = {
  bg0: '#F6F5F1',
  bg1: '#FFFFFF',
  bg2: '#EEECE7',
  bg3: '#E4E1DA',
  bg4: '#D8D4CC',

  lilac: '#7B6BBD',
  lilacDeep: '#5E4FA0',
  mint: '#4A9282',
  mintDeep: '#357265',
  peach: '#C07050',
  peachDeep: '#A35C3D',
  coral: '#C06050',
  amber: '#A07830',
  rose: '#B06080',
  steel: '#5A7A90',

  text0: '#18160F',
  text1: '#5A554E',
  text2: '#9A948C',
  text3: '#C4BEB6',

  hairline: 'rgba(24, 22, 15, 0.07)',
  hairlineStrong: 'rgba(24, 22, 15, 0.12)',
  divider: 'rgba(24, 22, 15, 0.05)',
};

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light' as const,
    background: {
      default: lightPalette.bg0,
      paper: lightPalette.bg1,
    },
    primary: {
      main: lightPalette.lilac,
      light: '#9D8DD0',
      dark: lightPalette.lilacDeep,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: lightPalette.peach,
      light: '#D49070',
      dark: lightPalette.peachDeep,
      contrastText: '#FFFFFF',
    },
    success: {
      main: lightPalette.mint,
      light: '#6AADA0',
      dark: lightPalette.mintDeep,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: lightPalette.amber,
      light: '#C09050',
      dark: '#806020',
      contrastText: '#FFFFFF',
    },
    error: {
      main: lightPalette.coral,
      light: '#D07868',
      dark: '#A04838',
      contrastText: '#FFFFFF',
    },
    info: {
      main: lightPalette.steel,
      light: '#7A9AB0',
      dark: '#3A5A70',
      contrastText: '#FFFFFF',
    },
    text: {
      primary: lightPalette.text0,
      secondary: lightPalette.text1,
      disabled: lightPalette.text2,
    },
    divider: lightPalette.hairline,
  },
  typography: darkThemeOptions.typography,
  spacing: 8,
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin' as const,
          scrollbarColor: `${lightPalette.bg3} ${lightPalette.bg1}`,
          color: lightPalette.text0,
          backgroundColor: lightPalette.bg0,
          '&::-webkit-scrollbar': { width: '10px', height: '10px' },
          '&::-webkit-scrollbar-track': { background: lightPalette.bg1 },
          '&::-webkit-scrollbar-thumb': {
            background: lightPalette.bg3,
            borderRadius: '6px',
            border: `2px solid ${lightPalette.bg1}`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: lightPalette.bg1,
          border: `1px solid ${lightPalette.hairline}`,
          boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 16px rgba(0,0,0,0.06)',
          transition: `all 350ms ${springEase}`,
          '&:hover': {
            boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 28px rgba(0,0,0,0.10)',
            borderColor: lightPalette.hairlineStrong,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: lightPalette.bg1,
          border: `1px solid ${lightPalette.hairline}`,
          color: lightPalette.text0,
        },
        elevation1: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
        elevation2: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
        elevation3: { boxShadow: '0 12px 32px rgba(0,0,0,0.10)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '9px 20px',
          fontWeight: 500,
          textTransform: 'none' as const,
          letterSpacing: '-0.005em',
          transition: `all 250ms ${springEase}`,
        },
        contained: {
          background: `linear-gradient(135deg, ${lightPalette.lilac} 0%, ${lightPalette.lilacDeep} 100%)`,
          color: '#FFFFFF',
          boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 14px rgba(123, 107, 189, 0.30)',
          '&:hover': {
            background: `linear-gradient(135deg, #9D8DD0 0%, ${lightPalette.lilac} 100%)`,
            boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 22px rgba(123, 107, 189, 0.42)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0) scale(0.99)' },
          '&.Mui-disabled': {
            background: lightPalette.bg3,
            color: lightPalette.text2,
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: '1px',
          borderColor: lightPalette.hairlineStrong,
          color: lightPalette.text0,
          '&:hover': {
            borderWidth: '1px',
            backgroundColor: 'rgba(123, 107, 189, 0.06)',
            borderColor: lightPalette.lilac,
          },
        },
        text: {
          color: lightPalette.lilac,
          '&:hover': { backgroundColor: 'rgba(123, 107, 189, 0.06)' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: `all 200ms ${springEase}`,
          '&:hover': { backgroundColor: lightPalette.hairline },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.75rem',
          letterSpacing: '-0.003em',
          border: `1px solid ${lightPalette.hairline}`,
          backgroundColor: 'transparent',
          color: lightPalette.text0,
          transition: `all 200ms ${springEase}`,
        },
        filled: {
          backgroundColor: lightPalette.bg2,
          color: lightPalette.text0,
          border: `1px solid ${lightPalette.hairline}`,
        },
        colorPrimary: {
          backgroundColor: 'rgba(123, 107, 189, 0.10)',
          color: lightPalette.lilac,
          border: '1px solid rgba(123, 107, 189, 0.22)',
        },
        colorSecondary: {
          backgroundColor: 'rgba(192, 112, 80, 0.10)',
          color: lightPalette.peach,
          border: '1px solid rgba(192, 112, 80, 0.22)',
        },
        colorSuccess: {
          backgroundColor: 'rgba(74, 146, 130, 0.10)',
          color: lightPalette.mint,
          border: '1px solid rgba(74, 146, 130, 0.22)',
        },
        colorWarning: {
          backgroundColor: 'rgba(160, 120, 48, 0.10)',
          color: lightPalette.amber,
          border: '1px solid rgba(160, 120, 48, 0.22)',
        },
        colorError: {
          backgroundColor: 'rgba(192, 96, 80, 0.10)',
          color: lightPalette.coral,
          border: '1px solid rgba(192, 96, 80, 0.22)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          backgroundColor: lightPalette.bg3,
        },
        bar: {
          borderRadius: 8,
          background: `linear-gradient(90deg, ${lightPalette.lilac} 0%, ${lightPalette.peach} 100%)`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: lightPalette.bg0,
            color: lightPalette.text0,
            transition: `all 200ms ${springEase}`,
            borderRadius: 10,
            '& .MuiInputBase-input': { color: lightPalette.text0 },
            '& input': { color: lightPalette.text0 },
            '& textarea': { color: lightPalette.text0 },
            '& fieldset': { borderColor: lightPalette.hairlineStrong, borderWidth: '1px' },
            '&:hover': { backgroundColor: lightPalette.bg2 },
            '&:hover fieldset': { borderColor: lightPalette.hairlineStrong },
            '&.Mui-focused': { backgroundColor: lightPalette.bg1 },
            '&.Mui-focused fieldset': {
              borderColor: `rgba(123, 107, 189, 0.55)`,
              borderWidth: '1px',
              boxShadow: '0 0 0 3px rgba(123, 107, 189, 0.10)',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: lightPalette.text2,
            opacity: 1,
          },
          '& .MuiInputLabel-root': {
            color: lightPalette.text1,
            '&.Mui-focused': { color: lightPalette.lilac },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: lightPalette.text1 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: lightPalette.bg1,
          border: `1px solid ${lightPalette.hairlineStrong}`,
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: lightPalette.text0,
          fontSize: '0.9rem',
          '&.Mui-selected': {
            backgroundColor: 'rgba(123, 107, 189, 0.10)',
            '&:hover': { backgroundColor: 'rgba(123, 107, 189, 0.16)' },
          },
          '&:hover': { backgroundColor: lightPalette.hairline },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${lightPalette.lilac} 0%, ${lightPalette.peach} 100%)`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: lightPalette.text1,
          fontWeight: 500,
          fontSize: '0.9rem',
          letterSpacing: '-0.005em',
          textTransform: 'none' as const,
          minHeight: 44,
          transition: `all 200ms ${springEase}`,
          '&:hover': { color: lightPalette.text0 },
          '&.Mui-selected': { color: lightPalette.text0 },
        },
      },
    },
    MuiStepper: {
      styleOverrides: { root: { backgroundColor: 'transparent' } },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: lightPalette.bg3,
          '&.Mui-active': { color: lightPalette.lilac },
          '&.Mui-completed': { color: lightPalette.mint },
        },
        text: { fill: '#FFFFFF', fontWeight: 700 },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: lightPalette.text2,
          fontWeight: 500,
          '&.Mui-active': { color: lightPalette.lilac, fontWeight: 600 },
          '&.Mui-completed': { color: lightPalette.mintDeep, fontWeight: 500 },
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: { line: { borderColor: lightPalette.hairlineStrong } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: lightPalette.bg4,
          color: lightPalette.text0,
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 8,
          padding: '6px 10px',
          border: `1px solid ${lightPalette.hairlineStrong}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        },
        arrow: { color: lightPalette.bg4 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${lightPalette.hairline}`,
          backgroundColor: lightPalette.bg2,
        },
        standardError: {
          backgroundColor: 'rgba(192, 96, 80, 0.08)',
          color: lightPalette.coral,
          border: '1px solid rgba(192, 96, 80, 0.20)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(74, 146, 130, 0.08)',
          color: lightPalette.mint,
          border: '1px solid rgba(74, 146, 130, 0.20)',
        },
        standardWarning: {
          backgroundColor: 'rgba(160, 120, 48, 0.08)',
          color: lightPalette.amber,
          border: '1px solid rgba(160, 120, 48, 0.20)',
        },
        standardInfo: {
          backgroundColor: 'rgba(90, 122, 144, 0.08)',
          color: lightPalette.steel,
          border: '1px solid rgba(90, 122, 144, 0.20)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: lightPalette.divider } },
    },
    MuiSwitch: {
      styleOverrides: { track: { backgroundColor: lightPalette.bg3 } },
    },
  },
  transitions: darkThemeOptions.transitions,
};

export const lightTheme = createTheme(lightThemeOptions);

export const createAppTheme = (mode: 'dark' | 'light') =>
  mode === 'dark' ? darkTheme : lightTheme;

export const theme = darkTheme;
