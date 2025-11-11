// src/hedera/useHashPack.ts
import { useCallback, useEffect, useState } from "react";
import {
  initHashConnect,
  onHashconnectChange,
  openPairingModal,
  disconnectHashconnect,
  getPairedAccountId,
} from "./hashconnectClient";

type Status = "idle" | "ready" | "connecting" | "connected";

export function useHashPack() {
  const [status, setStatus] = useState<Status>("idle");
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initHashConnect(); // sets up + extension auto-detect
        if (!mounted) return;
        setStatus(getPairedAccountId() ? "connected" : "ready");
        setAccountId(getPairedAccountId());
      } catch {
        setStatus("ready");
      }
    })();

    const off = onHashconnectChange(({ connected, accountId }) => {
      setStatus(connected ? "connected" : "ready");
      setAccountId(accountId);
    });

    return () => {
      mounted = false;
      off();
    };
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    await initHashConnect();
    // Show HC modal (or extension prompt). DO NOT call connect()/connectToLocalWallet() here.
    openPairingModal("dark");
    // status updates via events
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectHashconnect();
    setStatus("ready");
    setAccountId(null);
  }, []);

  return { status, accountId, connect, disconnect };
}
