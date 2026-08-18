import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/lib/ThemeProvider';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The dataset is generated once and never mutates, so anything already
        // fetched stays correct. Five minutes keeps navigation instant without
        // pretending the data is immutable forever.
        staleTime: 5 * 60_000,
        gcTime: 15 * 60_000,

        // One retry covers the simulated flake; more than that just makes a
        // genuine outage take longer to surface to the user.
        retry: 1,
        retryDelay: 400,

        // Refetching every time the tab regains focus is the right default for
        // live operational data and the wrong one here - it would burn a
        // second of skeletons every time someone alt-tabs back.
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // Created inside state, not at module scope: a module-level client is shared
  // across tests and would leak cached data between them.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
