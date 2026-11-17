import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { api, isMockMode, setCsrfToken } from "../api/client"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then(profile => { setCsrfToken(profile.csrfToken); setUser(profile) })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(loginValue, password) {
    const profile = await api.login({ login: loginValue, password })
    setCsrfToken(profile.csrfToken)
    setUser(profile)
    return profile
  }

  async function previewAs(role) {
    if (!isMockMode) return null
    const profile = await api.login({ mockRole: role })
    setCsrfToken(profile.csrfToken)
    setUser(profile)
    return profile
  }

  async function logout() {
    await api.logout()
    setCsrfToken("")
    setUser(null)
  }

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    previewAs,
    mockMode: isMockMode,
    setUser
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
