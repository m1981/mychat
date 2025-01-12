import React from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@src/config/firebase';
import useStore from '@store/store';
// Import your Google icon
import GoogleIcon from '@icon/GoogleIcon'; // You'll need to create this

export const UserProfile = () => {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="fixed top-3 right-3 z-50">
      {user ? (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-md">
          <img
            src={user.photoURL || undefined}
            alt="Profile"
            className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80"
            onClick={handleSignOut}
            title="Click to sign out"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
            {user.displayName}
          </span>
        </div>
      ) : (
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
        >
          <GoogleIcon className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Sign in with Google</span>
        </button>
      )}
    </div>
  );
};
