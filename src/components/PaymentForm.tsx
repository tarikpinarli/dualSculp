/**
 * PAYMENT FORM COMPONENT
 * * What this does:
 * This is the actual credit card form. It securely collects payment details 
 * directly through Stripe (so we never touch sensitive data).
 * * It handles the entire checkout flow:
 * 1. Displays the card input fields.
 * 2. Shows "Processing..." while talking to the bank.
 * 3. Handles errors (like "Card declined").
 * 4. On success, it tells the main app: "Payment received, you can download the file now."
 */
import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  color?: string; // <--- NEW PROP
}

export const PaymentForm = ({ onSuccess, onCancel, color = "indigo" }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          billing_details: { address: { country: 'US' } }
        }
      }
    });

    if (error) {
      setMsg(error.message || "Error");
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      setMsg("Success!");
      setTimeout(onSuccess, 1000);
    }
  };

  // Dynamic classes for the button
  const btnColor = color === 'purple' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' 
                 : color === 'cyan' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
                 : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20';

  return (
    <form onSubmit={handleSubmit} className="mt-4 w-full">
      <PaymentElement 
        options={{
            layout: "tabs",
            fields: { billingDetails: { address: 'auto' } }
        }}
      />
      
      {msg && <div className="text-red-400 mt-2 text-sm text-center">{msg}</div>}
      
      <div className="flex gap-3 mt-6">
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button 
          disabled={isLoading} 
          className={`flex-1 py-3 text-white rounded-lg text-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${btnColor}`}
        >
          {isLoading ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </form>
  );
};