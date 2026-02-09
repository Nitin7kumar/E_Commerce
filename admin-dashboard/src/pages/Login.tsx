import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../lib/supabase';
import '../styles/global.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      {/* Animated background elements */}
      <div className="login-bg-gradient"></div>
      <div className="login-bg-orb login-bg-orb-1"></div>
      <div className="login-bg-orb login-bg-orb-2"></div>
      <div className="login-bg-orb login-bg-orb-3"></div>

      <div className="login-card">
        {/* Logo Header */}
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">
              <span>🛒</span>
            </div>
            <div className="login-logo-text">
              <h1>Admin Dashboard</h1>
              <span>E-Commerce Management</span>
            </div>
          </div>
          <p className="login-subtitle">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className={`login-field ${focusedField === 'email' ? 'focused' : ''}`}>
            <label htmlFor="email">Email Address</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">📧</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={`login-field ${focusedField === 'password' ? 'focused' : ''}`}>
            <label htmlFor="password">Password</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">🔒</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner"></span>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="login-button-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>Admin Area</span>
        </div>

        <div className="login-info">
          <div className="login-info-icon">🔐</div>
          <div className="login-info-content">
            <p className="login-info-title">Admin Access Required</p>
            <p className="login-info-text">
              Only users with admin privileges can access this dashboard.
              Contact your system administrator if you need access.
            </p>
          </div>
        </div>

        <div className="login-footer">
          <p>© 2024 E-Commerce Platform</p>
        </div>
      </div>
    </div>
  );
}
