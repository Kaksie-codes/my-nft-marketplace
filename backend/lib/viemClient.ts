import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL!),
});






// // import { createPublicClient, webSocket } from 'viem';
// // import { sepolia } from 'viem/chains';

// // export const publicClient = createPublicClient({
// //   chain: sepolia,
// //   transport: webSocket(process.env.RPC_WS_URL!),
// // });






// import { createPublicClient, webSocket, defineChain } from 'viem';

// const chainId = parseInt(process.env.CHAIN_ID || '11155111'); // Sepolia
// const httpUrl = process.env.RPC_URL!;
// const wsUrl   = process.env.RPC_WS_URL!;

// const chain = defineChain({
//   id: chainId,
//   name: process.env.CHAIN_NAME || 'Sepolia',
//   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
//   rpcUrls: {
//     default: {
//       http: [httpUrl],
//       webSocket: [wsUrl],
//     },
//   },
// });

// export const publicClient = createPublicClient({
//   chain,
//   transport: webSocket(wsUrl),
// });