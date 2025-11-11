import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import GuideCard from '../components/GuideCard';
import './Page.css';

const MyGuides = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  // --- 1. Renamed function and wrapped in useEffect ---
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
  }, [token]); // This effect runs when 'token' changes

  // --- 2. NEW: Add the delete handler function ---
  const handleDeleteGuide = async (guideId) => {
    setError(''); // Clear previous errors

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/guides/${guideId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // If the server sends an error message, show it
        if (response.status === 404 || response.status === 403) {
          const err = await response.json();
          throw new Error(err.detail);
        }
        throw new Error('Failed to delete guide. Please try again.');
      }

      // 3. On success, remove the guide from the state to update the UI
      setGuides(currentGuides => 
        currentGuides.filter(guide => guide.id !== guideId)
      );

    } catch (err) {
      setError(err.message);
    }
  };

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
            // 4. Pass the new props to GuideCard
            <GuideCard 
              key={guide.id} 
              guide={guide} 
              showDelete={true} 
              onDelete={handleDeleteGuide}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyGuides;