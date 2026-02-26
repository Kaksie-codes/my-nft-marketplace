import { Link } from 'react-router-dom';

interface CategoryCardProps {
  image:      string;
  icon:       string;
  title:      string;
  category:   string;
  fullWidth?: boolean; // spans all 4 columns on desktop, shorter height
}

const CategoryCard: React.FC<CategoryCardProps> = ({ image, icon, title, category, fullWidth }) => {
  return (
    <Link
      to={`/marketplace?category=${category}`}
      className={`bg-surface rounded-[20px] group cursor-pointer block ${
        fullWidth ? 'lg:col-span-4' : ''
      }`}
    >
      <div className={`relative rounded-t-[20px] grid place-items-center overflow-hidden ${
        fullWidth ? 'h-[160px]' : 'h-[250px]'
      }`}>
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-all duration-300 blur-sm group-hover:blur-lg"
        />
        <img
          src={icon}
          alt=""
          className="absolute left-1/2 top-[80%] z-20 w-16 h-16 -translate-x-1/2 transition-all duration-300 opacity-0 group-hover:top-1/2 group-hover:opacity-100 group-hover:-translate-y-1/2"
        />
      </div>
      <div className="p-3">
        <h2 className="text-main font-bold text-xl">{title}</h2>
      </div>
    </Link>
  );
};

export default CategoryCard;