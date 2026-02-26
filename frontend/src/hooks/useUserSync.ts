import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useUser } from '../context/UserContext';

// ── useUserSync ──────────────────────────────────────────────────────────────
// Watches wagmi's useAccount and automatically syncs wallet state to the
// backend and UserContext.
//
// - When a wallet connects → calls connectUser(address)
// - When a wallet disconnects → calls disconnectUser()
//
// Mount this once at the top of the app (inside App.tsx or a layout component)
// so it runs for the lifetime of the session.

export function useUserSync() {
  const { address, isConnected } = useAccount();
  const { connectUser, disconnectUser } = useUser();

  // Track the last address we synced to avoid duplicate calls
  // if wagmi re-renders without the address actually changing
  const lastSyncedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      // Only call connectUser if the address actually changed
      if (lastSyncedAddress.current === address) return;

      lastSyncedAddress.current = address;
      connectUser(address);
    } else {
      // Wallet disconnected — clear user state and reset ref
      if (lastSyncedAddress.current !== null) {
        lastSyncedAddress.current = null;
        disconnectUser();
      }
    }
  }, [isConnected, address, connectUser, disconnectUser]);
}