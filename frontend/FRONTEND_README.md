# ModelX Frontend Notes

The active frontend is a guided ML planning workspace, not a landing page.

Key files:

- `src/App.tsx`: switches between intake and live plan views.
- `src/components/InputFormEnhanced.tsx`: ModelX project intake form.
- `src/components/DebateViewer.tsx`: live agent progress and activity feed.
- `src/components/MLBlueprintPanel.tsx`: final blueprint renderer and text export.
- `src/lib/simulation.ts`: local demo flow using ModelX phases.
- `src/hooks/useSSE.ts`: live backend event stream.

The frontend expects the final backend event type to be `blueprint`.
