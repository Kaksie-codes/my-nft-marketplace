import BrowseCategoriesSection from '../components/BrowseCategoriesSection'
import DiscoverMoreNFTsSection from '../components/DiscoverMoreNFTsSection'
import Herosection from '../components/Herosection'
import HighlightSection from '../components/HighlightSection'
import HowItWorksSection from '../components/HowItWorksSection'
import NewsLetterSection from '../components/NewsLetterSection'
import RegularPageWrapper from '../components/RegularPageWrapper'
import TopCreatorsSection from '../components/TopCreatorsSection'
import TrendingCollectionSection from '../components/TrendingCollectionSection'

const HomePage = () => {
  return (
    <RegularPageWrapper>
      <Herosection />
      <TrendingCollectionSection />
      <TopCreatorsSection />
      <BrowseCategoriesSection />
      <DiscoverMoreNFTsSection />
      <HighlightSection />
      <HowItWorksSection />
      <NewsLetterSection/>
    </RegularPageWrapper>
  )
}

export default HomePage
