
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ZapIcon, SparklesIcon, GemIcon } from './icons';
import { useUser } from '../UserContext';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Exchange rate: 1 AED = 25 Gems
const PACKS = [
    {
        id: 'pack_small',
        gems: 250,
        price: 10, // AED
        name: 'Starter Stash',
        popular: false,
    },
    {
        id: 'pack_medium',
        gems: 500,
        price: 20, // AED
        name: 'Fashionista Pack',
        popular: true,
    },
    {
        id: 'pack_large',
        gems: 1250,
        price: 50, // AED
        name: 'Stylist Vault',
        popular: false,
    },
    {
        id: 'pack_xl',
        gems: 2500,
        price: 100, // AED
        name: 'Agency Treasury',
        popular: false,
    }
];

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { purchaseGems, gems } = useUser();

  const handlePurchase = (amount: number) => {
    purchaseGems(amount);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8"
          >
             <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 z-10">
                <XIcon className="w-6 h-6 text-gray-500" />
            </button>

            <div className="text-center pt-10 pb-6 px-4">
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Recharge your Wallet</h2>
                <p className="text-gray-500 max-w-lg mx-auto mb-4">
                    Pay as you go. No subscriptions. <br/>
                    <span className="text-sm font-medium text-gray-700">Current Balance: {gems} Gems</span>
                </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50/50">
                {PACKS.map((pack) => (
                    <div 
                        key={pack.id} 
                        className={`relative bg-white rounded-xl p-6 border-2 flex flex-col items-center text-center transition-all hover:-translate-y-1 ${pack.popular ? 'border-gray-900 shadow-lg ring-1 ring-gray-900' : 'border-transparent shadow-sm hover:shadow-md'}`}
                    >
                        {pack.popular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                                <SparklesIcon className="w-3 h-3" /> Best Value
                            </div>
                        )}
                        
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 text-blue-600">
                            <GemIcon className="w-6 h-6" />
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1">{pack.gems} Gems</h3>
                        <p className="text-xs text-gray-500 mb-4">{pack.name}</p>
                        
                        <div className="text-2xl font-serif font-bold text-gray-900 mb-6">
                            {pack.price} <span className="text-sm font-sans font-medium text-gray-500">AED</span>
                        </div>

                        <button
                            onClick={() => handlePurchase(pack.gems)}
                            className="w-full py-2 rounded-lg font-semibold text-sm bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all shadow-sm mt-auto"
                        >
                            Buy Now
                        </button>
                    </div>
                ))}
            </div>
            
            <div className="bg-gray-100 p-4 text-center text-xs text-gray-500">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
                    <div className="flex items-center gap-1.5">
                        <ZapIcon className="w-3 h-3" /> 1 Transaction = 10 Gems
                    </div>
                    <div>
                         Secure payment via Stripe (Simulated)
                    </div>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PricingModal;
