/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIUFwOMG8Q2EHzckgWHVyJ8fjavm5jP94",
  authDomain: "fitcheck-21ffc.firebaseapp.com",
  projectId: "fitcheck-21ffc",
  storageBucket: "fitcheck-21ffc.firebasestorage.app",
  messagingSenderId: "775939684692",
  appId: "1:775939684692:web:fc1e5d770bbe3d226c70c1",
  measurementId: "G-7BFDXM5XFQ"
};

// Initialize Firebase
// We initialize immediately to ensure exports are available.
// Any errors here will be caught by the global error handler or console,
// but hardcoding the config resolves the most common cause of 'Failed to load'.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };