import { useState, useEffect } from 'react';

/**
 * CHIGARI RIDE - DEMO WALLET SERVICE
 * In-memory / Session state only.
 * Initial Balance: ₹100.00 (Demo money for university prototype).
 * Automatically resets to ₹100.00 when the app process is closed and reopened.
 * NOT stored in AsyncStorage, database, or persistent storage.
 */

export const INITIAL_DEMO_BALANCE = 100.0;

// In-memory session state
let sessionBalance: number = INITIAL_DEMO_BALANCE;

// Subscription listeners for instant reactive updates across screens
type WalletListener = (balance: number) => void;
const listeners = new Set<WalletListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(sessionBalance);
    } catch {
      // ignore subscriber error
    }
  });
}

/**
 * Synchronously get the current in-memory demo wallet balance
 */
export function getBalance(): number {
  return sessionBalance;
}

/**
 * Async getter for backwards compatibility with any async callers
 */
export async function getWalletBalance(): Promise<number> {
  return sessionBalance;
}

/**
 * Check whether the wallet has enough balance for a given amount
 */
export function hasSufficientBalance(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return false;
  }
  return sessionBalance >= amount;
}

export interface WalletTransactionResult {
  success: boolean;
  balance: number;
  error?: string;
}

/**
 * Deduct an amount from the wallet.
 * Prevents negative balance and returns clear error information if insufficient funds.
 */
export function deductBalance(amount: number): WalletTransactionResult {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return {
      success: false,
      balance: sessionBalance,
      error: 'Invalid deduction amount.',
    };
  }

  if (sessionBalance < amount) {
    return {
      success: false,
      balance: sessionBalance,
      error: `Insufficient wallet balance\nWallet Balance: ₹${sessionBalance.toFixed(2)}\nTicket Price: ₹${amount.toFixed(2)}`,
    };
  }

  sessionBalance = Math.round((sessionBalance - amount) * 100) / 100;
  notifyListeners();

  return {
    success: true,
    balance: sessionBalance,
  };
}

/**
 * Async deduction helper for compatibility with existing code
 */
export async function deductWalletBalance(amount: number): Promise<number> {
  const result = deductBalance(amount);
  return result.balance;
}

/**
 * Add / Top-up demo balance during the active session
 */
export function addBalance(amount: number): number {
  if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
    sessionBalance = Math.round((sessionBalance + amount) * 100) / 100;
    notifyListeners();
  }
  return sessionBalance;
}

export async function topUpWalletBalance(amount: number): Promise<number> {
  return addBalance(amount);
}

/**
 * Reset the wallet balance back to the initial demo balance (₹100.00)
 */
export function resetWalletBalance(): number {
  sessionBalance = INITIAL_DEMO_BALANCE;
  notifyListeners();
  return sessionBalance;
}

/**
 * Subscribe to wallet balance changes.
 * Returns an unsubscribe callback.
 */
export function subscribeWallet(listener: WalletListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * React hook to consume live wallet balance in any component.
 * Automatically stays synchronized across all screens during the session.
 */
export function useWallet() {
  const [balance, setBalance] = useState<number>(sessionBalance);

  useEffect(() => {
    // Initial sync
    setBalance(sessionBalance);
    // Listen for changes
    const unsubscribe = subscribeWallet((newBal) => {
      setBalance(newBal);
    });
    return unsubscribe;
  }, []);

  return {
    balance,
    formattedBalance: `₹${balance.toFixed(2)}`,
    hasSufficientBalance,
    deductBalance,
    addBalance,
    resetWalletBalance,
  };
}
