
interface TrendingCollectionCardProps {
  bannerImg: string;
  thumbnails: string[]; // first two images
  count: number;
  title: string;
  creatorImg: string;
  creatorName: string;
}

const TrendingCollectionCard: React.FC<TrendingCollectionCardProps> = ({
  bannerImg,
  thumbnails,
  count,
  title,
  creatorImg,
  creatorName,
}) => {
  return (
    <div className="">
      <div className="rounded-[10px] overflow-hidden">
        <img src={bannerImg} alt="nft banner" />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-[12px]">
         <img src={thumbnails[0]} alt="nft thumb 1" className="rounded-[5px]"/>
         <img src={thumbnails[1]} alt="nft thumb 2" className="rounded-[5px]"/>
         <div className="rounded-[5px] bg-primary grid place-items-center font-bold text-white">
            {count > 99 ? "99+" : count}
         </div>
      </div>
      <div className="py-3">
        <h2 className="text-main font-bold text-xl">{title}</h2>
        <div className="flex gap-3 pt-2">
          <img src={creatorImg} alt="creator avatar"  className="rounded-full"/>
          <p className="text-main">{creatorName}</p>
        </div>
      </div>
    </div>
  )
}

export default TrendingCollectionCard
