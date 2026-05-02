import React, { useState } from 'react';
import API from '@/config/axios'; // Make sure this path is correct
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// --- DUMMY DATA FOR TESTING ---
//  IDs updated to match your backend logic ('basic', 'pro', 'enterprise')
const appPlans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 5,
    credits: 100,
    description: 'Perfect for exploring and trying out our basic features.',
    features: ['100 AI Generations', 'Basic Templates', 'Standard Support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    credits: 400,
    description: 'Ideal for creators who need more power and flexibility.',
    features: ['400 AI Generations', 'Premium Templates', 'Priority Support', 'No Watermark'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49,
    credits: 1000,
    description: 'For businesses needing maximum output and collaboration.',
    features: ['1000 AI Generations', 'Custom Templates', '24/7 Support', 'API Access', 'Team Seats'],
  },
];
// ------------------------------

interface Plan {
  id: string;
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
}

const Pricing = () => {
  const [plans] = useState<Plan[]>(appPlans);
  
  // Track which specific button is loading
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  //  THE STRIPE CHECKOUT LOGIC
  const handlePurchase = async (planId: string) => {
    try {
      setLoadingPlan(planId);
      
      // Hit the backend route to generate the Stripe Checkout Session
      const { data } = await API.post('/api/user/purchase-credits', { planId });
      
      if (data.paymentLink) {
        // Redirect the user's browser to the secure Stripe hosted page
        window.location.href = data.paymentLink;
      } else {
        toast.error("No payment link received.");
        setLoadingPlan(null);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to initiate checkout. Please try again.");
      setLoadingPlan(null);
    }
  };

  return (
    // Outer container with the dark purple background
    <div className="min-h-[calc(100vh-70px)] bg-[#0b0416] text-white py-20 px-6 font-sans flex flex-col items-center">
      
      {/* Header Section */}
      <div className="text-center max-w-2xl mb-16 mt-10">
        <h1 className="text-4xl md:text-5xl font-semibold mb-6 tracking-wide">
          Choose Your Plan
        </h1>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-md mx-auto">
          Start for free and scale up as you grow. Purchase credits to continue building amazing AI websites.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className="bg-[#150a29] border border-gray-800 rounded-2xl p-8 flex flex-col hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300"
          >
            <h3 className="text-2xl font-medium mb-3">{plan.name}</h3>
            <p className="text-gray-400 text-sm mb-6 min-h-[40px]">
              {plan.description}
            </p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">${plan.price}</span>
            </div>
            
            {/* UPGRADED BUTTON */}
            <button 
              onClick={() => handlePurchase(plan.id)}
              disabled={loadingPlan === plan.id}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg mb-8 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loadingPlan === plan.id ? (
                <>
                  <Loader2 className="animate-spin size-5" /> Processing...
                </>
              ) : (
                'Buy Now'
              )}
            </button>

            <div className="flex-1">
              <p className="font-medium text-gray-300 mb-4 text-sm">
                Includes {plan.credits} credits plus:
              </p>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-gray-400 text-sm">
                    {/* SVG Checkmark icon */}
                    <svg className="w-5 h-5 text-indigo-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default Pricing;