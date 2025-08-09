import BrowseCategoriesSection from '../components/BrowseCategoriesSection'
import DiscoverMoreNFTsSection from '../components/DiscoverMoreNFTsSection'
import Herosection from '../components/Herosection'
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
    </RegularPageWrapper>
  )
}

export default HomePage
