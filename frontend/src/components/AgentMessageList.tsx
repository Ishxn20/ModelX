import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CloseIcon from '@mui/icons-material/Close';
import type { Agent, AgentMessage } from '../lib/types';

interface AgentMessageListProps {
  agent: Agent | null;
  messages: AgentMessage[];
  open: boolean;
  onClose: () => void;
}

const AgentMessageList: React.FC<AgentMessageListProps> = ({ agent, messages, open, onClose }) => {
  if (!agent) return null;

  const formatTimestamp = (timestamp: number | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderLeft: `4px solid ${agent.color}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ color: agent.color, fontWeight: 600 }}>
            {agent.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {messages.length > 0 ? (
          <List sx={{ p: 0 }}>
            {messages.map((message, index) => (
              <ListItem
                key={index}
                sx={{
                  borderBottom: index < messages.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  py: 2,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, fontWeight: 500 }}
                >
                  {formatTimestamp(message.timestamp)}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    '& p': { margin: '0.5rem 0', lineHeight: 1.6, fontSize: '0.875rem' },
                    '& p:first-of-type': { marginTop: 0 },
                    '& p:last-of-type': { marginBottom: 0 },
                    '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem' },
                    '& li': { marginBottom: '0.25rem', lineHeight: 1.6 },
                    '& strong': { fontWeight: 600 },
                    '& em': { fontStyle: 'italic' },
                    '& code': {
                      backgroundColor: 'grey.100',
                      padding: '2px 6px',
                      borderRadius: 1,
                      fontSize: '0.8125rem',
                      fontFamily: 'monospace',
                    },
                    '& pre': {
                      backgroundColor: 'grey.100',
                      padding: '1rem',
                      borderRadius: 1,
                      overflow: 'auto',
                      margin: '0.5rem 0',
                    },
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                      fontWeight: 600,
                      margin: '1rem 0 0.5rem 0',
                      lineHeight: 1.4,
                    },
                    '& h1': { fontSize: '1.5rem' },
                    '& h2': { fontSize: '1.25rem' },
                    '& h3': { fontSize: '1.1rem' },
                    '& h4, & h5, & h6': { fontSize: '1rem' },
                    '& blockquote': {
                      borderLeft: '4px solid',
                      borderColor: 'grey.300',
                      paddingLeft: '1rem',
                      margin: '0.5rem 0',
                      fontStyle: 'italic',
                      color: 'text.secondary',
                    },
                    '& table': {
                      borderCollapse: 'collapse',
                      width: '100%',
                      margin: '0.5rem 0',
                    },
                    '& th, & td': {
                      border: '1px solid',
                      borderColor: 'grey.300',
                      padding: '0.5rem',
                      textAlign: 'left',
                    },
                    '& th': {
                      backgroundColor: 'grey.100',
                      fontWeight: 600,
                    },
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.message}</ReactMarkdown>
                </Box>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No messages yet
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgentMessageList;
