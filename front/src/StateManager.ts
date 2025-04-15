import type { PathPaint } from '@nextgis/paint';

interface Property<V = any> {
  value: V;
  urlName?: string;
  paintName?: keyof PathPaint;
  forShare?: 'map' | 'style' | boolean;
  parseStr: (val: string) => void;
  urlRuntime?: boolean;
  toString?: (val: unknown) => string;
}

type StateFromConfig<T> = {
  [K in keyof T]: Property<T[K]>;
};

type Listener<S> = (state: S) => void;

export class StateManager<T> {
  state: StateFromConfig<T>;
  private listeners: Listener<StateFromConfig<T>>[] = [];

  constructor(state: StateFromConfig<T>) {
    this.state = state;
  }

  getVal<K extends keyof T>(key: K): T[K] {
    const exist = this.state[key];
    return exist.value;
  }

  getString<K extends keyof T>(key: K): string {
    const prop = this.state[key];

    if (
      prop.toString &&
      Object.prototype.hasOwnProperty.call(prop, 'toString')
    ) {
      return prop.toString(prop.value);
    }
    return typeof prop.value === 'object'
      ? JSON.stringify(prop.value)
      : String(prop.value);
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    const exist = this.state[key] || ({} as Property<T[K]>);
    this.state[key] = { ...exist, value };
    this.notify();
  }

  subscribe(cb: Listener<StateFromConfig<T>>) {
    this.listeners.push(cb);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener({ ...this.state });
    });
  }
}
