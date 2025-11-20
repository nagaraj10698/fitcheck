
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, WardrobeItem, Transaction, SavedOutfit } from './types';
import { defaultWardrobe } from './wardrobe';

interface UserContextType {
  user: User | null;
  gems: number;
  globalWardrobe: WardrobeItem[];
  login: (email: string, password?: string, options?: { name?: string, avatarUrl?: string, isGoogle?: boolean }) => Promise<void>;
  signup: (email: string, password: string, name: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  deductGems: (amount: number, description?: string) => boolean;
  purchaseGems: (amount: number) => void;
  // Admin capabilities
  allUsers: User[];
  transactions: Transaction[];
  createUser: (userData: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  updateUserGems: (userId: string, newAmount: number) => void;
  adminAdjustGems: (userId: string, adjustment: number, description: string) => void;
  addGlobalGarment: (item: WardrobeItem) => void;
  removeGlobalGarment: (itemId: string) => void;
  redeemReferral: (code: string) => { success: boolean; message: string };
  saveOutfit: (outfit: SavedOutfit) => void;
  deleteSavedOutfit: (outfitId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [globalWardrobe, setGlobalWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Initialization
  useEffect(() => {
    // Load Global Wardrobe
    const storedWardrobe = localStorage.getItem('saas_global_wardrobe');
    if (storedWardrobe) {
      setGlobalWardrobe(JSON.parse(storedWardrobe));
    }

    // Load Users DB
    const storedUsersDB = localStorage.getItem('saas_users_db');
    const usersDB: User[] = storedUsersDB ? JSON.parse(storedUsersDB) : [];
    setAllUsers(usersDB);

    // Load Transactions DB
    const storedTransactions = localStorage.getItem('saas_transactions_db');
    if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
    }

    // Restore current session
    const storedUserEmail = localStorage.getItem('saas_current_user_email');
    if (storedUserEmail) {
      let foundUser = usersDB.find(u => u.email === storedUserEmail);
      if (foundUser) {
        // Backfill referral code if missing for legacy users
        if (!foundUser.referralCode) {
             foundUser = {
                 ...foundUser,
                 referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                 redeemedReferral: false
             };
        }
        // Backfill savedOutfits
        if (!foundUser.savedOutfits) {
            foundUser = {
                ...foundUser,
                savedOutfits: []
            };
        }
        // Update in DB if we modified it
        if (JSON.stringify(foundUser) !== JSON.stringify(usersDB.find(u => u.email === storedUserEmail))) {
             const updatedDB = usersDB.map(u => u.id === foundUser!.id ? foundUser! : u);
             setAllUsers(updatedDB);
             localStorage.setItem('saas_users_db', JSON.stringify(updatedDB));
        }

        setUser(foundUser);
      } else {
        logout();
      }
    }
  }, []);

  const saveUsersDB = (users: User[]) => {
    setAllUsers(users);
    localStorage.setItem('saas_users_db', JSON.stringify(users));
  };

  const logTransaction = (
    targetUser: User, 
    type: 'credit' | 'debit', 
    amount: number, 
    description: string
  ) => {
    const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        type,
        amount,
        description,
        timestamp: Date.now()
    };
    
    setTransactions(prev => {
        const updated = [newTx, ...prev];
        localStorage.setItem('saas_transactions_db', JSON.stringify(updated));
        return updated;
    });
  };

  const login = async (email: string, password?: string, options?: { name?: string, avatarUrl?: string, isGoogle?: boolean }) => {
    const usersDB = [...allUsers];
    let existingUser = usersDB.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Google Sign In Flow (Auto-create if missing, no password check)
    if (options?.isGoogle) {
        if (!existingUser) {
            const role = email.toLowerCase() === 'admin@fitcheck.com' ? 'admin' : 'user';
            existingUser = { 
                id: `user-${Date.now()}`, 
                name: options.name || email.split('@')[0], 
                email, 
                role, 
                gems: 50, // Starter gems
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                redeemedReferral: false,
                avatarUrl: options.avatarUrl,
                savedOutfits: []
            };
            usersDB.push(existingUser);
            saveUsersDB(usersDB);
            logTransaction(existingUser, 'credit', 50, 'Welcome Bonus');
        } else {
             // Update Google Profile info
             if (options.avatarUrl && !existingUser.avatarUrl) {
                existingUser = { ...existingUser, avatarUrl: options.avatarUrl };
                if (options.name) existingUser.name = options.name;
                const updatedDB = usersDB.map(u => u.id === existingUser!.id ? existingUser! : u);
                saveUsersDB(updatedDB);
            }
        }
    } else {
        // Email/Password Flow
        if (!existingUser) {
            throw new Error('Account not found. Please sign up.');
        }
        // Prevent logging in with email/password if account was created via Google (no password set)
        if (!existingUser.password) {
             throw new Error('This account uses Google Sign In. Please sign in with Google.');
        }
        if (existingUser.password !== password) {
            throw new Error('Invalid password.');
        }
    }

    // Legacy backfill if needed
    let modified = false;
    if (existingUser && !existingUser.referralCode) {
        existingUser = {
            ...existingUser,
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            redeemedReferral: false
        };
        modified = true;
    }
    if (existingUser && !existingUser.savedOutfits) {
        existingUser = { ...existingUser, savedOutfits: [] };
        modified = true;
    }

    if (modified) {
        const updatedDB = usersDB.map(u => u.id === existingUser!.id ? existingUser! : u);
        saveUsersDB(updatedDB);
    }

    if (existingUser) {
        setUser(existingUser);
        localStorage.setItem('saas_current_user_email', existingUser.email);
    }
  };

  const signup = async (email: string, password: string, name: string, referralCode?: string) => {
      const usersDB = [...allUsers];
      if (usersDB.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error('User with this email already exists.');
      }

      // Handle Referral
      let referrer: User | undefined;
      let startGems = 50; // Standard Welcome Bonus
      const REFERRER_BONUS = 25;
      const NEW_USER_REFERRAL_BONUS = 50;
      let redeemed = false;

      // Validate and process referral code
      if (referralCode && referralCode.trim()) {
          const normalizedCode = referralCode.trim().toUpperCase();
          referrer = usersDB.find(u => u.referralCode === normalizedCode);
          if (referrer) {
              redeemed = true;
              // Add the referral bonus to the start gems for the new user
              startGems += NEW_USER_REFERRAL_BONUS;
          }
      }

      const role = email.toLowerCase() === 'admin@fitcheck.com' ? 'admin' : 'user';
      const newUser: User = {
          id: `user-${Date.now()}`,
          name: name || email.split('@')[0],
          email,
          password, // Store password
          role,
          gems: startGems,
          referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          redeemedReferral: redeemed,
          savedOutfits: []
      };

      usersDB.push(newUser);

      // Credit Referrer if exists
      if (referrer) {
          const updatedReferrer = { ...referrer, gems: referrer.gems + REFERRER_BONUS };
          // Update referrer in DB array
          const refIndex = usersDB.findIndex(u => u.id === referrer!.id);
          if (refIndex !== -1) {
              usersDB[refIndex] = updatedReferrer;
          }
          // Defer logging transaction until after save to keep it clean
          setTimeout(() => {
              logTransaction(updatedReferrer, 'credit', REFERRER_BONUS, `Referral Bonus (Invited ${newUser.name})`);
          }, 0);
      }

      saveUsersDB(usersDB);
      
      // Log transactions for new user
      logTransaction(newUser, 'credit', 50, 'Welcome Bonus');
      if (redeemed) {
         logTransaction(newUser, 'credit', NEW_USER_REFERRAL_BONUS, 'Referral Bonus (Redeemed Code)');
      }
      
      setUser(newUser);
      localStorage.setItem('saas_current_user_email', newUser.email);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('saas_current_user_email');
  };

  const deductGems = (amount: number, description: string = 'Service Usage'): boolean => {
    if (!user) return false;
    if (user.gems >= amount) {
      const updatedUser = { ...user, gems: user.gems - amount };
      setUser(updatedUser);
      
      // Update in DB
      const updatedDB = allUsers.map(u => u.id === user.id ? updatedUser : u);
      saveUsersDB(updatedDB);
      
      // Log
      logTransaction(user, 'debit', amount, description);
      return true;
    }
    return false;
  };

  const purchaseGems = (amount: number) => {
    if (!user) return;
    const updatedUser = { ...user, gems: user.gems + amount };
    setUser(updatedUser);
    
    const updatedDB = allUsers.map(u => u.id === user.id ? updatedUser : u);
    saveUsersDB(updatedDB);

    // Log
    logTransaction(user, 'credit', amount, 'Wallet Top-up');
  };

  // --- Referral Functionality ---
  const redeemReferral = (code: string): { success: boolean; message: string } => {
    if (!user) return { success: false, message: 'Please sign in to redeem codes.' };
    if (user.redeemedReferral) return { success: false, message: 'You have already redeemed a referral code.' };
    
    const normalizedCode = code.trim().toUpperCase();
    if (user.referralCode === normalizedCode) return { success: false, message: 'You cannot use your own referral code.' };

    const referrer = allUsers.find(u => u.referralCode === normalizedCode);
    if (!referrer) return { success: false, message: 'Invalid referral code.' };

    const REFERRER_BONUS = 25;
    const USER_BONUS = 50; 
    
    // Update both users in DB
    const updatedUsers = allUsers.map(u => {
        if (u.id === referrer.id) {
            return { ...u, gems: u.gems + REFERRER_BONUS };
        }
        if (u.id === user.id) {
            return { ...u, gems: u.gems + USER_BONUS, redeemedReferral: true };
        }
        return u;
    });

    setAllUsers(updatedUsers);
    saveUsersDB(updatedUsers);

    // Update current user state
    const updatedCurrentUser = updatedUsers.find(u => u.id === user.id);
    if (updatedCurrentUser) setUser(updatedCurrentUser);

    // Log transactions
    logTransaction(referrer, 'credit', REFERRER_BONUS, `Referral Bonus (Invited ${user.name})`);
    logTransaction(updatedCurrentUser!, 'credit', USER_BONUS, `Referral Bonus (Used code ${normalizedCode})`);

    return { success: true, message: `Success! You earned ${USER_BONUS} Gems and your friend got ${REFERRER_BONUS} Gems.` };
  };

  // --- Saved Outfit Functionality ---
  const saveOutfit = (outfit: SavedOutfit) => {
      if (!user) return;
      const saved = user.savedOutfits || [];
      const updatedUser = { ...user, savedOutfits: [outfit, ...saved] };
      
      setUser(updatedUser);
      const updatedDB = allUsers.map(u => u.id === user.id ? updatedUser : u);
      saveUsersDB(updatedDB);
  };

  const deleteSavedOutfit = (outfitId: string) => {
      if (!user || !user.savedOutfits) return;
      const updatedOutfits = user.savedOutfits.filter(o => o.id !== outfitId);
      const updatedUser = { ...user, savedOutfits: updatedOutfits };

      setUser(updatedUser);
      const updatedDB = allUsers.map(u => u.id === user.id ? updatedUser : u);
      saveUsersDB(updatedDB);
  };

  // --- Admin Functions ---

  const createUser = (userData: Omit<User, 'id'>) => {
    const usersDB = [...allUsers];
    if (usersDB.some(u => u.email === userData.email)) {
        throw new Error('User with this email already exists');
    }
    const newUser: User = {
        ...userData,
        id: `user-${Date.now()}`,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        redeemedReferral: false,
        savedOutfits: []
    };
    usersDB.push(newUser);
    saveUsersDB(usersDB);
    logTransaction(newUser, 'credit', newUser.gems, 'Account Created by Admin');
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    const updatedDB = allUsers.map(u => {
        if (u.id === userId) {
            const updated = { ...u, ...updates };
            if (user && user.id === userId) setUser(updated);
            return updated;
        }
        return u;
    });
    saveUsersDB(updatedDB);
  };

  const deleteUser = (userId: string) => {
    const updatedDB = allUsers.filter(u => u.id !== userId);
    saveUsersDB(updatedDB);
    if (user && user.id === userId) logout();
  };

  const updateUserGems = (userId: string, newAmount: number) => {
    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) return;

    const diff = newAmount - targetUser.gems;
    if (diff === 0) return;

    const updatedDB = allUsers.map(u => {
        if (u.id === userId) {
            const updated = { ...u, gems: newAmount };
            if (user && user.id === userId) setUser(updated);
            return updated;
        }
        return u;
    });
    saveUsersDB(updatedDB);

    // Log
    const type = diff > 0 ? 'credit' : 'debit';
    logTransaction(targetUser, type, Math.abs(diff), 'Admin Adjustment (Set Balance)');
  };

  const adminAdjustGems = (userId: string, adjustment: number, description: string) => {
    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) return;
    
    // Prevent negative balance
    const newBalance = Math.max(0, targetUser.gems + adjustment);
    
    const updatedDB = allUsers.map(u => {
        if (u.id === userId) {
            const updated = { ...u, gems: newBalance };
            if (user && user.id === userId) setUser(updated);
            return updated;
        }
        return u;
    });
    saveUsersDB(updatedDB);

    const type = adjustment >= 0 ? 'credit' : 'debit';
    logTransaction(targetUser, type, Math.abs(adjustment), description || 'Admin Adjustment');
  };

  const addGlobalGarment = (item: WardrobeItem) => {
    const newWardrobe = [...globalWardrobe, item];
    setGlobalWardrobe(newWardrobe);
    localStorage.setItem('saas_global_wardrobe', JSON.stringify(newWardrobe));
  };

  const removeGlobalGarment = (itemId: string) => {
    const newWardrobe = globalWardrobe.filter(item => item.id !== itemId);
    setGlobalWardrobe(newWardrobe);
    localStorage.setItem('saas_global_wardrobe', JSON.stringify(newWardrobe));
  };

  return (
    <UserContext.Provider value={{ 
        user, 
        gems: user?.gems || 0, 
        globalWardrobe,
        login,
        signup,
        logout, 
        deductGems, 
        purchaseGems,
        allUsers,
        transactions,
        createUser,
        updateUser,
        deleteUser,
        updateUserGems,
        adminAdjustGems,
        addGlobalGarment,
        removeGlobalGarment,
        redeemReferral,
        saveOutfit,
        deleteSavedOutfit
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
