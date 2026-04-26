import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MLBlueprint, ProjectData } from '../lib/types';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const CLR_GEMMA = '#60A5FA';
const CLR_GEMMA_DEEP = '#2563EB';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface GemmaChatProps {
  blueprint?: MLBlueprint | null;
  projectData?: ProjectData | null;
  currentView: 'input' | 'plan';
}

function pageContextFor(view: 'input' | 'plan', blueprint?: MLBlueprint | null): string {
  if (view === 'input') {
    return 'Idea intake form. Help the user write a clear ML project idea, goal, constraints, and data status.';
  }
  if (!blueprint) {
    return 'Planning workspace. Specialist agents are still running and the final blueprint is not ready yet.';
  }
  return 'Blueprint workspace. The user can inspect agent reasoning, blueprint sections, training simulation, inference chat, and deploy/download options.';
}

function getStarters(view: 'input' | 'plan', hasBlueprint: boolean): string[] {
  if (view === 'input') {
    return [
      'What is ModelX and how does it work?',
      "What should I put in the 'idea' vs 'goal' field?",
      "I don't have any data yet — is that OK?",
    ];
  }
  if (!hasBlueprint) {
    return [
      'What are the 8 planning agents doing?',
      'How long does planning usually take?',
      'What will I get at the end?',
    ];
  }
  return [
    'What does my recommendation mean?',
    'Which section should I look at first?',
    'Explain the Compatibility tab to me',
  ];
}

function TypingDots() {
  return (
    <Stack direction="row" spacing="4px" alignItems="center" sx={{ py: 0.5 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: CLR_GEMMA,
            animation: 'gemmaBounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
            '@keyframes gemmaBounce': {
              '0%, 80%, 100%': { transform: 'scale(0.65)', opacity: 0.3 },
              '40%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        />
      ))}
    </Stack>
  );
}

function GemmaAvatar() {
  return (
    <Avatar
      sx={{
        width: 30,
        height: 30,
        background: `linear-gradient(135deg, ${CLR_GEMMA} 0%, ${CLR_GEMMA_DEEP} 100%)`,
        flexShrink: 0,
        fontSize: '0.75rem',
        color: '#fff',
        boxShadow: `0 0 14px rgba(96, 165, 250, 0.45), 0 1px 0 rgba(255, 255, 255, 0.18) inset`,
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: '0.9rem' }} />
    </Avatar>
  );
}

const getMdSx = (isDark: boolean) => ({
  '& p': { m: 0, lineHeight: 1.7, color: 'text.primary', fontSize: '0.82rem' },
  '& p + p': { mt: 0.75 },
  '& ul, & ol': { pl: 2.5, my: 0.5 },
  '& li': { lineHeight: 1.6, color: 'text.primary', fontSize: '0.82rem' },
  '& strong': { color: 'text.primary', fontWeight: 600 },
  '& code': {
    background: 'rgba(96, 165, 250, 0.12)',
    border: '1px solid rgba(96, 165, 250, 0.20)',
    borderRadius: '4px',
    px: '5px',
    py: '1px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.78rem',
    color: CLR_GEMMA,
  },
  '& a': { color: CLR_GEMMA, textDecoration: 'none', borderBottom: `1px solid rgba(96, 165, 250, 0.30)` },
  '& pre': {
    background: isDark ? '#0A0B0F' : '#F1EEE7',
    borderRadius: '8px',
    p: 1.25,
    overflowX: 'auto',
    my: 0.75,
    '& code': { background: 'transparent', border: 'none', p: 0, color: 'text.secondary' },
  },
});

const GemmaChat: React.FC<GemmaChatProps> = ({ blueprint, projectData, currentView }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasBlueprint = !!blueprint;
  const starters = getStarters(currentView, hasBlueprint);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pulse FAB when a new assistant message arrives and panel is closed
  useEffect(() => {
    if (!open && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 3000);
      return () => clearTimeout(t);
    }
  }, [messages, open]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || streaming) return;

      const userMsg: Message = { role: 'user', content: text };
      const history = [...messages, userMsg];
      setMessages([...history, { role: 'assistant', content: '', streaming: true }]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setStreaming(true);

      try {
        const blueprintCtx = blueprint
          ? {
              project_title: projectData?.project_title ?? null,
              recommendation: blueprint.recommendation,
              summary: blueprint.summary,
              problem_framing: blueprint.problem_framing,
              dataset_plan: blueprint.dataset_plan,
              model_plan: blueprint.model_plan,
              training_plan: blueprint.training_plan,
              evaluation_plan: blueprint.evaluation_plan,
              debate_summary: blueprint.debate_summary,
              next_steps: blueprint.next_steps,
              glossary: blueprint.glossary,
              compatibility_result: blueprint.compatibility_result,
              kaggle_datasets: blueprint.kaggle_datasets,
              huggingface_models: blueprint.huggingface_models,
            }
          : null;

        const projectCtx = projectData
          ? {
              project_title: projectData.project_title,
              idea: projectData.idea,
              goal: projectData.goal,
              skill_level: projectData.skill_level,
              data_status: projectData.data_status,
              data_description: projectData.data_description,
              constraints: projectData.constraints,
            }
          : null;

        const resp = await fetch(`${API_URL}/api/gemma/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            blueprint: blueprintCtx,
            project: projectCtx,
            current_view: currentView,
            page_context: pageContextFor(currentView, blueprint),
          }),
        });

        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (raw === '[DONE]') break;
            let parsed: { token?: string; error?: string };
            try {
              parsed = JSON.parse(raw);
            } catch {
              /* ignore malformed chunk */
              continue;
            }
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              assistantText += parsed.token;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: assistantText, streaming: true };
                return next;
              });
            }
          }
        }

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: assistantText };
          return next;
        });
      } catch (err: any) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: `⚠️ ${err.message ?? 'Something went wrong.'}`,
          };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [input, messages, streaming, blueprint, projectData, currentView]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating action button */}
      <Tooltip title={open ? '' : 'Ask Gemma AI'} placement="left">
        <Box
          onClick={() => setOpen((o) => !o)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 20,
            zIndex: 9998,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: open
              ? isDark ? 'rgba(47, 53, 67, 0.95)' : 'rgba(255, 255, 255, 0.95)'
              : `linear-gradient(135deg, ${CLR_GEMMA} 0%, ${CLR_GEMMA_DEEP} 100%)`,
            boxShadow: open
              ? isDark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.15)'
              : `0 1px 0 rgba(255,255,255,0.22) inset, 0 6px 22px rgba(37, 99, 235, 0.45)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: open
              ? isDark ? '1px solid rgba(244, 240, 232, 0.12)' : '1px solid rgba(24, 22, 15, 0.10)'
              : 'none',
            transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            '&:hover': {
              transform: 'scale(1.08)',
              boxShadow: open
                ? isDark ? '0 6px 22px rgba(0,0,0,0.6)' : '0 6px 22px rgba(0,0,0,0.18)'
                : `0 1px 0 rgba(255,255,255,0.24) inset, 0 10px 28px rgba(37, 99, 235, 0.55)`,
            },
            '&:active': { transform: 'scale(0.96)' },
            ...(pulsing && !open && {
              animation: 'gemmaPulse 1.5s ease-in-out 2',
              '@keyframes gemmaPulse': {
                '0%, 100%': { boxShadow: `0 1px 0 rgba(255,255,255,0.22) inset, 0 6px 22px rgba(37, 99, 235, 0.45)` },
                '50%': { boxShadow: `0 1px 0 rgba(255,255,255,0.22) inset, 0 6px 28px rgba(37, 99, 235, 0.75), 0 0 0 8px rgba(96, 165, 250, 0.15)` },
              },
            }),
          }}
        >
          {open ? (
            <CloseIcon
              sx={{
                fontSize: '1.1rem',
                color: isDark ? '#C2B5E8' : '#7B6BBD',
                transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          ) : (
            <ChatIcon sx={{ fontSize: '1.15rem', color: '#fff' }} />
          )}
        </Box>
      </Tooltip>

      {/* Chat panel */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          zIndex: 9997,
          width: { xs: 'calc(100vw - 32px)', sm: 380 },
          height: { xs: 480, sm: 540 },
          maxHeight: 'calc(100vh - 112px)',
          borderRadius: 3,
          background: isDark
            ? 'linear-gradient(180deg, rgba(23, 26, 34, 0.97) 0%, rgba(16, 18, 24, 0.98) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,245,241,0.99) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: isDark
            ? `1px solid rgba(96, 165, 250, 0.18)`
            : `1px solid rgba(37, 99, 235, 0.14)`,
          boxShadow: isDark
            ? `0 0 0 1px rgba(96, 165, 250, 0.06) inset, 0 24px 64px rgba(0,0,0,0.55)`
            : `0 1px 0 rgba(255,255,255,0.95) inset, 0 24px 56px rgba(24,22,15,0.14)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transformOrigin: 'bottom right',
          transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          transform: open ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(12px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: isDark
              ? '1px solid rgba(96, 165, 250, 0.10)'
              : '1px solid rgba(37, 99, 235, 0.08)',
            background: isDark ? 'rgba(16, 18, 24, 0.7)' : 'rgba(255,255,255,0.82)',
            flexShrink: 0,
          }}
        >
          <GemmaAvatar />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: 'text.primary',
                letterSpacing: '-0.01em',
              }}
            >
              Gemma AI
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1 }}>
              Your ML planning assistant
            </Typography>
          </Box>

          <Tooltip title="Clear conversation">
            <IconButton
              size="small"
              onClick={clearConversation}
              disabled={messages.length === 0}
              sx={{
                color: 'text.disabled',
                '&:not(:disabled):hover': { color: CLR_GEMMA },
                transition: 'color 200ms',
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 2,
            py: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#272C37 transparent' : '#D8D2C8 transparent',
          }}
        >
          {messages.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" spacing={2.5} sx={{ flex: 1, py: 3 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, rgba(96, 165, 250, 0.18) 0%, rgba(37, 99, 235, 0.10) 100%)`,
                  border: `1px solid rgba(96, 165, 250, 0.28)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 28px rgba(96, 165, 250, 0.20)`,
                }}
              >
                <AutoAwesomeIcon sx={{ color: CLR_GEMMA, fontSize: '1.5rem', filter: `drop-shadow(0 0 10px rgba(96, 165, 250, 0.55))` }} />
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', mb: 0.4, letterSpacing: '-0.01em' }}>
                  Ask me anything
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', maxWidth: 280, lineHeight: 1.5 }}>
                  I can explain ML concepts, help with your blueprint, or guide you through ModelX.
                </Typography>
              </Box>

              <Stack spacing={0.75} sx={{ width: '100%' }}>
                {starters.map((s) => (
                  <Box
                    key={s}
                    onClick={() => sendMessage(s)}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: '10px',
                      border: isDark
                        ? '1px solid rgba(96, 165, 250, 0.12)'
                        : '1px solid rgba(37, 99, 235, 0.10)',
                      background: isDark ? 'rgba(31, 35, 44, 0.6)' : 'rgba(255,255,255,0.80)',
                      cursor: 'pointer',
                      transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                      '&:hover': {
                        background: `rgba(96, 165, 250, 0.08)`,
                        borderColor: `rgba(96, 165, 250, 0.28)`,
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: '0.77rem', color: 'text.primary', lineHeight: 1.4 }}>
                      {s}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : (
            messages.map((msg, idx) => (
              <Stack
                key={idx}
                direction={msg.role === 'user' ? 'row-reverse' : 'row'}
                spacing={1}
                alignItems="flex-start"
              >
                {msg.role === 'assistant' && <GemmaAvatar />}

                <Box
                  sx={{
                    maxWidth: '82%',
                    px: 1.75,
                    py: 1.1,
                    borderRadius:
                      msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                    background:
                      msg.role === 'user'
                        ? `linear-gradient(135deg, ${CLR_GEMMA} 0%, ${CLR_GEMMA_DEEP} 100%)`
                        : isDark
                        ? 'rgba(31, 35, 44, 0.90)'
                        : 'rgba(255, 255, 255, 0.96)',
                    border:
                      msg.role === 'user'
                        ? 'none'
                        : isDark
                        ? '1px solid rgba(96, 165, 250, 0.10)'
                        : '1px solid rgba(37, 99, 235, 0.08)',
                    boxShadow:
                      msg.role === 'user'
                        ? `0 1px 0 rgba(255,255,255,0.20) inset, 0 4px 14px rgba(37, 99, 235, 0.30)`
                        : isDark
                        ? '0 2px 12px rgba(0,0,0,0.22)'
                        : '0 2px 12px rgba(24,22,15,0.07)',
                  }}
                >
                  {msg.streaming && !msg.content ? (
                    <TypingDots />
                  ) : msg.role === 'assistant' ? (
                    <Box sx={{ ...getMdSx(isDark) }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      {msg.streaming && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 2,
                            height: '0.85em',
                            bgcolor: CLR_GEMMA,
                            ml: '2px',
                            verticalAlign: 'middle',
                            animation: 'gemmaCursor 0.9s ease infinite',
                            '@keyframes gemmaCursor': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0 },
                            },
                          }}
                        />
                      )}
                    </Box>
                  ) : (
                    <Typography
                      sx={{
                        fontSize: '0.82rem',
                        color: '#fff',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        fontWeight: 500,
                      }}
                    >
                      {msg.content}
                    </Typography>
                  )}
                </Box>
              </Stack>
            ))
          )}
          <div ref={bottomRef} />
        </Box>

        {/* Input */}
        <Box
          sx={{
            flexShrink: 0,
            borderTop: isDark
              ? '1px solid rgba(96, 165, 250, 0.10)'
              : '1px solid rgba(37, 99, 235, 0.08)',
            background: isDark ? 'rgba(16, 18, 24, 0.70)' : 'rgba(255,255,255,0.82)',
            px: 2,
            pt: 1.25,
            pb: 1.25,
          }}
        >
          <Stack
            direction="row"
            alignItems="flex-end"
            spacing={1}
            sx={{
              background: isDark ? 'rgba(31, 35, 44, 0.90)' : 'rgba(255,255,255,0.95)',
              borderRadius: '12px',
              border: isDark
                ? '1px solid rgba(96, 165, 250, 0.12)'
                : '1px solid rgba(37, 99, 235, 0.12)',
              px: 1.5,
              py: 0.75,
              transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              '&:focus-within': {
                borderColor: `rgba(96, 165, 250, 0.40)`,
                boxShadow: `0 0 0 3px rgba(96, 165, 250, 0.10)`,
              },
            }}
          >
            <Box
              component="textarea"
              ref={textareaRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about ML, your project, or ModelX…"
              rows={1}
              sx={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: 'text.primary',
                fontSize: '0.83rem',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                py: 0.4,
                overflowY: 'auto',
                '&::placeholder': { color: 'text.disabled' },
              }}
            />

            <IconButton
              size="small"
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                flexShrink: 0,
                background:
                  streaming || !input.trim()
                    ? isDark ? 'rgba(244, 240, 232, 0.06)' : 'rgba(24, 22, 15, 0.06)'
                    : `linear-gradient(135deg, ${CLR_GEMMA} 0%, ${CLR_GEMMA_DEEP} 100%)`,
                boxShadow:
                  streaming || !input.trim()
                    ? 'none'
                    : `0 1px 0 rgba(255,255,255,0.20) inset, 0 3px 12px rgba(37, 99, 235, 0.32)`,
                transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                '&:not(:disabled):hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 1px 0 rgba(255,255,255,0.22) inset, 0 6px 18px rgba(37, 99, 235, 0.45)`,
                },
                '&:disabled': { opacity: 0.45 },
              }}
            >
              {streaming ? (
                <CircularProgress size={12} sx={{ color: '#76716A' }} />
              ) : (
                <SendIcon
                  sx={{
                    fontSize: '0.85rem',
                    color: streaming || !input.trim() ? '#76716A' : '#fff',
                  }}
                />
              )}
            </IconButton>
          </Stack>

          <Typography
            sx={{
              fontSize: '0.6rem',
              color: 'text.disabled',
              textAlign: 'center',
              mt: 0.6,
              letterSpacing: '0.02em',
            }}
          >
            Enter to send · Shift+Enter for new line
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default GemmaChat;
