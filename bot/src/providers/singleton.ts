type ExtentionsType<T, E> = (instance: T) => E;
export function create_singleton<T, E>(factory: () => T, extentions?: ExtentionsType<T, E>) {
  let instance: T | null = null;

  function get_internal_instance() {
    if (!instance) instance = factory();
    return instance;
  }

  let obj = {
    get instance(): T {
      return get_internal_instance();
    },
  };

  if (extentions) {
    obj = { ...obj, ...extentions(get_internal_instance()) } as { instance: T } & E;
  }

  return obj as { instance: T } & E;
}
