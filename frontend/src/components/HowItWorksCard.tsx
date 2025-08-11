

interface HowItWorksCardProps {
  image: string;
  step: string;
  description: string;
}

const HowItWorksCard: React.FC<HowItWorksCardProps> = ({ image, step, description }) => {
  return (
    <div className="p-4 group gap-4 bg-surface rounded-[20px] shadow-md grid place-items-center">
      <img src={image} alt={step} className="rounded-full w-[250px] h-[250px] transition-transform duration-300 group-hover:-translate-y-2" />
      <h3 className="text-lg font-semibold text-main">{step}</h3>
      <p className="text-base text-muted text-center">
        {description}
      </p>
      <div ></div>
    </div>
  )
}

export default HowItWorksCard
