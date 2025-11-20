/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, WardrobeItem, Transaction } from './types';
import { defaultWardrobe } from './wardrobe';

interface UserContextType {
  user: User | null;
  gems: number;
  globalWardrobe: WardrobeItem[];
  login: (email: string) => void;
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
      const foundUser = usersDB.find(u => u.email === storedUserEmail);
      if (foundUser) {
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

  const login = (email: string) => {
    const usersDB = [...allUsers];
    let existingUser = usersDB.find(u => u.email === email);

    if (!existingUser) {
      // Determine role based on email
      const role = email.toLowerCase() === 'admin@fitcheck.com' ? 'admin' : 'user';
      
      existingUser = { 
        id: `user-${Date.now()}`, 
        name: email.split('@')[0], 
        email, 
        role, 
        gems: 50 // Starter gems
      };
      usersDB.push(existingUser);
      saveUsersDB(usersDB);
      logTransaction(existingUser, 'credit', 50, 'Welcome Bonus');
    }

    setUser(existingUser);
    localStorage.setItem('saas_current_user_email', existingUser.email);
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

  // --- Admin Functions ---

  const createUser = (userData: Omit<User, 'id'>) => {
    const usersDB = [...allUsers];
    if (usersDB.some(u => u.email === userData.email)) {
        throw new Error('User with this email already exists');
    }
    const newUser: User = {
        ...userData,
        id: `user-${Date.now()}`
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
        removeGlobalGarment
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