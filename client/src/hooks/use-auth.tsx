import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicPlayer } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

type AuthContextValue = {
  user: PublicPlayer | null;
  authenticated: boolean;
  isLoading: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authenticated: false,
  isLoading: true,
  refetch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const authQuery = useQuery({
    queryKey: ["/api/me"],
    queryFn: getQueryFn<{ authenticated: boolean; player: PublicPlayer }>({
      on401: "returnNull",
    }),
    retry: false,
  });

  const authenticated = Boolean(authQuery.data?.authenticated);
  const user = authenticated ? authQuery.data!.player : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated,
        isLoading: authQuery.isLoading,
        refetch: authQuery.refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
