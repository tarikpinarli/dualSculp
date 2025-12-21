import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin, // Safety requirement
      },
      redirect: "if_required",
    });

    if (error) {
      setMsg(error.message || "Payment Failed");
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      setMsg("Payment Successful!");
      setTimeout(() => {
        onSuccess();
        setIsLoading(false);
      }, 1000);
    } else {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      
      {/* 👇 THE FIX IS HERE:
         Changed 'never' to 'auto'. 
         This keeps the Zip Code field (Required) but hides the full address form.
      */}
      <PaymentElement 
        options={{
            layout: "tabs",
            fields: {
                billingDetails: {
                    address: 'auto' 
                }
            }
        }} 
      />

      {/* Message Display */}
      {msg && (
        <div className={`mt-4 p-3 rounded text-[10px] font-mono flex items-center gap-2 ${msg.includes("Success") ? "bg-green-900/30 text-green-400 border border-green-500/30" : "bg-red-900/30 text-red-400 border border-red-500/30"}`}>
            {msg.includes("Success") ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
            {msg}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-all"
        >
          Cancel
        </button>
        
        <button
          disabled={isLoading || !stripe || !elements}
          type="submit"
          className="flex-1 py-3 bg-white text-black hover:bg-purple-200 border border-transparent rounded-sm text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" size={14}/> : <Lock size={12}/>}
          {isLoading ? "Processing..." : "Pay Now"}
        </button>
      </div>
      
    </form>
  );
};