// src/components/GuideCard.js
import React from 'react';
import './GuideCard.css'; // We will create this CSS file next

const GuideCard = ({ guide }) => {
  return (
    <div className="guide-card">
      <h3 className="guide-card-title">{guide.name}</h3>
      <p className="guide-card-shortcut">{guide.shortcut}</p>
      <p className="guide-card-description">{guide.description}</p>
      <span className="guide-card-steps">{guide.steps.length} {guide.steps.length === 1 ? 'Step' : 'Steps'}</span>
    </div>
  );
};

export default GuideCard;