import TrendingCollectionCard from "./TrendingCollectionCard"


const TrendingCollectionSection = () => {
  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container ">
        <h2 className="text-main font-bold text-4xl">Trending Collections</h2>
        <p className="text-main text-xl">Checkout our weekly updated trending collections.</p>
        <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">            
            <TrendingCollectionCard
              bannerImg="/hero_img.svg"
              thumbnails={["/hero_img.svg", "/hero_img.svg", "/hero_img.svg"]}
              count={80}
              title="Collection Two"
              creatorName="Jake Sanders"
              creatorImg="avat.png"
            />           
            <TrendingCollectionCard
              bannerImg="/hero_img.svg"
              thumbnails={["/hero_img.svg", "/hero_img.svg", "/hero_img.svg"]}
              count={80}
              title="Collection Two"
              creatorName="Jake Sanders"
              creatorImg="avat.png"
            />           
            <TrendingCollectionCard
              bannerImg="/hero_img.svg"
              thumbnails={["/hero_img.svg", "/hero_img.svg", "/hero_img.svg"]}
              count={80}
              title="Collection Two"
              creatorName="Jake Sanders"
              creatorImg="avat.png"
            />           
        </div>
      </div>
    </div>
  )
}

export default TrendingCollectionSection
