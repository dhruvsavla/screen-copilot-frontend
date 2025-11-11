import React, { useState } from 'react';
import './GuideCard.css'; 

// 1. Accept new props: showDelete and onDelete
const GuideCard = ({ guide, showDelete = false, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Create a handler for the delete button
  const handleDeleteClick = (e) => {
    // Stop the click from bubbling up to the card
    // so it doesn't expand when we click delete
    e.stopPropagation(); 

    if (window.confirm(`Are you sure you want to delete the guide "${guide.name}"?`)) {
      onDelete(guide.id);
    }
  };

  return (
    <div 
      className={`guide-card ${isExpanded ? 'expanded' : ''}`} 
      // 3. Make the card expandable only if not deleting
      onClick={() => !showDelete && setIsExpanded(!isExpanded)}
      // 4. Change cursor based on whether it's expandable or just a card
      style={{ cursor: showDelete ? 'default' : 'pointer' }}
    >
      <h3 className="guide-card-title">{guide.name}</h3>
      <p className="guide-card-shortcut">{guide.shortcut}</p>
      <p className="guide-card-description">{guide.description}</p>
      <span className="guide-card-steps">{guide.steps.length} {guide.steps.length === 1 ? 'Step' : 'Steps'}</span>

      {/* 5. Conditionally show the delete button */}
      {showDelete && (
        <div className="guide-card-actions">
          <button 
            className="guide-card-expand-btn" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide Steps' : 'Show Steps'}
          </button>
          <button 
            className="guide-card-delete-btn" 
            onClick={handleDeleteClick}
          >
            Delete
          </button>
        </div>
      )}

      {/* Conditionally render the steps list */}
      {isExpanded && (
        <div className="guide-card-steps-list">
          <h4>Guide Steps:</h4>
          <ol>
            {guide.steps.map((step, index) => (
              <li key={index}>{step.instruction}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default GuideCard;