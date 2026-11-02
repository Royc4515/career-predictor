import { Component } from 'react';

/**
 * Effects are decoration: if one throws (no GPU, driver bug, a library
 * update), it must take itself out, never the page. On error this renders
 * nothing and calls onError so the caller can show the plain state instead.
 */
export default class EffectBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[effects] disabled after error:', error?.message);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
