


interface CategoryCardProps {
  image: string;
  icon: string;
  title: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ image, icon, title }) => {
  return (
    <div className="bg-surface rounded-[20px] group cursor-pointer">
      <div className="relative rounded-t-[20px] grid place-items-center overflow-hidden h-[250px]">
        {/* Main image with blur that increases on hover */}
        <img src={image} alt={title} className="w-full h-full object-cover filter transition-all duration-300 blur-sm group-hover:blur-lg" />
        {/* Icon slides up to center on hover */}
        <img 
          src={icon}
          alt=""
          className="absolute left-1/2 top-[80%] z-20 w-16 h-16 -translate-x-1/2 transition-all duration-300 opacity-0 group-hover:top-1/2 group-hover:opacity-100 group-hover:-translate-y-1/2"
        />
      </div>
      <div className="p-3">
        <h2 className="text-main font-bold text-xl">{title}</h2>
      </div>
    </div>
  )
}

export default CategoryCard
