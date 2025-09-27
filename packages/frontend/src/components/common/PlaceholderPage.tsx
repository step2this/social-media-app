import React from 'react';

interface PlaceholderPageProps {
  icon: string;
  title: string;
  description: string;
  features: string[];
}

/**
 * Reusable placeholder page component for coming soon features
 * Uses wireframe layout and automotive styling
 */
export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  icon,
  title,
  description,
  features
}) => {
  return (
    <div className="wireframe-content">
      <div className="tama-card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <h2 className="tama-heading tama-heading--automotive">
          {icon} {title}
        </h2>
        <p className="tama-text tama-text--automotive">{description}</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-6)'
        }}>
          {features.map((feature, index) => (
            <div key={index} className="tama-card tama-card--interactive">
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};