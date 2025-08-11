import HowItWorksCard from "./HowItWorksCard"

const HowItWorksSection = () => {
  const steps = [
    {
      image: '/setup-wallet.png',
      step: 'Setup Your wallet',
      description: 'Set up your wallet of choice. Connect it to the Animarket by clicking the wallet icon in the top right corner.',
    },
    {
      image: '/create-collection.png',
      step: 'Create Your NFT Collection',
      description: 'Upload your work and setup your collection. Add a description, social links and floor price.',
    },
    {
      image: '/start-earning.png',
      step: 'Start Earning',
      description: 'Choose between auctions and fixed-price listings. Start earning by selling your NFTs or trading others.',
    },
  ];
  return (
    <div className='mt-[70px]'>
      <div className="max-w-6xl mx-auto container">
        <h2 className='text-main font-bold text-4xl'>How It Works</h2>
        <p className='text-main text-xl'>
          Find out how to get started with our NFT marketplace.
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
