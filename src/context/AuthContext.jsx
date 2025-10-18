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

const DEFAULT_ROLE = "user";

const normalizeRoles = (roles) => {
  if (!roles) {
    return [DEFAULT_ROLE];
  }

  const roleList = Array.isArray(roles) ? roles : [roles];
  const normalized = roleList
    .map((role) => String(role || "").trim().toLowerCase())
    .filter(Boolean);

  if (normalized.length === 0) {
    return [DEFAULT_ROLE];
  }

  return Array.from(new Set(normalized));
};

const normalizeProfile = (profile, fallbackUser = null) => {
  if (!profile && !fallbackUser) {
    return null;
  }

  const baseProfile = profile ? { ...profile } : {};
  const fallback = fallbackUser ?? {};
  const roles = normalizeRoles(baseProfile.roles ?? baseProfile.role);
  const primaryRole = roles.includes(baseProfile.role) ? baseProfile.role : roles[0];

  return {
    ...baseProfile,
    uid: typeof baseProfile.uid === "string" && baseProfile.uid ? baseProfile.uid : fallback.uid ?? null,
    email:
      typeof baseProfile.email === "string" && baseProfile.email
        ? baseProfile.email
        : typeof fallback.email === "string"
          ? fallback.email
          : "",
    name:
      typeof baseProfile.name === "string" && baseProfile.name
        ? baseProfile.name
        : typeof fallback.displayName === "string" && fallback.displayName
          ? fallback.displayName
          : typeof fallback.email === "string"
            ? fallback.email
            : "",
    avatarUrl:
      typeof baseProfile.avatarUrl === "string" && baseProfile.avatarUrl
        ? baseProfile.avatarUrl
        : typeof fallback.photoURL === "string"
          ? fallback.photoURL
          : null,
    roles,
    role: primaryRole,
  };
};

const buildFallbackProfile = (user) => normalizeProfile(null, user);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (uid, fallbackUser = null) => {
      try {
        const response = await api.get(`/users/${uid}`);
        const normalizedProfile = normalizeProfile(response.data, fallbackUser);
        setProfile(normalizedProfile);
        return normalizedProfile;
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
        roles: [DEFAULT_ROLE],
      };

      try {
        const response = await api.post("/users", payload);
        const normalizedProfile = normalizeProfile(response.data, credentials.user);
        setProfile(normalizedProfile);
      } catch (error) {
        console.error("Failed to create profile", error);
        setProfile(normalizeProfile(payload, credentials.user));
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
