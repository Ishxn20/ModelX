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
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClearIcon from '@mui/icons-material/Clear';
import SendIcon from '@mui/icons-material/Send';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatImage {
  data: string;
  mime_type: string;
  preview: string;
  name: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: ChatImage[];
  streaming?: boolean;
}

interface CompatibilityInfo {
  chosen_dataset?: string;
  chosen_dataset_url?: string;
  chosen_model?: string;
  chosen_model_url?: string;
  why_this_pair?: string;
  estimated_effort?: string;
}

interface InferenceChatProps {
  taskType?: string;
  modelName?: string;
  datasetName?: string;
  problemFraming?: string;
  datasetPlan?: string;
  modelPlan?: string;
  trainingPlan?: string;
  evaluationPlan?: string;
  nextSteps?: string[];
  compatibility?: CompatibilityInfo;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

function taskLabel(taskType: string): string {
  const map: Record<string, string> = {
    binary_classification: 'Binary Classification',
    multi_class: 'Multi-Class Classification',
    regression: 'Regression',
    text_classification: 'Text Classification',
    image_classification: 'Image Classification',
    time_series: 'Time-Series Forecasting',
  };
  return map[taskType] ?? taskType.replace(/_/g, ' ');
}

function placeholderFor(taskType: string): string {
  const map: Record<string, string> = {
    binary_classification: 'Paste a data record or describe an example to classify…',
    multi_class: 'Describe an input to classify into one of several categories…',
    regression: 'Provide feature values to get a numeric prediction…',
    text_classification: 'Type or paste text to classify…',
    image_classification: 'Upload an image or describe a scene to classify…',
    time_series: 'Provide historical values or ask for a forecast…',
  };
  return map[taskType] ?? 'Type a message…';
}

function startersFor(taskType: string): string[] {
  const map: Record<string, string[]> = {
    binary_classification: [
      'What features matter most for your predictions?',
      'Can you classify this: age=34, income=52000, balance=1200?',
      "What's your confidence threshold for the positive class?",
    ],
    multi_class: [
      'What classes can you predict?',
      'Classify this sample for me.',
      "What's the most common class in your training data?",
    ],
    regression: [
      'Predict a value for: bedrooms=3, sqft=1800, location=suburban.',
      "What's your expected prediction range?",
      'Which feature has the largest impact on your output?',
    ],
    text_classification: [
      '"I absolutely love this product, works perfectly!" — classify that.',
      '"Delivery was late and packaging was damaged." — what do you predict?',
      'How do you handle neutral or ambiguous text?',
    ],
    image_classification: [
      "Upload an image and I'll classify it for you.",
      'What categories are you trained to recognise?',
      'How confident are you typically on unseen images?',
    ],
    time_series: [
      'Given [120, 135, 128, 142, 155], forecast the next 3 values.',
      'Do you detect any seasonal patterns in the training data?',
      "What's your typical forecast horizon?",
    ],
  };
  return map[taskType] ?? [
    'What can you predict?',
    'Give me an example prediction.',
    'How confident are you in your outputs?',
  ];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TypingDots() {
  return (
    <Stack direction="row" spacing="4px" alignItems="center" sx={{ py: 0.5 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: '#C2B5E8',
            animation: 'typingBounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
            '@keyframes typingBounce': {
              '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.35 },
              '40%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        />
      ))}
    </Stack>
  );
}

function ModelAvatar() {
  return (
    <Avatar
      sx={{
        width: 32,
        height: 32,
        background: 'linear-gradient(135deg, #C2B5E8 0%, #E5B5A0 100%)',
        flexShrink: 0,
        fontSize: '0.8rem',
        color: '#0A0B0F',
        boxShadow: '0 0 16px rgba(194, 181, 232, 0.45), 0 1px 0 rgba(255, 255, 255, 0.18) inset',
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: '1rem' }} />
    </Avatar>
  );
}

const getMdSx = (isDark: boolean) => ({
  '& p': { m: 0, lineHeight: 1.7, color: 'text.primary' },
  '& p + p': { mt: 1 },
  '& ul, & ol': { pl: 2.5, my: 0.5 },
  '& li': { lineHeight: 1.65, color: 'text.primary' },
  '& code': {
    background: 'rgba(212, 176, 122, 0.16)',
    border: '1px solid rgba(212, 176, 122, 0.20)',
    borderRadius: '4px',
    px: '5px',
    py: '1px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.8rem',
    color: '#D4B07A',
  },
  '& pre': {
    background: isDark ? '#0A0B0F' : '#F1EEE7',
    borderRadius: '8px',
    p: 1.5,
    overflowX: 'auto',
    my: 1,
    border: isDark ? '1px solid rgba(244, 240, 232, 0.08)' : '1px solid rgba(24, 22, 15, 0.10)',
    '& code': { background: 'transparent', border: 'none', p: 0, color: 'text.secondary' },
  },
  '& table': { width: '100%', borderCollapse: 'collapse', my: 1 },
  '& th, & td': {
    border: isDark ? '1px solid rgba(244, 240, 232, 0.08)' : '1px solid rgba(24, 22, 15, 0.10)',
    px: 1.5,
    py: 0.75,
    textAlign: 'left',
    fontSize: '0.82rem',
    color: 'text.primary',
  },
  '& th': { background: 'rgba(194, 181, 232, 0.10)', fontWeight: 600, color: '#C2B5E8' },
  '& strong': { color: 'text.primary', fontWeight: 600 },
  '& a': { color: '#C2B5E8', borderBottom: '1px solid rgba(194, 181, 232, 0.30)', textDecoration: 'none' },
});

const InferenceChat: React.FC<InferenceChatProps> = ({
  taskType = 'binary_classification',
  modelName = 'Trained Model',
  datasetName = '',
  problemFraming = '',
  datasetPlan = '',
  modelPlan = '',
  trainingPlan = '',
  evaluationPlan = '',
  nextSteps,
  compatibility,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatImage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const imgs: ChatImage[] = await Promise.all(
        files.slice(0, 4).map(async (f) => ({
          data: await fileToBase64(f),
          mime_type: f.type || 'image/jpeg',
          preview: URL.createObjectURL(f),
          name: f.name,
        }))
      );
      setAttachments((prev) => [...prev, ...imgs].slice(0, 4));
      e.target.value = '';
    },
    []
  );

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text && attachments.length === 0) return;
      if (streaming) return;

      const userMsg: Message = {
        role: 'user',
        content: text,
        images: attachments.length > 0 ? [...attachments] : undefined,
      };

      const history = [...messages, userMsg];
      setMessages([...history, { role: 'assistant', content: '', streaming: true }]);
      setInput('');
      setAttachments([]);
      setStreaming(true);

      try {
        const body = {
          task_type: taskType,
          model_name: modelName,
          dataset_name: datasetName,
          problem_framing: problemFraming,
          dataset_plan: datasetPlan,
          model_plan: modelPlan,
          training_plan: trainingPlan,
          evaluation_plan: evaluationPlan,
          next_steps: nextSteps,
          compatibility,
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images?.map((img) => ({
              data: img.data,
              mime_type: img.mime_type,
            })),
          })),
        };

        const resp = await fetch(`${API_URL}/api/inference/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
            try {
              const parsed = JSON.parse(raw);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.token) {
                assistantText += parsed.token;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: 'assistant', content: assistantText, streaming: true };
                  return next;
                });
              }
            } catch {
              /* ignore malformed chunk */
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
          next[next.length - 1] = { role: 'assistant', content: `⚠️ ${err.message ?? 'Something went wrong.'}` };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [input, attachments, messages, streaming, taskType, modelName, datasetName, problemFraming, datasetPlan, modelPlan, trainingPlan, evaluationPlan, nextSteps, compatibility]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const starters = startersFor(taskType);

  return (
    <Stack
      sx={{
        height: '100%',
        minHeight: 480,
        background: isDark
          ? 'linear-gradient(180deg, rgba(23, 26, 34, 0.85) 0%, rgba(16, 18, 24, 0.88) 100%)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 245, 241, 0.98) 100%)',
        backdropFilter: 'blur(24px)',
        borderRadius: '14px',
        border: isDark ? '1px solid rgba(244, 240, 232, 0.08)' : '1px solid rgba(24, 22, 15, 0.08)',
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 1px 0 rgba(244, 240, 232, 0.04) inset, 0 16px 48px rgba(0, 0, 0, 0.36)'
          : '0 1px 0 rgba(255, 255, 255, 0.92) inset, 0 16px 40px rgba(24, 22, 15, 0.10)',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: isDark ? '1px solid rgba(244, 240, 232, 0.06)' : '1px solid rgba(24, 22, 15, 0.08)',
          background: isDark ? 'rgba(16, 18, 24, 0.6)' : 'rgba(255, 255, 255, 0.76)',
          flexShrink: 0,
        }}
      >
        <ModelAvatar />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'text.primary',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {modelName}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {taskLabel(taskType)}{datasetName ? ` · ${datasetName}` : ''}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            px: 1.25,
            py: '4px',
            borderRadius: '20px',
            background: 'rgba(168, 212, 197, 0.10)',
            border: '1px solid rgba(168, 212, 197, 0.28)',
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#A8D4C5',
              boxShadow: '0 0 8px rgba(168, 212, 197, 0.6)',
              animation: 'pulse 2.6s ease infinite',
            }}
          />
          <Typography sx={{ fontSize: '0.65rem', color: '#A8D4C5', fontWeight: 500, letterSpacing: '0.02em' }}>
            Online
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2.5,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          background: 'transparent',
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? '#272C37 transparent' : '#D8D2C8 transparent',
        }}
      >
        {messages.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" spacing={3} sx={{ flex: 1, py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(194, 181, 232, 0.18) 0%, rgba(229, 181, 160, 0.12) 100%)',
                border: '1px solid rgba(194, 181, 232, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark
                  ? '0 0 32px rgba(194, 181, 232, 0.20), 0 1px 0 rgba(244, 240, 232, 0.06) inset'
                  : '0 0 28px rgba(157, 141, 208, 0.14), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
              }}
            >
              <AutoAwesomeIcon sx={{ color: '#C2B5E8', fontSize: '1.7rem', filter: 'drop-shadow(0 0 12px rgba(194, 181, 232, 0.55))' }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1.05rem', mb: 0.5, letterSpacing: '-0.015em' }}>
                Ready to run inference
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', maxWidth: 340 }}>
                Ask questions, upload files, or send examples to the model and receive live predictions.
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ width: '100%', maxWidth: 380 }}>
              {starters.map((s) => (
                <Box
                  key={s}
                  onClick={() => sendMessage(s)}
                  sx={{
                    px: 2,
                    py: 1.15,
                    borderRadius: '10px',
                    border: isDark ? '1px solid rgba(244, 240, 232, 0.08)' : '1px solid rgba(24, 22, 15, 0.08)',
                    background: isDark ? 'rgba(31, 35, 44, 0.6)' : 'rgba(255, 255, 255, 0.78)',
                    cursor: 'pointer',
                    transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                    '&:hover': {
                      background: 'rgba(194, 181, 232, 0.08)',
                      borderColor: 'rgba(194, 181, 232, 0.30)',
                      boxShadow: isDark
                        ? '0 4px 16px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(194, 181, 232, 0.10)'
                        : '0 4px 16px rgba(24, 22, 15, 0.08), 0 0 0 1px rgba(157, 141, 208, 0.10)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.primary' }}>
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
              spacing={1.5}
              alignItems="flex-start"
            >
              {msg.role === 'assistant' && <ModelAvatar />}

              <Box
                sx={{
                  maxWidth: '78%',
                  px: 2,
                  py: 1.4,
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, #C2B5E8 0%, #9D8DD0 100%)'
                      : isDark ? 'rgba(31, 35, 44, 0.85)' : 'rgba(255, 255, 255, 0.94)',
                  border:
                    msg.role === 'user'
                      ? 'none'
                      : isDark ? '1px solid rgba(244, 240, 232, 0.06)' : '1px solid rgba(24, 22, 15, 0.08)',
                  boxShadow:
                    msg.role === 'user'
                      ? '0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 6px 18px rgba(157, 141, 208, 0.32)'
                      : isDark
                        ? '0 1px 0 rgba(244, 240, 232, 0.03) inset, 0 4px 14px rgba(0, 0, 0, 0.24)'
                        : '0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 4px 14px rgba(24, 22, 15, 0.08)',
                }}
              >
                {msg.images && msg.images.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    {msg.images.map((img, i) => (
                      <Box
                        key={i}
                        component="img"
                        src={img.preview}
                        alt={img.name}
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                      />
                    ))}
                  </Stack>
                )}

                {msg.streaming && !msg.content ? (
                  <TypingDots />
                ) : msg.role === 'assistant' ? (
                  <Box sx={{ ...getMdSx(isDark), fontSize: '0.83rem' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                    {msg.streaming && (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          width: 2,
                          height: '0.9em',
                          bgcolor: '#C2B5E8',
                          ml: '2px',
                          verticalAlign: 'middle',
                          animation: 'cursorBlink 0.9s ease infinite',
                          '@keyframes cursorBlink': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0 },
                          },
                        }}
                      />
                    )}
                  </Box>
                ) : (
                  <Typography
                    sx={{ fontSize: '0.83rem', color: '#0A0B0F', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 500 }}
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

      <Box
        sx={{
          flexShrink: 0,
          borderTop: isDark ? '1px solid rgba(244, 240, 232, 0.06)' : '1px solid rgba(24, 22, 15, 0.08)',
          background: isDark ? 'rgba(16, 18, 24, 0.6)' : 'rgba(255, 255, 255, 0.76)',
          px: 2.5,
          pt: 1.5,
          pb: 1.5,
        }}
      >
        {attachments.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            {attachments.map((img, i) => (
              <Box key={i} sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={img.preview}
                  alt={img.name}
                  sx={{
                    width: 56,
                    height: 56,
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    display: 'block',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeAttachment(i)}
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    bgcolor: isDark ? '#0A0B0F' : '#FFFFFF',
                    border: isDark ? '1px solid rgba(244, 240, 232, 0.20)' : '1px solid rgba(24, 22, 15, 0.12)',
                    '&:hover': { bgcolor: isDark ? '#272C37' : '#F1EEE7' },
                    p: 0,
                  }}
                >
                  <ClearIcon sx={{ fontSize: '0.65rem', color: 'text.primary' }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}

        <Stack
          direction="row"
          alignItems="flex-end"
          spacing={1}
          sx={{
            background: isDark ? 'rgba(31, 35, 44, 0.85)' : 'rgba(255, 255, 255, 0.92)',
            borderRadius: '14px',
            border: isDark ? '1px solid rgba(244, 240, 232, 0.08)' : '1px solid rgba(24, 22, 15, 0.10)',
            px: 1.5,
            py: 1,
            transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
            '&:focus-within': {
              borderColor: 'rgba(194, 181, 232, 0.45)',
              boxShadow: '0 0 0 3px rgba(194, 181, 232, 0.10)',
              background: isDark ? 'rgba(39, 44, 55, 0.85)' : 'rgba(255, 255, 255, 1)',
            },
          }}
        >
          <Tooltip title="Attach image or file">
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              sx={{ color: '#76716A', '&:hover': { color: '#C2B5E8' } }}
            >
              <AttachFileIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.csv,.txt,.json"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <Box
            component="textarea"
            ref={textareaRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholderFor(taskType)}
            rows={1}
            sx={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'text.primary',
              fontSize: '0.86rem',
              lineHeight: 1.6,
              fontFamily: 'inherit',
              py: 0.5,
              overflowY: 'auto',
              '&::placeholder': { color: 'text.disabled' },
            }}
          />

          <IconButton
            size="small"
            onClick={() => sendMessage()}
            disabled={streaming || (!input.trim() && attachments.length === 0)}
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              background:
                streaming || (!input.trim() && attachments.length === 0)
                  ? isDark ? 'rgba(244, 240, 232, 0.06)' : 'rgba(24, 22, 15, 0.06)'
                  : 'linear-gradient(135deg, #C2B5E8 0%, #9D8DD0 100%)',
              boxShadow:
                streaming || (!input.trim() && attachments.length === 0)
                  ? 'none'
                  : '0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 4px 14px rgba(157, 141, 208, 0.32)',
              transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
              '&:not(:disabled):hover': {
                background: 'linear-gradient(135deg, #D5CBEF 0%, #C2B5E8 100%)',
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.22) inset, 0 8px 22px rgba(157, 141, 208, 0.45)',
                transform: 'translateY(-1px)',
              },
              '&:not(:disabled):active': { transform: 'translateY(0) scale(0.98)' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {streaming ? (
              <CircularProgress size={14} sx={{ color: '#76716A' }} />
            ) : (
              <SendIcon sx={{ fontSize: '0.95rem', color: streaming || (!input.trim() && attachments.length === 0) ? '#76716A' : '#0A0B0F' }} />
            )}
          </IconButton>
        </Stack>

        <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', textAlign: 'center', mt: 0.75, letterSpacing: '0.02em' }}>
          Shift + Enter for new line · Enter to send
        </Typography>
      </Box>
    </Stack>
  );
};

export default InferenceChat;
