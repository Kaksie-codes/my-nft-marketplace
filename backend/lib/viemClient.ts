import { createPublicClient, http, defineChain } from 'viem';

const chainId = parseInt(process.env.CHAIN_ID || '84532');
const rpcUrl = process.env.RPC_URL || 'https://sepolia.base.org';

// Dynamically define the chain so this works with any EVM network
const chain = defineChain({
  id: chainId,
  name: 'Custom Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});