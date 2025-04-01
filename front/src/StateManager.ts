import type { PathPaint } from '@nextgis/paint';

interface Property<V = any> {
  value: V;
  urlName?: string;
  paintName?: keyof PathPaint;
  forShare?: boolean;
  parseStr: (val: string) => void;
  urlRuntime?: boolean;
}

type State = Record<string, Property>;

type Listener<S extends State = State> = (state: S) => void;

export class StateManager<S extends State = State> {
  state: S = {} as S;

  private listeners: Listener[] = [];

  constructor(state: S) {
    this.state = state;
  }

  getVal(key: keyof S): any {
    const exist = this.state[key];
    return exist?.value;
  }

  set(key: keyof S, value: any) {
    const exist = this.state[key] || {};
    this.state[key] = { ...exist, value };
    this.notify();
  }

  subscribe(cb: Listener) {
    this.listeners.push(cb);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener({ ...this.state });
    });
  }
}
