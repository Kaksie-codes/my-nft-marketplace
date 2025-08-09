import CategoryCard from "./CategoryCard"

const BrowseCategoriesSection = () => {
  const categories = [
    { image: '/art.png', icon: '/Paintbrush.png', title: 'Art' },
    { image: '/collectibles.png', icon: '/collect.png', title: 'Collectibles' },
    { image: '/guitar.png', icon: '/music_notes.png', title: 'Music' },
    { image: '/photography.png', icon: '/Camera.png', title: 'Photography' },
    { image: '/video.png', icon: '/VideoCamera.png', title: 'Video' },
    { image: '/utility.png', icon: '/MagicWand.png', title: 'Utility' },
    { image: '/sports.png', icon: '/Basketball.png', title: 'Sports' },
    { image: '/virtual.png', icon: '/Planet.png', title: 'Virtual Worlds' },
  ];
  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container ">
          <h2 className="text-main font-bold text-4xl">Browse Categories</h2>
          <p className="text-main text-xl">
            Explore a variety of categories in the NFT Marketplace.
          </p>
          <div className="mt-[40px] grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat, idx) => (
              <CategoryCard
                key={cat.title + idx}
                image={cat.image}
                icon={cat.icon}
                title={cat.title}
              />
            ))}
          </div>
      </div>
    </div>
  )
}

export default BrowseCategoriesSection
