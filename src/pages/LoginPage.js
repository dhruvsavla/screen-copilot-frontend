import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Auth.css'; // Make sure you have this CSS file

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // FastAPI's OAuth2 expects form data, not JSON
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to login');
      }

      const data = await response.json();
      
      // --- *** THIS IS THE FIX *** ---
      // Send the token to our content.js script, which is
      // running on this same page and listening for this message.
      window.postMessage(
        { 
          type: "NEXAURA_AUTH_TOKEN", 
          token: data.access_token 
        },
        "http://localhost:3000" // Be specific for security
      );
      // --- *** END OF FIX *** ---

      // Now that the token is sent, just redirect.
      navigate('/'); // Redirect to landing page

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Log In to Nex<span className="logo-highlight">A</span>ura</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="cta-button primary auth-button">
            Log In
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;