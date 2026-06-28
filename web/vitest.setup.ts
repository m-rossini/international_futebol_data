import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver — required by Recharts' ResponsiveContainer
class MockResizeObserver {
  private callback: ResizeObserverCallback | null = null;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Fire the callback immediately so ResponsiveContainer gets dimensions
    if (this.callback) {
      const rect = target.getBoundingClientRect();
      this.callback(
        [
          {
            contentRect: rect,
            target,
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          },
        ],
        this as unknown as ResizeObserver,
      );
    }
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// jsdom elements have no layout — ResponsiveContainer needs dimensions to render SVG
const bcr = {
  width: 500,
  height: 200,
  top: 0,
  left: 0,
  right: 500,
  bottom: 200,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};
Element.prototype.getBoundingClientRect = () => bcr as DOMRect;
HTMLElement.prototype.getBoundingClientRect = () => bcr as DOMRect;
