import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandHeading } from './BrandHeading';

describe('BrandHeading', () => {
  it('renders the heading text and brand image', () => {
    const { container } = render(<BrandHeading text="Frey Frey" className="custom-lockup" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Frey Frey' })).toBeInTheDocument();
    expect(container.querySelector('.custom-lockup')).not.toBeNull();
    expect(container.querySelector('.brand-mark-image')?.getAttribute('src')).toBe('/freyLogo.svg');
  });
});