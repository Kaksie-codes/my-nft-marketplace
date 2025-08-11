import NewsletterInput from "./inputs/NewsletterInput";

const NewsLetterSection = () => {
  return (
    <div className='mt-[70px]'>
      <div className="max-w-6xl mx-auto container">
        <div className="w-full flex gap-8 justify-between p-8 items-center  rounded-[20px]  bg-surface">
            <div>
                <img src="/newsletter.png" alt="Newsletter" />
            </div>
            <div>
                <h2 className="font-extrabold text-4xl text-main">Join our weekly digest</h2>
                <p className="text-xl text-main mt-3">Get exclusive promotions & updates straight to your inbox.</p>
                <div className="mt-5 w-full max-w-md">
                  <NewsletterInput />
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}

export default NewsLetterSection
