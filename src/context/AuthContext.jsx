import { useCallback, useEffect, useMemo, useState } from "react";
import * as authClient from "../api/authClient.js";
import { fetchTransactions, importTransactions } from "../api/transactionsClient.js";
import { clearLegacyFinanceStorage, collectLegacyTransactions } from "../utils/legacyImport.js";
import { AuthContext } from "./authContext.js";

async function maybeImportLegacyData() {
  const legacy = collectLegacyTransactions();
  if (legacy.length === 0) return;

  try {
    const existing = await fetchTransactions();
    if (existing.length > 0) return;
    await importTransactions(legacy);
    clearLegacyFinanceStorage();
  } catch {
    // Keep legacy data if import fails (e.g. account already has rows).
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await authClient.getMe();
      setUser(data.user);
      await maybeImportLegacyData();
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await authClient.getMe();
        if (cancelled) return;
        setUser(data.user);
        await maybeImportLegacyData();
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authClient.login(credentials);
    setUser(data.user);
    await maybeImportLegacyData();
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await authClient.signup(payload);
    setUser(data.user);
    await maybeImportLegacyData();
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refreshSession }),
    [user, loading, login, signup, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
