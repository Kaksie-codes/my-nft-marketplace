import CategoryCard from './CategoryCard';

const categories = [
  { image: '/art.png',          icon: '/Paintbrush.png',   title: 'Art',            category: 'art'            },
  { image: '/collectibles.png', icon: '/collect.png',      title: 'Collectibles',   category: 'collectibles'   },
  { image: '/guitar.png',       icon: '/music_notes.png',  title: 'Music',          category: 'music'          },
  { image: '/photography.png',  icon: '/Camera.png',       title: 'Photography',    category: 'photography'    },
  { image: '/video.png',        icon: '/VideoCamera.png',  title: 'Video',          category: 'video'          },
  { image: '/utility.png',      icon: '/MagicWand.png',    title: 'Utility',        category: 'utility'        },
  { image: '/sports.png',       icon: '/Basketball.png',   title: 'Sports',         category: 'sports'         },
  { image: '/virtual.png',      icon: '/Planet.png',       title: 'Virtual Worlds', category: 'virtual_worlds' },
  // Others spans full width on desktop — fills the last row completely, looks intentional
  { image: '/art.png',          icon: '/Paintbrush.png',   title: 'Others',         category: 'other', fullWidth: true },
];

const BrowseCategoriesSection = () => {
  return (
    <div className="mt-[80px]">
      <div className="max-w-6xl mx-auto container px-4 sm:px-6 lg:px-8">
        <h2 className="text-main font-bold text-4xl">Browse Categories</h2>
        <p className="text-main text-xl">
          Explore a variety of categories in the NFT Marketplace.
        </p>
        <div className="mt-[40px] grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.category}
              image={cat.image}
              icon={cat.icon}
              title={cat.title}
              category={cat.category}
              fullWidth={'fullWidth' in cat && cat.fullWidth}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrowseCategoriesSection;