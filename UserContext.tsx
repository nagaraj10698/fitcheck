
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, WardrobeItem, Transaction, SavedOutfit } from './types';
import { defaultWardrobe } from './wardrobe';
import { 
  auth, 
  db, 
  googleProvider 
} from './lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot,
  increment,
  deleteDoc
} from "firebase/firestore";

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
  const [allUsers, setAllUsers] = useState<User[]>([]); // Only populated for admins
  const [globalWardrobe, setGlobalWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 1. Unified Auth & Data Listener
  // This pattern handles offline support (via snapshot) and race conditions (via listener)
  useEffect(() => {
    if (!auth || !db) {
        console.warn("Firebase Auth or DB not initialized. Skipping auth listener.");
        return;
    }

    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Cleanup previous user listener if exists
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        const userRef = doc(db!, "users", firebaseUser.uid);
        
        // Use onSnapshot instead of getDoc for resilience against offline states and race conditions
        unsubscribeUserDoc = onSnapshot(userRef, 
          async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as User;
              setUser(userData);
            } else {
              // Document doesn't exist yet.
              // If account is brand new (<10s old), wait for signup() to create it.
              // Otherwise, create a fallback profile (self-healing).
              const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : 0;
              const isRecent = (Date.now() - creationTime) < 10000;

              if (!isRecent) {
                  console.log("Recovering missing user profile...");
                  const newUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    email: firebaseUser.email!,
                    role: firebaseUser.email === 'admin@fitcheck.com' ? 'admin' : 'user',
                    gems: 50,
                    referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    redeemedReferral: false,
                    avatarUrl: firebaseUser.photoURL || null, // Explicitly null
                    savedOutfits: []
                  };
                  // This write might be queued if offline, but onSnapshot will eventually pick it up
                  await setDoc(userRef, newUser).catch(e => console.error("Self-heal failed:", e));
              } else {
                  console.log("New user detected, waiting for profile creation...");
              }
            }
          }, 
          (error) => {
            // Gracefully handle permission denied or offline errors
            console.warn("Firestore listener warning (often offline or permission):", error.message);
          }
        );

      } else {
        // User logged out
        setUser(null);
        setAllUsers([]);
        setTransactions([]);
      }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);


  // 2. Admin: Fetch All Users and Transactions
  useEffect(() => {
    if (user?.role !== 'admin' || !db) return;

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as User);
      setAllUsers(users);
    }, (err) => console.error("Admin users sync error", err));

    const unsubscribeTx = onSnapshot(collection(db, "transactions"), (snapshot) => {
        const txs = snapshot.docs.map(doc => doc.data() as Transaction);
        // Sort by timestamp desc
        txs.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(txs);
    }, (err) => console.error("Admin tx sync error", err));

    return () => {
        unsubscribeUsers();
        unsubscribeTx();
    };
  }, [user?.role]);

  // 3. Load Global Wardrobe (Real-time)
  useEffect(() => {
      if (!db) return;
      const unsubscribe = onSnapshot(collection(db, "wardrobe"), (snapshot) => {
          if (!snapshot.empty) {
              const items = snapshot.docs.map(doc => doc.data() as WardrobeItem);
              setGlobalWardrobe([...defaultWardrobe, ...items]);
          }
      }, (err) => console.warn("Wardrobe sync error (offline?)", err.message));
      return () => unsubscribe();
  }, []);


  const logTransaction = async (
    targetUserId: string, 
    targetUserEmail: string,
    type: 'credit' | 'debit', 
    amount: number, 
    description: string
  ) => {
    if (!db) return;
    try {
        const newTx: Transaction = {
            id: `tx-${Date.now()}`,
            userId: targetUserId,
            userEmail: targetUserEmail,
            type,
            amount,
            description,
            timestamp: Date.now()
        };
        await addDoc(collection(db, "transactions"), newTx);
    } catch (e) {
        console.error("Failed to log transaction", e);
    }
  };

  const login = async (email: string, password?: string, options?: { name?: string, avatarUrl?: string, isGoogle?: boolean }) => {
    if (!auth || !db) throw new Error("Firebase not configured");
    
    if (options?.isGoogle && googleProvider) {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        
        // Check if doc exists immediately to provide instant feedback if needed, 
        // though the listener will handle it eventually.
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // First time Google Sign in
            const newUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || options?.name || 'User',
                email: firebaseUser.email!,
                role: firebaseUser.email === 'admin@fitcheck.com' ? 'admin' : 'user',
                gems: 50,
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                redeemedReferral: false,
                avatarUrl: firebaseUser.photoURL || options?.avatarUrl || null, // Explicitly null
                savedOutfits: []
            };
            await setDoc(userRef, newUser);
            await logTransaction(newUser.id, newUser.email, 'credit', 50, 'Welcome Bonus');
        }
    } else {
        if (!password) throw new Error("Password required");
        await signInWithEmailAndPassword(auth, email, password);
    }
  };

  const signup = async (email: string, password: string, name: string, referralCode?: string) => {
    if (!auth || !db) throw new Error("Firebase not configured");

    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    try {
        await updateProfile(firebaseUser, { displayName: name });
    } catch (e) {
        console.warn("Failed to update display name during signup", e);
    }

    // 2. Handle Referral Logic
    let startGems = 50;
    let redeemed = false;
    const REFERRER_BONUS = 25;
    const NEW_USER_REFERRAL_BONUS = 50;

    try {
        if (referralCode && referralCode.trim()) {
            const normalizedCode = referralCode.trim().toUpperCase();
            const q = query(collection(db, "users"), where("referralCode", "==", normalizedCode));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                redeemed = true;
                startGems += NEW_USER_REFERRAL_BONUS;
                
                const referrerDoc = querySnapshot.docs[0];
                const referrerData = referrerDoc.data() as User;

                // Credit Referrer
                const referrerRef = doc(db, "users", referrerData.id);
                await updateDoc(referrerRef, {
                    gems: increment(REFERRER_BONUS)
                });
                await logTransaction(referrerData.id, referrerData.email, 'credit', REFERRER_BONUS, `Referral Bonus (Invited ${name})`);
            }
        }
    } catch (e) {
        console.error("Referral check failed during signup", e);
    }

    // 3. Create User Document
    const newUser: User = {
        id: firebaseUser.uid,
        name: name,
        email,
        role: email === 'admin@fitcheck.com' ? 'admin' : 'user',
        gems: startGems,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        redeemedReferral: redeemed,
        savedOutfits: [],
        avatarUrl: null
    };

    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    
    // 4. Log Transaction
    await logTransaction(newUser.id, newUser.email, 'credit', 50, 'Welcome Bonus');
    if (redeemed) {
        await logTransaction(newUser.id, newUser.email, 'credit', NEW_USER_REFERRAL_BONUS, 'Referral Bonus (Redeemed Code)');
    }
  };

  const logout = async () => {
    if (auth) await signOut(auth);
    // State cleanup handled by onAuthStateChanged listener
  };

  const deductGems = (amount: number, description: string = 'Service Usage'): boolean => {
    if (!user || !db) return false;
    if (user.gems >= amount) {
      // Optimistic UI update is handled by onSnapshot, but we return true immediately to allow app flow
      const userRef = doc(db, "users", user.id);
      updateDoc(userRef, {
          gems: increment(-amount)
      }).catch(err => console.error("Failed to deduct gems", err));
      
      logTransaction(user.id, user.email, 'debit', amount, description);
      return true;
    }
    return false;
  };

  const purchaseGems = async (amount: number) => {
    if (!user || !db) return;
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
        gems: increment(amount)
    });
    await logTransaction(user.id, user.email, 'credit', amount, 'Wallet Top-up');
  };

  // --- Referral ---
  const redeemReferral = (code: string): { success: boolean; message: string } => {
      if (!user || !db) return { success: false, message: 'Service unavailable.' };
      if (user.redeemedReferral) return { success: false, message: 'Already redeemed.' };
      if (user.referralCode === code) return { success: false, message: 'Cannot use own code.' };

      (async () => {
        if (!db) return;
        try {
            const q = query(collection(db, "users"), where("referralCode", "==", code));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.error("Invalid code"); 
                return; 
            }

            const referrerDoc = querySnapshot.docs[0];
            const referrer = referrerDoc.data() as User;
            const userRef = doc(db, "users", user.id);
            const referrerRef = doc(db, "users", referrer.id);

            // Batch or separate updates
            await updateDoc(userRef, {
                gems: increment(50),
                redeemedReferral: true
            });
            await updateDoc(referrerRef, {
                gems: increment(25)
            });

            logTransaction(referrer.id, referrer.email, 'credit', 25, `Referral Bonus (Invited ${user.name})`);
            logTransaction(user.id, user.email, 'credit', 50, `Referral Bonus (Used code ${code})`);
        } catch(e) {
            console.error("Redeem referral error", e);
        }
      })();

      return { success: true, message: 'Code applied! Updating balance...' };
  };

  // --- Saved Outfits ---
  const saveOutfit = async (outfit: SavedOutfit) => {
    if (!user || !db) return;
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
        savedOutfits: [outfit, ...(user.savedOutfits || [])]
    });
  };

  const deleteSavedOutfit = async (outfitId: string) => {
    if (!user || !user.savedOutfits || !db) return;
    const updatedOutfits = user.savedOutfits.filter(o => o.id !== outfitId);
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, { savedOutfits: updatedOutfits });
  };

  // --- Admin ---
  const createUser = async (userData: Omit<User, 'id'>) => {
     if (!db) throw new Error("DB unavailable");
     const fakeId = `user-created-${Date.now()}`;
     const newUser: User = {
         ...userData,
         id: fakeId,
         referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
         redeemedReferral: false,
         savedOutfits: [],
         avatarUrl: null
     };
     await setDoc(doc(db, "users", fakeId), newUser);
     await logTransaction(fakeId, userData.email, 'credit', userData.gems, 'Account Created by Admin');
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
      if (!db) return;
      await updateDoc(doc(db, "users", userId), updates);
  };

  const deleteUser = async (userId: string) => {
      if (!db) return;
      await deleteDoc(doc(db, "users", userId));
  };

  const updateUserGems = async (userId: string, newAmount: number) => {
      if (!db) return;
      await updateDoc(doc(db, "users", userId), { gems: newAmount });
  };

  const adminAdjustGems = async (userId: string, adjustment: number, description: string) => {
      if (!db) return;
      await updateDoc(doc(db, "users", userId), { gems: increment(adjustment) });
      // Fetch email for log
      const snap = await getDoc(doc(db, "users", userId));
      if(snap.exists()) {
          const email = snap.data().email;
          const type = adjustment >= 0 ? 'credit' : 'debit';
          await logTransaction(userId, email, type, Math.abs(adjustment), description);
      }
  };

  const addGlobalGarment = async (item: WardrobeItem) => {
      if (!db) return;
      await addDoc(collection(db, "wardrobe"), item);
  };

  const removeGlobalGarment = async (itemId: string) => {
     if (!db) return;
     const q = query(collection(db, "wardrobe"), where("id", "==", itemId));
     const snap = await getDocs(q);
     snap.forEach(async (d) => await deleteDoc(d.ref));
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
