import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

export const PaymentForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

// src/components/PaymentForm.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!stripe || !elements) return;
  setIsLoading(true);

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    redirect: "if_required",
    confirmParams: {
      // FIX: When address element is hidden, we MUST provide a country
      payment_method_data: {
        billing_details: {
          address: {
            country: 'US', // Or your default country code
          }
        }
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

  return (
    <form onSubmit={handleSubmit} className="mt-4 w-full">
      {/* UPDATED: Added 'options' to hide address fields 
         and force a cleaner layout 
      */}
      <PaymentElement 
        options={{
            layout: "tabs",
            fields: {
                billingDetails: {
                    address: 'auto' // This removes Country, Zip, and Address lines
                }
            }
        }}
      />
      
      {msg && <div className="text-red-400 mt-2 text-sm text-center">{msg}</div>}
      
      <div className="flex gap-3 mt-6">
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button 
          disabled={isLoading} 
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Pay $0.99"}
        </button>
      </div>
    </form>
  );
};