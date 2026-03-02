

const NFTCardLoader = () => {
  return (
    <div  className="bg-surface rounded-[20px] animate-pulse border border-muted">
    <div className="w-full h-[220px] bg-muted rounded-t-[20px]" />
    <div className="px-4 py-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-muted" />
        <div className="h-3 bg-muted rounded w-1/3" />
        </div>
        <div className="flex justify-between mt-2">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-8 bg-muted rounded w-1/3" />
        </div>
    </div>
    </div>
  )
}

export default NFTCardLoader
