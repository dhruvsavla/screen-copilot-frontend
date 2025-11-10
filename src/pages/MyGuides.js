// src/pages/MyGuides.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import GuideCard from '../components/GuideCard';
import './Page.css'; // We'll create this

const MyGuides = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth(); // Get token from context

  useEffect(() => {
    const fetchGuides = async () => {
      if (!token) {
        setError('You must be logged in to see your guides.');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch("http://127.0.0.1:8000/api/guides/", {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Failed to fetch guides');
        }

        const data = await response.json();
        setGuides(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, [token]);

  return (
    <div className="page-container">
      <div className="container">
        <h1 className="page-title">My Guides</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="page-error">{error}</p>}
        
        <div className="guide-grid">
          {!loading && !error && guides.length === 0 && (
            <p>You haven't created any guides yet. Try creating one with the extension!</p>
          )}
          {guides.map(guide => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyGuides;