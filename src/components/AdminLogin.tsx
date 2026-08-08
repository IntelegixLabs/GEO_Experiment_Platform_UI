import React, { useState, useEffect } from "react";
import { api } from "../api/client";

export function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await api.adminVerify({ username, password });
      if (result.success) {
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-backdrop" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f3f0eb 0%, #e8e4dd 50%, #dfe9ea 100%)',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
      padding: '1rem',
    }}>
      <div style={{
        background: '#ffffff',
        padding: '2.75rem 2.5rem',
        borderRadius: '20px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        width: '100%',
        maxWidth: '400px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #08727a 0%, #065a60 100%)',
            marginBottom: '1.25rem',
            boxShadow: '0 6px 20px rgba(8, 114, 122, 0.25)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem', color: '#18233a', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Research Console
          </h2>
          <p style={{ color: '#647087', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
            Enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Username */}
          <div>
            <label htmlFor="admin-username" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.82rem', color: '#18233a' }}>
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoComplete="username"
              style={{
                width: '100%',
                padding: '0.78rem 0.9rem',
                borderRadius: '10px',
                border: '1.5px solid #d1d5db',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                color: '#18233a',
                background: '#fafafa',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#08727a'; e.target.style.boxShadow = '0 0 0 3px rgba(8,114,122,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="admin-password" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.82rem', color: '#18233a' }}>
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.78rem 0.9rem',
                borderRadius: '10px',
                border: '1.5px solid #d1d5db',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                color: '#18233a',
                background: '#fafafa',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#08727a'; e.target.style.boxShadow = '0 0 0 3px rgba(8,114,122,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              color: '#b91c1c',
              fontSize: '0.85rem',
              padding: '0.75rem 0.85rem',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error === "Not Found" ? "Please restart the backend server to load the auth route." : error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.25rem',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: '1px solid #065a60',
              background: '#08727a',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 8px rgba(8, 114, 122, 0.18)',
              letterSpacing: '0.01em',
            }}
            onMouseOver={(e) => { if (!loading) { e.currentTarget.style.background = '#075e65'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(8,114,122,0.25)'; } }}
            onMouseOut={(e) => { if (!loading) { e.currentTarget.style.background = '#08727a'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(8,114,122,0.18)'; } }}
          >
            {loading ? (
              <>
                <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'admin-spin 0.8s linear infinite' }} />
                <span>Verifying…</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>Access Console</span>
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes admin-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

