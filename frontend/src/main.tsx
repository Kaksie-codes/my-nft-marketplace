import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider.tsx'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './lib/rainbowkitConfig.ts'
import { UserProvider } from './context/UserContext.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              {/* UserProvider must be inside WagmiProvider so useUserSync
                  can access useAccount from wagmi */}
              <UserProvider>
                <App />
              </UserProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)





// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import '@rainbow-me/rainbowkit/styles.css'
// import App from './App.tsx'
// import { BrowserRouter } from 'react-router-dom'
// import { ThemeProvider } from './context/ThemeProvider.tsx'
// import { WagmiProvider } from 'wagmi'
// import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { wagmiConfig } from './lib/rainbowkitConfig.ts'

// const queryClient = new QueryClient()

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <BrowserRouter>
//       <ThemeProvider>
//         <WagmiProvider config={wagmiConfig}>
//           <QueryClientProvider client={queryClient}>
//             <RainbowKitProvider>
//               <App />
//             </RainbowKitProvider>
//           </QueryClientProvider>
//         </WagmiProvider>
//       </ThemeProvider>
//     </BrowserRouter>
//   </StrictMode>,
// )
