import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

export const PaymentForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
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
    <form onSubmit={handleSubmit} className="mt-4">
      <PaymentElement />
      {msg && <div className="text-red-400 mt-2 text-sm">{msg}</div>}
      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onCancel} className="flex-1 py-2 bg-slate-700 rounded text-sm">Cancel</button>
        <button disabled={isLoading} className="flex-1 py-2 bg-indigo-600 rounded text-sm font-bold">
          {isLoading ? "Processing..." : "Pay $0.99"}
        </button>
      </div>
    </form>
  );
};