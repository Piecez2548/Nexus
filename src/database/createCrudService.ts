// Factory for the standard list/create/update/remove service shape that
// was hand-duplicated (a pure rename over the repository's own
// getAll/add/update/remove, zero added logic) across ~9 feature services.
// Services with real extra logic (accountService.ts's merge, categoryService.ts's
// merge, recipientProfileService.ts) stay hand-written — this only covers
// the ones that were a byte-identical pass-through.
export function createCrudService<T>(repository: {
  getAll: () => Promise<T[]>;
  add: (item: T) => Promise<number>;
  update: (id: number, item: T) => Promise<number>;
  remove: (id: number) => Promise<void>;
}) {
  return {
    list: () => repository.getAll(),
    create: (item: T) => repository.add(item),
    update: (id: number, item: T) => repository.update(id, item),
    remove: (id: number) => repository.remove(id),
  };
}
