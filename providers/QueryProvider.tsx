import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

/**
 * TanStack Query is wired here with no queries defined yet — per
 * docs/implementation/07-state-management.md it is used only for Firebase
 * requests, content updates, and purchase synchronization, none of which
 * exist in Phase 1. Query/mutation functions will call Repository methods
 * once those exist (01-project-architecture.md#repositories-layer).
 */
const queryClient = new QueryClient();

export function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
