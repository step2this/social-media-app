import React, { useState } from 'react';

/**
 * Visual consistency test component for the TamaFriends design system
 * Showcases all major patterns to ensure DRY principles are working
 */
export const DesignSystemTest: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="wireframe-content">
      <div className="tama-card" style={{ padding: 'var(--space-8)' }}>
        <h1 className="tama-heading tama-heading--automotive">🏁 Design System Test Suite</h1>
        <p className="tama-text tama-text--automotive">
          Visual consistency verification for TamaFriends automotive styling patterns
        </p>

        {/* Typography Tests */}
        <section style={{ marginTop: 'var(--space-8)' }}>
          <h2 className="tama-heading tama-heading--automotive">📝 Typography & DRY Patterns</h2>
          <div className="tama-card">
            <h3 className="tama-heading tama-heading--automotive">Automotive Heading</h3>
            <p className="tama-text tama-text--automotive">Automotive text with pixel font inheritance</p>
            <p className="tama-text">Regular text without automotive styling</p>
            <small className="tama-text" style={{ fontSize: 'var(--text-xs)', color: 'var(--tama-gray-600)' }}>
              Small text using design system variables
            </small>
          </div>
        </section>

        {/* Button Tests */}
        <section style={{ marginTop: 'var(--space-8)' }}>
          <h2 className="tama-heading tama-heading--automotive">🏎️ Button Variants</h2>
          <div className="tama-card" style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button className="tama-btn tama-btn--automotive tama-btn--racing-red">
              Racing Red Button
            </button>
            <button className="tama-btn tama-btn--automotive tama-btn--secondary">
              Secondary Automotive
            </button>
            <button className="tama-btn tama-btn--primary">
              Standard Primary
            </button>
            <button className="tama-btn tama-btn--automotive" disabled>
              Disabled Automotive
            </button>
          </div>
        </section>

        {/* Form Tests */}
        <section style={{ marginTop: 'var(--space-8)' }}>
          <h2 className="tama-heading tama-heading--automotive">📋 Form Patterns</h2>
          <div className="tama-card">
            <form style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label htmlFor="test-email" className="tama-form-label tama-form-label--automotive">
                  Automotive Form Label
                </label>
                <input
                  id="test-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="tama-input tama-input--automotive"
                  placeholder="Automotive input styling"
                />
              </div>

              <div className="form-group">
                <label htmlFor="test-password" className="tama-form-label">
                  Standard Form Label
                </label>
                <input
                  id="test-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="tama-input"
                  placeholder="Standard input styling"
                />
              </div>
            </form>
          </div>
        </section>

        {/* Alert Tests */}
        <section style={{ marginTop: 'var(--space-8)' }}>
          <h2 className="tama-heading tama-heading--automotive">⚠️ Alert Patterns</h2>
          <div className="tama-card" style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div className="tama-alert tama-alert--error" role="alert">
              Error alert using consolidated styling
            </div>
            <div className="tama-form-error">
              Form error using legacy class
            </div>
          </div>
        </section>

        {/* Interactive Tests */}
        <section style={{ marginTop: 'var(--space-8)' }}>
          <h2 className="tama-heading tama-heading--automotive">🎯 Interactive Elements</h2>
          <div className="tama-card">
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div className="tama-card tama-card--interactive">
                Interactive card with hover effects
              </div>
              <button
                className="tama-btn tama-btn--automotive tama-btn--racing-red"
                onClick={() => setIsModalOpen(true)}
              >
                Test Modal Patterns
              </button>
            </div>
          </div>
        </section>

        {/* Layout Tests */}
        <section style={{ marginTop: 'var(--space-8)' }}>
          <h2 className="tama-heading tama-heading--automotive">📐 Layout Verification</h2>
          <div className="tama-card">
            <p className="tama-text tama-text--automotive">
              This component demonstrates wireframe layout compliance:
            </p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li className="tama-text">✅ 280px left sidebar (implied)</li>
              <li className="tama-text">✅ Flexible content area</li>
              <li className="tama-text">✅ 320px right sidebar (implied)</li>
              <li className="tama-text">✅ Responsive grid patterns</li>
            </ul>
          </div>
        </section>
      </div>

      {/* Modal Test */}
      {isModalOpen && (
        <div className="modal-overlay modal-overlay--automotive" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-content--automotive" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="tama-form">
              <h2 className="tama-heading tama-heading--automotive">🧪 Modal Test</h2>
              <p className="tama-text tama-text--automotive">
                Verifying modal patterns use automotive styling consistently
              </p>
              <div className="modal-actions modal-actions--automotive">
                <button
                  className="tama-btn tama-btn--automotive tama-btn--racing-red"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close Test Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};