export default class Pageable<T> {
  private _pointer: number;
  readonly stack_size: number;
  private stack: T[];

  constructor(initial_pointer = 0, stack_size = 25, initial_stack: T[] = []) {
    this._pointer = initial_pointer;
    this.stack = initial_stack;
    this.stack_size = stack_size;
  }

  get pointer() {
    return this._pointer;
  }

  get available_pages() {
    return Math.floor(this.stack.length / this.stack_size);
  }

  static from<T>(items: T[], stack_size = 25): Pageable<T> {
    return new Pageable(0, stack_size, items);
  }

  add_item(item: T | T[]) {
    const as_arr = Array.isArray(item) ? item : [item];
    this.stack.push(...as_arr);
  }

  private get_index() {
    const from_index = this._pointer * this.stack_size;
    const to_index = Math.min(this.stack.length, (this._pointer + 1) * this.stack_size);
    return { from_index, to_index };
  }

  get() {
    const { from_index, to_index } = this.get_index();
    return this.stack.slice(from_index, to_index);
  }

  set_pointer(page: number) {
    this._pointer = Math.max(0, Math.min(this.available_pages, page));
  }

  next(): T[] {
    this._pointer = Math.min(this.available_pages, this._pointer + 1);
    return this.get();
  }

  back(): T[] {
    this._pointer = Math.max(0, this._pointer - 1);
    return this.get();
  }
}
