function CollectionCardLoader() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-[180px] bg-muted rounded-[10px]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-[70px] bg-muted rounded-[5px]" />
        <div className="h-[70px] bg-muted rounded-[5px]" />
        <div className="h-[70px] bg-muted rounded-[5px]" />
      </div>
      <div className="h-5 bg-muted rounded w-2/3" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}

export default CollectionCardLoader;