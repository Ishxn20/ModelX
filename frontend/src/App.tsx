import { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box,
  Container,
  Fade,
  IconButton,
  Tooltip,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { createAppTheme } from './theme';
import ErrorBoundary from './components/ErrorBoundary';
import InputFormEnhanced from './components/InputFormEnhanced';
import DebateViewer from './components/DebateViewer';
import GemmaChat from './components/GemmaChat';
import type { MLBlueprint, ProjectData } from './lib/types';

type ColorMode = 'dark' | 'light';

export const ColorModeContext = createContext<{
  mode: ColorMode;
  toggleMode: () => void;
}>({ mode: 'dark', toggleMode: () => {} });

export const useColorMode = () => useContext(ColorModeContext);

type AppView = 'input' | 'plan';

function ThemeToggle() {
  const { mode, toggleMode } = useColorMode();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} placement="left">
      <IconButton
        onClick={toggleMode}
        size="medium"
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: isDark
            ? 'rgba(47, 53, 67, 0.80)'
            : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${
            isDark ? 'rgba(244, 240, 232, 0.12)' : 'rgba(24, 22, 15, 0.10)'
          }`,
          boxShadow: isDark
            ? '0 4px 16px rgba(0,0,0,0.40)'
            : '0 4px 16px rgba(0,0,0,0.10)',
          color: isDark ? '#C2B5E8' : '#7B6BBD',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            backgroundColor: isDark
              ? 'rgba(47, 53, 67, 0.95)'
              : 'rgba(255, 255, 255, 0.98)',
            transform: 'scale(1.08)',
            boxShadow: isDark
              ? '0 6px 22px rgba(0,0,0,0.55)'
              : '0 6px 22px rgba(0,0,0,0.15)',
          },
          '&:active': { transform: 'scale(0.96)' },
        }}
      >
        {isDark ? (
          <LightModeIcon sx={{ fontSize: '1.15rem' }} />
        ) : (
          <DarkModeIcon sx={{ fontSize: '1.15rem' }} />
        )}
      </IconButton>
    </Tooltip>
  );
}

function AuroraBackground() {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute', top: '-25%', left: '-10%', width: '60vw', height: '60vw',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle at center, rgba(157, 141, 208, 0.10), transparent 60%)'
            : 'radial-gradient(circle at center, rgba(123, 107, 189, 0.10), transparent 60%)',
          filter: 'blur(100px)',
          animation: 'auroraShift 18s ease-in-out infinite, ambientDrift 26s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute', top: '20%', right: '-15%', width: '50vw', height: '50vw',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle at center, rgba(216, 148, 120, 0.07), transparent 60%)'
            : 'radial-gradient(circle at center, rgba(192, 112, 80, 0.08), transparent 60%)',
          filter: 'blur(110px)',
          animation: 'auroraShift 22s ease-in-out infinite, ambientDrift 30s ease-in-out infinite reverse',
        }}
      />
      <Box
        sx={{
          position: 'absolute', bottom: '-15%', left: '30%', width: '50vw', height: '50vw',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle at center, rgba(127, 186, 168, 0.06), transparent 60%)'
            : 'radial-gradient(circle at center, rgba(74, 146, 130, 0.07), transparent 60%)',
          filter: 'blur(120px)',
          animation: 'auroraShift 26s ease-in-out infinite, ambientDrift 34s ease-in-out infinite',
        }}
      />
    </Box>
  );
}

function AppContent() {
  const [view, setView] = useState<AppView>('input');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [blueprint, setBlueprint] = useState<MLBlueprint | null>(null);
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  const handlePlanStart = (session: string, data: ProjectData) => {
    setSessionId(session);
    setProjectData(data);
    setView('plan');
  };

  const handleReset = () => {
    setView('input');
    setSessionId(null);
    setProjectData(null);
    setBlueprint(null);
  };

  return (
    <>
      <AuroraBackground />
      <Box
        sx={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          opacity: isDark ? 0.5 : 0.3, zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          mixBlendMode: 'overlay',
        }}
      />

      <ThemeToggle />
      <Box sx={{ minHeight: '100vh', position: 'relative', zIndex: 2 }}>
        {view === 'input' && (
          <Fade in timeout={900}>
            <Container maxWidth="xl">
              <Box sx={{ py: { xs: 3, md: 6 }, animation: 'floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <InputFormEnhanced onPlanStart={handlePlanStart} />
              </Box>
            </Container>
          </Fade>
        )}

        {view === 'plan' && sessionId && projectData && (
          <Fade in timeout={900}>
            <Container maxWidth="xl">
              <Box sx={{ py: 4, animation: 'floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <DebateViewer
                  sessionId={sessionId}
                  projectData={projectData}
                  onReset={handleReset}
                  onBlueprintReady={setBlueprint}
                />
              </Box>
            </Container>
          </Fade>
        )}
      </Box>

      <GemmaChat
        blueprint={blueprint}
        projectData={projectData}
        currentView={view}
      />
    </>
  );
}

function App() {
  const [mode, setMode] = useState<ColorMode>('dark');
  const toggleMode = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  const appTheme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
