import React from 'react';
import { Card, CardContent, Skeleton, Grid, Box } from '@mui/material';

const SKELETON_AGENT_COUNT = 8;

export const AgentCardSkeleton: React.FC = () => {
  return (
    <Card sx={{ minHeight: 180 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width="60%" height={30} />
          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 3 }} />
        </Box>
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="40%" sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
};

export const AgentGridSkeleton: React.FC = () => {
  return (
    <Grid container spacing={2}>
      {[...Array(SKELETON_AGENT_COUNT)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <AgentCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
};

export const FormSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: 4 }}>
      <Skeleton variant="text" width="40%" height={40} sx={{ mb: 3 }} />
      <Skeleton variant="text" width="100%" sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1 }} />
    </Box>
  );
};
