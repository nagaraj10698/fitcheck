
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ZapIcon, SparklesIcon, GemIcon, CopyIcon } from './icons';
import { useUser } from '../UserContext';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user, gems, redeemReferral } = useUser();
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralStatus, setReferralStatus] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
      if (user?.referralCode) {
          navigator.clipboard.writeText(user.referralCode);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const handleRedeem = () => {
      if (!referralCodeInput.trim()) return;
      const result = redeemReferral(referralCodeInput);
      setReferralStatus({
          message: result.message,
          type: result.success ? 'success' : 'error'
      });
      if (result.success) setReferralCodeInput('');
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
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8"
          >
             <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 z-10">
                <XIcon className="w-6 h-6 text-gray-500" />
            </button>

            <div className="text-center pt-10 pb-6 px-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                     <GemIcon className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Earn Free Gems</h2>
                {user ? (
                     <p className="text-gray-500 max-w-lg mx-auto mb-4">
                        Current Balance: <span className="font-bold text-gray-900">{gems} Gems</span>
                    </p>
                ) : (
                    <p className="text-gray-500 max-w-lg mx-auto mb-4">
                        Sign in to start earning gems by inviting friends.
                    </p>
                )}
            </div>

            {user ? (
                <div className="p-6 pt-0">
                    <div className="flex flex-col gap-6">
                        {/* My Code */}
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <SparklesIcon className="w-5 h-5 text-purple-600" />
                                <h3 className="font-serif font-bold text-gray-900 text-lg">Invite & Earn</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                                Share your unique code. You get <span className="font-bold text-purple-700">25 Gems</span>, and your friend gets <span className="font-bold text-purple-700">50 Gems</span> when they sign up or redeem it.
                            </p>
                            
                            <div className="flex items-center gap-2 max-w-sm mx-auto">
                                <div className="flex-grow bg-white border border-purple-200 rounded-lg px-4 py-3 font-mono text-lg font-bold text-gray-800 tracking-widest text-center select-all shadow-sm">
                                    {user.referralCode || '...'}
                                </div>
                                <button 
                                    onClick={handleCopyCode}
                                    className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:scale-95 transition-all shadow-md"
                                    title="Copy Code"
                                >
                                    {copied ? <span className="text-xs font-bold px-1">Copied</span> : <CopyIcon className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>

                        {/* Redeem Code */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                             <div className="flex items-center gap-2 mb-2">
                                <GemIcon className="w-5 h-5 text-gray-700" />
                                <h3 className="font-serif font-bold text-gray-900">Have a Referral Code?</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                Enter a code from a friend to instantly get <span className="font-bold text-gray-900">50 Gems</span>.
                            </p>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={referralCodeInput}
                                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                                    placeholder="ENTER CODE"
                                    maxLength={8}
                                    disabled={!!user.redeemedReferral}
                                    className="flex-grow uppercase px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none font-mono disabled:bg-gray-100 disabled:text-gray-400"
                                />
                                <button 
                                    onClick={handleRedeem}
                                    disabled={!referralCodeInput || !!user.redeemedReferral}
                                    className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    {user.redeemedReferral ? 'Redeemed' : 'Claim'}
                                </button>
                            </div>
                            {referralStatus && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mt-3 p-3 rounded-lg text-sm font-medium ${referralStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                                >
                                    {referralStatus.message}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center">
                    <p className="text-gray-600 mb-6">
                        Create an account or sign in to access the referral program and get free gems to start your style journey.
                    </p>
                    <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-500">
                        Please use the "Sign In" button in the header to get started.
                    </div>
                </div>
            )}
            
            <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
                 <div className="flex items-center justify-center gap-2">
                    <ZapIcon className="w-3 h-3" /> 
                    <span>1 Generation = 10 Gems</span>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PricingModal;
