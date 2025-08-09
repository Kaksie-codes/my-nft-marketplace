import Herosection from '../components/Herosection'
import RegularPageWrapper from '../components/RegularPageWrapper'
import TopCreatorsSection from '../components/TopCreatorsSection'
import TrendingCollectionSection from '../components/TrendingCollectionSection'

const HomePage = () => {
  return (
    <RegularPageWrapper>
      <Herosection />
      <TrendingCollectionSection />
      <TopCreatorsSection/>
    </RegularPageWrapper>
  )
}

export default HomePage
