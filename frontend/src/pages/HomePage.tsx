import Herosection from '../components/Herosection'
import RegularPageWrapper from '../components/RegularPageWrapper'
import TrendingCollectionSection from '../components/TrendingCollectionSection'

const HomePage = () => {
  return (
    <RegularPageWrapper>
      <Herosection />
      <TrendingCollectionSection />
    </RegularPageWrapper>
  )
}

export default HomePage
