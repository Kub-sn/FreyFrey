import { describe, expect, it, vi } from 'vitest';

const renderSpy = vi.fn();
const createRootSpy = vi.fn(() => ({ render: renderSpy }));

vi.mock('react-dom/client', () => ({
  default: { createRoot: createRootSpy },
  createRoot: createRootSpy,
}));

vi.mock('./App', () => ({
  default: () => <div>App Mock</div>,
}));

describe('main', () => {
  it('mounts the app into the root element', async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';

    await import('./main');

    expect(createRootSpy).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderSpy).toHaveBeenCalled();
  });
});