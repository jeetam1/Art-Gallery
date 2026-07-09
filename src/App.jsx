import React, { useState, useEffect } from 'react';

const priority = ['89.jpeg', '90.jpeg', '61.jpeg'];
const newImages = Array.from({ length: 11 }, (_, i) => `${156 + i}.jpeg`);
const baseFilenames = Array.from({ length: 166 }, (_, i) => `${i + 1}.jpeg`);
const remaining = baseFilenames.filter(f => !priority.includes(f) && !newImages.includes(f));
const filenames = [...newImages, ...priority, ...remaining];

const items = filenames.map((filename, index) => ({
  id: index + 1,
  src: `/${filename}`,
  thumbSrc: `/thumbnails/${filename}`
}));

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}



export default function App() {
  const [lightboxItem, setLightboxItem] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const pathRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const [iconPos, setIconPos] = useState({ x: 45, y: 10 });
  const [isScrollingDrag, setIsScrollingDrag] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle window scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      // Don't override progress scroll if actively dragging
      if (isScrollingDrag) return;
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) return;
      const progress = window.scrollY / totalScroll;
      setScrollProgress(progress);
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // initial load
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrollingDrag]);

  // Measure path length on load
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  // Calculate icon position on scroll progress change
  useEffect(() => {
    const path = pathRef.current;
    if (!path || !pathLength) return;
    const length = scrollProgress * pathLength;
    const point = path.getPointAtLength(length);
    setIconPos({ x: point.x, y: point.y });
  }, [scrollProgress, pathLength]);

  // Handle drag to scroll along the zig-zag path
  const handleScrollDrag = (clientY) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const fraction = Math.max(0, Math.min(1, relativeY / rect.height));
    
    // Update local state immediately for instant responsive tracking
    setScrollProgress(fraction);

    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: fraction * totalScroll,
      behavior: 'auto'
    });
  };

  const handleIndicatorMouseDown = (e) => {
    e.preventDefault();
    setIsScrollingDrag(true);
    handleScrollDrag(e.clientY);
  };

  useEffect(() => {
    if (!isScrollingDrag) return;

    const handleMouseMove = (e) => {
      handleScrollDrag(e.clientY);
    };

    const handleMouseUp = () => {
      setIsScrollingDrag(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrollingDrag]);

  const handleIndicatorTouchStart = (e) => {
    setIsScrollingDrag(true);
    handleScrollDrag(e.touches[0].clientY);
  };

  useEffect(() => {
    if (!isScrollingDrag) return;

    const handleTouchMove = (e) => {
      handleScrollDrag(e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
      setIsScrollingDrag(false);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isScrollingDrag]);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom, rotate, and pan when the artwork changes
  useEffect(() => {
    setZoomScale(1);
    setRotationAngle(0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [lightboxItem]);

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = Math.max(1, prev - 0.25);
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleRotate = () => {
    setRotationAngle(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoomScale(1);
    setRotationAngle(0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPanOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  // Row-wise masonry column distribution
  const width = useWindowWidth();
  let colsCount = 4;
  if (width <= 480) colsCount = 1;
  else if (width <= 768) colsCount = 2;
  else if (width <= 1024) colsCount = 3;

  const columns = Array.from({ length: colsCount }, () => []);
  items.forEach((item, index) => {
    columns[index % colsCount].push(item);
  });

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
          Explore a curated exhibition of contemporary acrylic on canvas paintings—a visual journey of nature, texture, and color.
        </p>

        {/* Row-wise masonry layout using distributed columns */}
        <div className="shorya-gallery-grid-three-columns-matrix">
          {columns.map((colItems, colIdx) => (
            <div key={colIdx} className="gallery-masonry-column">
              {colItems.map((item) => (
                <div
                  key={item.id}
                  className="shorya-gallery-thumbnail-card-frame"
                  onClick={() => setLightboxItem(item)}
                >
                  <div className="shorya-gallery-thumbnail-image-clipping-box">
                    <img
                      loading="lazy"
                      src={item.thumbSrc}
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
            <div 
              className="lightbox-image-wrapper" 
              style={{ 
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotationAngle}deg)`,
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                transformOrigin: 'center center'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                src={lightboxItem.src}
                alt={`Artwork ${lightboxItem.id}`}
                className="lightbox-main-img"
                draggable={false}
              />
            </div>
            
            <div className="lightbox-actions-panel">
              <span className="lightbox-photo-counter">
                Artwork {items.findIndex(it => it.id === lightboxItem.id) + 1} of {items.length}
              </span>
              
              <div className="lightbox-controls-group">
                <button 
                  className="lightbox-control-btn" 
                  onClick={handleZoomOut} 
                  title="Zoom Out" 
                  disabled={zoomScale <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </button>
                
                <span className="lightbox-zoom-level">{Math.round(zoomScale * 100)}%</span>
                
                <button 
                  className="lightbox-control-btn" 
                  onClick={handleZoomIn} 
                  title="Zoom In" 
                  disabled={zoomScale >= 3}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </button>
                
                <button 
                  className="lightbox-control-btn" 
                  onClick={handleRotate} 
                  title="Rotate 90° Clockwise"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                </button>

                <button 
                  className="lightbox-control-btn" 
                  onClick={handleReset} 
                  title="Reset Scale & Rotation" 
                  disabled={zoomScale === 1 && rotationAngle === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <polyline points="3 3 3 8 8 8"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <button className="lightbox-nav-btn next-btn" onClick={(e) => { e.stopPropagation(); handleNextLightbox(); }} aria-label="Next photo">
            &#10095;
          </button>
        </div>
      )}

      {/* Vertical Zig-Zag Scroll Progress Indicator (Right Hand Side) */}
      <div 
        ref={containerRef}
        className="shorya-zigzag-scroll-progress-container"
        onMouseDown={handleIndicatorMouseDown}
        onTouchStart={handleIndicatorTouchStart}
        style={{
          cursor: isScrollingDrag ? 'grabbing' : 'grab'
        }}
      >
        <svg width="90" height="100%" viewBox="0 0 90 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id="favicon-circle-clip">
              {/* Tighter clip circle at origin to isolate abstract colors, cutting off square black border */}
              <circle cx="0" cy="0" r="20" />
            </clipPath>
          </defs>

          {/* Base inactive smooth wavy path (centered at x=45) */}
          <path
            ref={pathRef}
            d="M 45,10 C 35,35 25,40 25,60 C 25,80 65,90 65,110 C 65,130 25,140 25,160 C 25,180 65,190 65,210 C 65,230 25,240 25,260 C 25,280 65,290 65,310 C 65,330 25,340 25,360 C 25,380 35,385 45,390"
            stroke="#e5e5e5"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Active colored smooth wavy path */}
          {pathLength > 0 && (
            <path
              d="M 45,10 C 35,35 25,40 25,60 C 25,80 65,90 65,110 C 65,130 25,140 25,160 C 25,180 65,190 65,210 C 65,230 25,240 25,260 C 25,280 65,290 65,310 C 65,330 25,340 25,360 C 25,380 35,385 45,390"
              stroke="var(--primary-color)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathLength}
              strokeDashoffset={pathLength - (scrollProgress * pathLength)}
            />
          )}
          
          {/* Favicon indicator moving smoothly on the path */}
          <g 
            transform={`translate(${iconPos.x}, ${iconPos.y})`} 
            style={{ 
              transition: isScrollingDrag ? 'none' : 'transform 0.18s cubic-bezier(0.25, 1, 0.5, 1)',
              cursor: isScrollingDrag ? 'grabbing' : 'grab'
            }}
          >
            {/* White circle background with drop shadow and gold border */}
            <circle 
              cx="0" 
              cy="0" 
              r="26" 
              fill="#ffffff" 
              stroke="#df9939" 
              strokeWidth="3.5" 
              style={{ filter: 'drop-shadow(0px 3px 8px rgba(0, 0, 0, 0.22))' }} 
            />
            {/* Circular clipped favicon (large image shifted so center painting fills the circle) */}
            <image 
              href="/favicon.png" 
              x="-25" 
              y="-25" 
              width="50" 
              height="50" 
              clipPath="url(#favicon-circle-clip)"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        </svg>
      </div>

      {/* Sleek Top Horizontal Progress Bar for Mobile/Tablet */}
      <div className="shorya-top-scroll-progress-bar" style={{ width: `${scrollProgress * 100}%` }}></div>

      {/* Scroll to Top Floating Action Button */}
      <button 
        className={`shorya-scroll-to-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Scroll to Top"
        aria-label="Scroll to Top"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>

    </div>
  );
}
