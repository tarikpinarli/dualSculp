/**
 * THE PAYMENT LOGIC HOOK
 * * Concept:
 * In React, a "Hook" is like a reusable brain. This file contains the 
 * "thinking" required to start a transaction.
 * * * What it abstracts away:
 * 1. Managing the "Is the modal open?" state.
 * 2. Managing the "Is it loading?" state.
 * 3. Talking to the backend to get the secure 'clientSecret' key.
 * * * Usage:
 * Any module just calls `const { startCheckout } = usePayment('module-id')` 
 * and this file handles all the dirty work.
 */
import { useState } from 'react';

interface PaymentState {
  showModal: boolean;
  clientSecret: string;
  isLoading: boolean;
}

export function usePayment(moduleId: string) {
  const [state, setState] = useState<PaymentState>({
    showModal: false,
    clientSecret: "",
    isLoading: false,
  });

  const startCheckout = async () => {
    setState(prev => ({ ...prev, showModal: true, isLoading: true }));
    try {
      const res = await fetch("https://shadow-sculpture-backend.onrender.com/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setState(prev => ({ ...prev, clientSecret: data.clientSecret, isLoading: false }));
    } catch (error) {
      alert("Server connection error.");
      setState(prev => ({ ...prev, showModal: false, isLoading: false }));
    }
  };

  const closeModal = () => setState(prev => ({ ...prev, showModal: false }));

  return {
    ...state,
    startCheckout,
    closeModal
  };
}