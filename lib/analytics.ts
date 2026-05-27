// Client-side analytics tracking
export async function trackView(productId: string): Promise<void> {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, type: 'view' }),
    });
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.error('Analytics view tracking failed:', error);
  }
}

export async function trackClick(productId: string): Promise<void> {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, type: 'click' }),
    });
  } catch (error) {
    console.error('Analytics click tracking failed:', error);
  }
}
