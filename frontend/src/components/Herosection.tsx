import Button from "./button/Button"

const Herosection = () => {
  return (
    <div className="">
        <section className="max-w-6xl mx-auto container py-[50px] px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="max-w-[500px] flex flex-col gap-[20px]">
                <h1 className="text-6xl font-extrabold text-main">
                    Discover digital art & Collect NFTs
                </h1>
                <p className="mt-4 text-main text-xl">
                    NFT marketplace UI created with Anima for Figma. Collect, buy and sell art from more than 20k NFT artists.
                </p>
                <Button
                    onClick={() => console.log("Button clicked")}
                    variant="primary"
                    sxclass="px-8 w-fit"
                    size="lg"
                >
                    Get Started
                </Button>
                <div className="flex justify-between items-center max-w-[410px]">
                    <div>
                        <h2 className="text-main font-bold text-xl">240k+</h2>
                        <p className="text-main">total sale</p>
                    </div>
                    <div>
                        <h2 className="text-main font-bold text-xl">240k+</h2>
                        <p className="text-main">total sale</p>
                    </div>
                    <div>
                        <h2 className="text-main font-bold text-xl">240k+</h2>
                        <p className="text-main">total sale</p>
                    </div>
                </div>
            </div>
            <div className="grid place-items-center">
                <div className="bg-surface max-w-[400px] rounded-[20px] shadow-md">
                    <div>
                        <img src="/hero_img.svg" alt="nft banner" />
                    </div>
                    <div className="p-4">
                        <h2 className="text-main font-bold text-xl">Space Walking</h2>
                        <div className="flex gap-3 pt-2">
                            <img src="/avat.png" alt=""  className="rounded-full"/>
                            <p className="text-main">Anima kid</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>      
    </div>
  )
}

export default Herosection
