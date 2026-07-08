import React, { useState, useEffect } from 'react';

const filenames = Array.from({ length: 31 }, (_, i) => `${i + 1}.jpeg`);

const items = filenames.map((filename, index) => ({
  id: index + 1,
  src: `/framed/${filename}`
}));



export default function App() {
  const [lightboxItem, setLightboxItem] = useState(null);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightboxItem) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevLightbox();
      } else if (e.key === 'ArrowRight') {
        handleNextLightbox();
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxItem]);

  const closeLightbox = () => {
    setLightboxItem(null);
  };

  const handlePrevLightbox = () => {
    setLightboxItem(curr => {
      if (!curr) return null;
      const currentIndex = items.findIndex(it => it.id === curr.id);
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      return items[prevIndex];
    });
  };

  const handleNextLightbox = () => {
    setLightboxItem(curr => {
      if (!curr) return null;
      const currentIndex = items.findIndex(it => it.id === curr.id);
      const nextIndex = (currentIndex + 1) % items.length;
      return items[nextIndex];
    });
  };

  return (
    <div className="shorya-acrylic-canvas-view-root">
      
      {/* Centered clean header, no images or black overlays */}
      <div className="shorya-custom-header-strip-container">
        <div className="shorya-custom-title-white-block">
          <h1 className="shorya-custom-title-text-value">Shreya Mahanot and Swathi Mahanot</h1>
        </div>
      </div>

      {/* Main Gallery Section - No dividing line */}
      <div className="shorya-compact-gallery-outer-wrapper">
        <p className="shorya-gallery-intro-text">
          Hover over any photo to reveal the magnifying glass, then click to view the painting in a full-screen lightbox.
        </p>

        {/* 4-column responsive grid layout, no labels/names displayed */}
        <div className="shorya-gallery-grid-three-columns-matrix">
          {items.map((item) => (
            <div
              key={item.id}
              className="shorya-gallery-thumbnail-card-frame"
              onClick={() => setLightboxItem(item)}
            >
              <div className="shorya-gallery-thumbnail-image-clipping-box">
                <img
                  loading="lazy"
                  src={item.src}
                  alt={`Artwork ${item.id}`}
                  className="shorya-gallery-thumbnail-img-asset"
                />
                <div className="shorya-gallery-thumbnail-inner-shadow-overlay"></div>
                <div className="shorya-gallery-hover-overlay">
                  <div className="shorya-gallery-hover-indicator-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shorya-gallery-hover-icon">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div className="lightbox-modal-shroud active" onClick={closeLightbox}>
          <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close lightbox">
            &times;
          </button>
          
          <button className="lightbox-nav-btn prev-btn" onClick={(e) => { e.stopPropagation(); handlePrevLightbox(); }} aria-label="Previous photo">
            &#10094;
          </button>
          
          <div className="lightbox-content-container" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-image-wrapper">
              <img
                src={lightboxItem.src}
                alt={`Artwork ${lightboxItem.id}`}
                className="lightbox-main-img"
              />
            </div>
            
            <div className="lightbox-actions-panel">
              <span className="lightbox-photo-counter">
                Artwork {items.findIndex(it => it.id === lightboxItem.id) + 1} of {items.length}
              </span>
            </div>
          </div>
          
          <button className="lightbox-nav-btn next-btn" onClick={(e) => { e.stopPropagation(); handleNextLightbox(); }} aria-label="Next photo">
            &#10095;
          </button>
        </div>
      )}

    </div>
  );
}
