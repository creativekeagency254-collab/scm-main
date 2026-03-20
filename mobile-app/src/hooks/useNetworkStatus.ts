import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let seenOffline = false;
    const unsub = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected && !!state.isInternetReachable;
      if (!connected) {
        seenOffline = true;
        setOnline(false);
        setReconnecting(true);
        return;
      }
      setOnline(true);
      if (seenOffline) {
        setReconnecting(false);
      }
    });
    return () => unsub();
  }, []);

  return { online, reconnecting };
}
