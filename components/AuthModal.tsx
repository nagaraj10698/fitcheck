
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ShirtIcon, GoogleIcon, CopyIcon } from './icons';
import { useUser } from '../UserContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, signup } = useUser();
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
      // Get the hostname (e.g. "abc.com") without protocol or path
      // We avoid fallbacks to hardcoded values to prevent user confusion.
      let domain = window.location.hostname;
      
      // If hostname is empty, try host
      if (!domain) {
          domain = window.location.host;
      }

      setCurrentDomain(domain || "fitcheck-21ffc.web.app");
  }, []);

  const resetForm = () => {
      setEmail('');
      setPassword('');
      setName('');
      setReferralCode('');
      setError(null);
  };

  const handleModeSwitch = () => {
      setIsSignUp(!isSignUp);
      resetForm();
  };

  const getFriendlyAuthError = (errorMessage: string) => {
      const msg = errorMessage.toLowerCase();
      const actualDomain = window.location.hostname || window.location.host || 'this domain';
      
      if (msg.includes('auth/unauthorized-domain')) {
          return `Domain Not Authorized: ${actualDomain}
          
          You must whitelist this exact domain in Firebase Console to use Google Sign-In.
          
          1. Copy the domain shown below or at the bottom of this modal.
          2. Go to Firebase Console > Authentication > Settings > Authorized Domains
          3. Click "Add Domain" and paste it (do NOT include https://).`;
      }

      if (msg.includes('auth/popup-closed-by-user')) return "Sign-in cancelled.";
      if (msg.includes('auth/email-already-in-use')) return "Email already registered. Try signing in.";
      if (msg.includes('auth/weak-password')) return "Password is too weak (min 6 chars).";
      if (msg.includes('auth/invalid-credential') || msg.includes('wrong-password')) return "Incorrect email or password.";
      if (msg.includes('auth/user-not-found')) return "Account not found. Please sign up.";
      if (msg.includes('auth/network-request-failed')) return "Network error. Check your connection.";
      
      // Fallback cleanup
      return errorMessage.replace('Firebase: ', '').replace('auth/', '').replace(/-/g, ' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        if (isSignUp) {
            await signup(email, password, name, referralCode);
        } else {
            await login(email, password);
        }
        onClose();
        resetForm();
    } catch (err: any) {
        const rawMsg = err.message || err.code || 'Authentication failed';
        setError(getFriendlyAuthError(rawMsg));
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
        // We pass empty string for email as it's ignored for Google Auth path in UserContext
        await login('', undefined, { isGoogle: true });
        onClose();
    } catch (err: any) {
        console.error("Google Sign In Error:", err);
        const rawMsg = err.code || err.message || 'Google sign-in failed';
        setError(getFriendlyAuthError(rawMsg));
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopyDomain = () => {
      navigator.clipboard.writeText(currentDomain);
      alert(`Copied: ${currentDomain}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute top-4 right-4">
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <ShirtIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-gray-500 text-sm mb-6 text-center">
                    {isSignUp ? 'Sign up to start your style journey.' : 'Sign in to access your wardrobe.'}
                </p>

                {error && (
                    <div className="w-full bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg mb-4 break-words font-medium whitespace-pre-wrap select-text">
                        {error}
                    </div>
                )}

                <div className="w-full space-y-4">
                    <button 
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-4 w-full">
                        <div className="h-px bg-gray-200 flex-grow"></div>
                        <span className="text-xs text-gray-400 font-medium uppercase">or</span>
                        <div className="h-px bg-gray-200 flex-grow"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-3">
                        {isSignUp && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm"
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm"
                                disabled={isLoading}
                            />
                        </div>

                        {isSignUp && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Referral Code <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                                <input 
                                    type="text" 
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                    placeholder="FRIEND123"
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm uppercase placeholder:normal-case"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading || !email || !password || (isSignUp && !name)}
                            className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-sm shadow-md hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 w-full text-center">
                    <p className="text-sm text-gray-600">
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}
                        <button 
                            onClick={handleModeSwitch} 
                            className="ml-2 font-bold text-gray-900 hover:underline"
                            disabled={isLoading}
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>

                {/* Domain Helper for Developer Debugging */}
                <div className="mt-4 pt-4 border-t border-gray-100 w-full text-center bg-gray-50 p-2 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                        Setup Info (For Firebase Console)
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <code className="bg-white px-2 py-1 rounded border border-gray-200 text-xs text-gray-700 select-all font-mono break-all">
                            {currentDomain}
                        </code>
                        <button onClick={handleCopyDomain} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Copy Domain">
                            <CopyIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                        Add this to Auth {'>'} Settings {'>'} Authorized Domains
                    </p>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
