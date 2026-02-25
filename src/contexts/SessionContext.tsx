import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { ScanResult } from "@/lib/api";
import type { MappingConfig } from "@/pages/MappingPage";

interface SessionState {
  guildId: string;
  guildInfo: { name: string; icon: string | null; member_count?: number } | null;
  stoatToken: string;
  stoatUsername: string;
  scanData: ScanResult | null;
  mappingData: MappingConfig | null;
  stoatServerId: string;
  transferResult: any | null;
}

interface SessionContextType extends SessionState {
  setGuildId: (id: string) => void;
  setGuildInfo: (info: SessionState["guildInfo"]) => void;
  setStoatToken: (token: string) => void;
  setStoatUsername: (username: string) => void;
  setScanData: (data: ScanResult | null) => void;
  setMappingData: (data: MappingConfig | null) => void;
  setStoatServerId: (id: string) => void;
  setTransferResult: (result: any) => void;
  reset: () => void;
}

const initialState: SessionState = {
  guildId: "",
  guildInfo: null,
  stoatToken: "",
  stoatUsername: "",
  scanData: null,
  mappingData: null,
  stoatServerId: "",
  transferResult: null,
};

const SessionContext = createContext<SessionContextType>({
  ...initialState,
  setGuildId: () => {},
  setGuildInfo: () => {},
  setStoatToken: () => {},
  setStoatUsername: () => {},
  setScanData: () => {},
  setMappingData: () => {},
  setStoatServerId: () => {},
  setTransferResult: () => {},
  reset: () => {},
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SessionState>(initialState);

  const setGuildId = useCallback((guildId: string) => setState((s) => ({ ...s, guildId })), []);
  const setGuildInfo = useCallback((guildInfo: SessionState["guildInfo"]) => setState((s) => ({ ...s, guildInfo })), []);
  const setStoatToken = useCallback((stoatToken: string) => setState((s) => ({ ...s, stoatToken })), []);
  const setStoatUsername = useCallback((stoatUsername: string) => setState((s) => ({ ...s, stoatUsername })), []);
  const setScanData = useCallback((scanData: ScanResult | null) => setState((s) => ({ ...s, scanData })), []);
  const setMappingData = useCallback((mappingData: MappingConfig | null) => setState((s) => ({ ...s, mappingData })), []);
  const setStoatServerId = useCallback((stoatServerId: string) => setState((s) => ({ ...s, stoatServerId })), []);
  const setTransferResult = useCallback((transferResult: any) => setState((s) => ({ ...s, transferResult })), []);
  const reset = useCallback(() => setState(initialState), []);

  return (
    <SessionContext.Provider
      value={{
        ...state,
        setGuildId,
        setGuildInfo,
        setStoatToken,
        setStoatUsername,
        setScanData,
        setMappingData,
        setStoatServerId,
        setTransferResult,
        reset,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
