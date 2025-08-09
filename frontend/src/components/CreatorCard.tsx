
interface CreatorCardProps {
  rank: number;
  image: string;
  name: string;
  sales: string;
}


const CreatorCard: React.FC<CreatorCardProps> = ({ rank, image, name, sales }) => {
  return (
  <div className="bg-surface group border shadow-lg border-transparent rounded-[10px] p-4 relative grid place-items-center transition-all duration-300 hover:shadow-xl group cursor-pointer hover:bg-background hover:border-surface">
      <div className="h-7 w-7 absolute top-4 left-4 rounded-full bg-background text-main flex items-center justify-center group-hover:bg-surface">{rank}</div>
      <img src={image} alt={name} className="rounded-full w-[150px] h-[150px] transition-transform duration-300 group-hover:-translate-y-2" />
      <h3 className="text-lg font-semibold text-main">{name}</h3>
      <div className="flex gap-3">
          <span className="text-sm text-muted">Total Sales:</span>
          <span className="text-sm text-main">{sales}</span>
      </div>
    </div>
  )
}

export default CreatorCard
