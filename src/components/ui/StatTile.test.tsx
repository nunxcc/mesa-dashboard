import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('shows the value and label', () => {
    render(<StatTile label="Net revenue" value="72 042 €" />);

    expect(screen.getByText('Net revenue')).toBeInTheDocument();
    expect(screen.getByText('72 042 €')).toBeInTheDocument();
  });

  it('describes a rise as positive when up is good', () => {
    const { container } = render(
      <StatTile label="Net revenue" value="110 €" current={110} previous={100} />,
    );

    expect(screen.getByText(/\+10/)).toBeInTheDocument();
    expect(container.querySelector('[class*="good"]')).not.toBeNull();
  });

  it('describes a rise as negative when up is bad', () => {
    // Commission paid and ticket time both go the wrong way when they rise,
    // so the same delta has to colour the other direction.
    const { container } = render(
      <StatTile label="Commission" value="110 €" current={110} previous={100} invertDelta />,
    );

    expect(container.querySelector('[class*="bad"]')).not.toBeNull();
  });

  it('treats a sub-half-percent move as flat rather than directional', () => {
    // A −0,1 % change is rounding, not a trend. Drawing an arrow at it claims
    // a direction the number does not support.
    const { container } = render(
      <StatTile label="Net revenue" value="100 €" current={100.2} previous={100} />,
    );

    expect(container.querySelector('[class*="good"]')).toBeNull();
    expect(container.querySelector('[class*="bad"]')).toBeNull();
  });

  it('falls back to a footnote when there is no prior period', () => {
    render(<StatTile label="Orders" value="2 131" footnote="Since opening" />);

    expect(screen.getByText('Since opening')).toBeInTheDocument();
  });

  it('says so plainly when a comparison is impossible', () => {
    // Dividing by a zero baseline yields no percentage, and the tile must not
    // silently render nothing where a delta belongs.
    render(<StatTile label="Orders" value="12" current={12} previous={0} />);

    expect(screen.getByText(/No prior period/i)).toBeInTheDocument();
  });

  it('hides the value behind a placeholder while loading', () => {
    render(<StatTile label="Net revenue" value="72 042 €" loading />);

    expect(screen.queryByText('72 042 €')).not.toBeInTheDocument();
    expect(screen.getByText('Net revenue')).toBeInTheDocument();
  });
});
