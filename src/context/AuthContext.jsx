/* eslint-disable react-refresh/only-export-components */
import PropTypes from "prop-types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../services/firebase";
import api from "../services/api";

const AuthContext = createContext(null);

const buildFallbackProfile = (user) => {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName || "",
  };
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (uid, fallbackUser = null) => {
      try {
        const response = await api.get(`/users/${uid}`);
        setProfile(response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch profile", error);
        const fallbackProfile = fallbackUser ? buildFallbackProfile(fallbackUser) : null;
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.uid, currentUser);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  const login = useCallback(
    async (email, password) => {
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      setUser(credentials.user);
      await fetchProfile(credentials.user.uid, credentials.user);
      return credentials.user;
    },
    [fetchProfile],
  );

  const register = useCallback(
    async ({ email, password, name }) => {
      const credentials = await createUserWithEmailAndPassword(auth, email, password);

      if (name) {
        await updateProfile(credentials.user, { displayName: name });
      }

      const payload = {
        uid: credentials.user.uid,
        email,
        name,
      };

      try {
        const response = await api.post("/users", payload);
        setProfile(response.data);
      } catch (error) {
        console.error("Failed to create profile", error);
        setProfile(payload);
      }

      setUser(credentials.user);
      return credentials.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      register,
      logout,
      refreshProfile: fetchProfile,
    }),
    [user, profile, loading, login, register, logout, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export { AuthProvider, useAuth };
