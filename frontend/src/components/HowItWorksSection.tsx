import HowItWorksCard from "./HowItWorksCard"

const HowItWorksSection = () => {
  const steps = [
    {
      image: '/setup-wallet.png',
      step: 'Step 1',
      description: 'Set up your wallet of choice. Connect it to the Animarket by clicking the wallet icon in the top right corner.',
    },
    {
      image: '/create-collection.png',
      step: 'Step 2',
      description: 'Create your NFT collection. Add social links, a description, profile & banner images, and set a secondary sales fee.',
    },
    {
      image: '/start-selling.png',
      step: 'Step 3',
      description: 'Upload your work, add a title and description, and list them for sale as fixed price or auction.',
    },
  ];
  return (
    <div className='mt-[70px]'>
      <div className="max-w-6xl mx-auto container">
        <h2 className='text-main font-bold text-4xl'>How It Works</h2>
        <p className='text-main text-xl'>
          Learn how to buy, sell, and create NFTs in our marketplace.
        </p>
        <div className="mt-[40px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px]">
          {steps.map((step, idx) => (
            <HowItWorksCard
              key={step.step + idx}
              image={step.image}
              step={step.step}
              description={step.description}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default HowItWorksSection
