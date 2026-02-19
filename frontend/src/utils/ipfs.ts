// utils/ipfs.ts
/**
 * IPFS Upload Utilities
 * 
 * This file handles uploading images/videos and metadata to IPFS via Pinata.
 * 
 * SETUP REQUIRED:
 * 1. Sign up at https://www.pinata.cloud/
 * 2. Create an API key (JWT) from the Pinata dashboard
 * 3. Add to your .env file:
 *    VITE_PINATA_JWT=your_jwt_token_here
 * 
 * NOTE: Vite requires the VITE_ prefix for all environment variables.
 */

// ============================================================
//  TYPES
// ============================================================

/**
 * Standard ERC721 metadata format (OpenSea compatible).
 * This is the JSON structure that gets uploaded to IPFS
 * and pointed to by the tokenURI on-chain.
 */
export interface NFTMetadata {
  name: string;
  description: string;
  // IPFS URI of the image (always required — used as thumbnail/preview)
  image: string;
  // IPFS URI of the video/animation (only for video NFTs).
  // OpenSea and most marketplaces use this field to play video NFTs.
  // If this is missing on a video NFT, marketplaces will only show a broken image.
  animation_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
}


// ============================================================
//  UPLOAD IMAGE / VIDEO FILE
// ============================================================

/**
 * Upload any file (image or video) to IPFS via Pinata.
 * Returns the raw IPFS CID (content identifier), NOT the full URI.
 * 
 * @param file - The file to upload (image or video)
 * @returns IPFS CID string (e.g. "QmXyz...")
 */
export async function uploadImageToPinata(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  // Pinata metadata — just the filename for reference in your Pinata dashboard
  formData.append('pinataMetadata', JSON.stringify({ name: file.name }));

  // Use CID v1 (more modern, shorter base32 format)
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file to IPFS: ${errorText}`);
  }

  const data = await response.json();
  return data.IpfsHash; // The CID
}


// ============================================================
//  UPLOAD METADATA JSON
// ============================================================

/**
 * Upload the NFT metadata JSON object to IPFS via Pinata.
 * Returns the raw IPFS CID of the metadata file.
 * 
 * @param metadata - The NFT metadata object (NFTMetadata interface)
 * @returns IPFS CID string (e.g. "QmAbc...")
 */
export async function uploadMetadataToPinata(metadata: NFTMetadata): Promise<string> {
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        // Name this file in your Pinata dashboard for easy identification
        name: `${metadata.name}-metadata`,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload metadata to IPFS: ${errorText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}


// ============================================================
//  COMPLETE UPLOAD FLOW (IMAGE/VIDEO + METADATA)
// ============================================================

/**
 * Full upload pipeline: uploads the file then the metadata to IPFS.
 * Returns the complete ipfs:// URI for the metadata JSON.
 * This URI is what you pass to mintNFT() as the tokenURI argument.
 * 
 * FLOW:
 * 1. Upload image/video file → get file CID
 * 2. Build metadata JSON with image URI (and animation_url for videos)
 * 3. Upload metadata JSON → get metadata CID
 * 4. Return ipfs://<metadataCID>
 * 
 * VIDEO HANDLING:
 * For video NFTs we set both `image` and `animation_url` in the metadata.
 * - `image`         → used as a static thumbnail/preview everywhere
 * - `animation_url` → tells OpenSea and other marketplaces to play the video
 * Without animation_url, video NFTs will show a broken image on marketplaces.
 * 
 * @param file    - The image or video file to upload
 * @param nftData - NFT details: name, description, attributes, etc.
 * @returns Full ipfs:// URI pointing to the metadata JSON
 */
export async function uploadNFTToPinata(
  file: File,
  nftData: {
    name: string;
    description: string;
    // FIX 5: isVideo flag so we can set animation_url for video NFTs
    isVideo?: boolean;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    external_url?: string;
  }
): Promise<string> {
  // ---- Step 1: Upload the file (image or video) ----
  console.log('Uploading file to IPFS...');
  const fileCID = await uploadImageToPinata(file);
  const fileURI = `ipfs://${fileCID}`;
  console.log('File uploaded:', fileURI);

  // ---- Step 2: Build the metadata object ----
  const metadata: NFTMetadata = {
    name: nftData.name,
    description: nftData.description,

    // `image` is always set — for videos this acts as the static thumbnail.
    // Most wallets and marketplaces show this as the preview image.
    image: fileURI,

    // `animation_url` is only set for video NFTs.
    // OpenSea, Rarible, and other marketplaces use this to play the video.
    // Without this, a video NFT will just show a broken/static thumbnail.
    ...(nftData.isVideo && { animation_url: fileURI }),

    attributes: nftData.attributes,
    external_url: nftData.external_url,
  };

  // ---- Step 3: Upload the metadata JSON ----
  console.log('Uploading metadata to IPFS...');
  const metadataCID = await uploadMetadataToPinata(metadata);
  const metadataURI = `ipfs://${metadataCID}`;
  console.log('Metadata uploaded:', metadataURI);

  // This URI goes on-chain as the tokenURI
  return metadataURI;
}


// ============================================================
//  HELPERS
// ============================================================

/**
 * Convert an ipfs:// URI to a browsable HTTP URL via a public gateway.
 * Use this in your frontend to display NFT images from IPFS.
 * 
 * @param ipfsURI - IPFS URI starting with "ipfs://"
 * @returns HTTP URL via Pinata's gateway
 * 
 * EXAMPLE:
 * ipfsToHttp("ipfs://QmXyz...") 
 * → "https://gateway.pinata.cloud/ipfs/QmXyz..."
 */
export function ipfsToHttp(ipfsURI: string): string {
  if (!ipfsURI) return '';
  if (ipfsURI.startsWith('ipfs://')) {
    const cid = ipfsURI.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
    // Alternative gateways if Pinata is slow:
    // return `https://ipfs.io/ipfs/${cid}`;
    // return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  return ipfsURI; // Already an HTTP URL, return as-is
}

/**
 * Validate a file before uploading to IPFS.
 * Returns an error message string if invalid, or null if valid.
 * 
 * @param file       - File to validate
 * @param maxSizeMB  - Maximum allowed size in MB (default 50MB)
 * @returns Error message string, or null if file is valid
 */
export function validateImageFile(file: File, maxSizeMB: number = 50): string | null {
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
  ];

  if (!validTypes.includes(file.type)) {
    return 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP image or MP4/WebM video.';
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File too large. Maximum size is ${maxSizeMB}MB.`;
  }

  return null; // Valid
}





// // utils/ipfs.ts
// /**
//  * IPFS Upload Utilities
//  * 
//  * This file handles uploading images and metadata to IPFS.
//  * We'll use Pinata (free tier) or NFT.Storage (also free)
//  * 
//  * SETUP REQUIRED:
//  * 1. Sign up at https://www.pinata.cloud/ or https://nft.storage/
//  * 2. Get your API keys
//  * 3. Add to .env (Vite uses .env not .env.local):
//  *    VITE_PINATA_JWT=your_jwt_token
//  *    OR
//  *    VITE_NFT_STORAGE_KEY=your_api_key
//  * 
//  * NOTE: Vite requires the VITE_ prefix for environment variables
//  */

// // Metadata structure for ERC721 NFTs (OpenSea standard)
// export interface NFTMetadata {
//   name: string;
//   description: string;
//   image: string; // IPFS URL of the image
//   attributes?: Array<{
//     trait_type: string;
//     value: string | number;
//   }>;
//   external_url?: string;
// }

// /**
//  * Upload an image file to IPFS using Pinata
//  * @param file - The image file to upload
//  * @returns IPFS hash (CID) of the uploaded image
//  */
// export async function uploadImageToPinata(file: File): Promise<string> {
//   const formData = new FormData();
//   formData.append('file', file);

//   const pinataMetadata = JSON.stringify({
//     name: file.name,
//   });
//   formData.append('pinataMetadata', pinataMetadata);

//   const pinataOptions = JSON.stringify({
//     cidVersion: 1,
//   });
//   formData.append('pinataOptions', pinataOptions);

//   try {
//     const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
//       },
//       body: formData,
//     });

//     if (!response.ok) {
//       throw new Error('Failed to upload image to IPFS');
//     }

//     const data = await response.json();
//     return data.IpfsHash; // Returns the CID
//   } catch (error) {
//     console.error('Error uploading to Pinata:', error);
//     throw error;
//   }
// }

// /**
//  * Upload metadata JSON to IPFS using Pinata
//  * @param metadata - The NFT metadata object
//  * @returns IPFS hash (CID) of the uploaded metadata
//  */
// export async function uploadMetadataToPinata(metadata: NFTMetadata): Promise<string> {
//   try {
//     const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
//       },
//       body: JSON.stringify({
//         pinataContent: metadata,
//         pinataMetadata: {
//           name: `${metadata.name}-metadata`,
//         },
//       }),
//     });

//     if (!response.ok) {
//       throw new Error('Failed to upload metadata to IPFS');
//     }

//     const data = await response.json();
//     return data.IpfsHash;
//   } catch (error) {
//     console.error('Error uploading metadata to Pinata:', error);
//     throw error;
//   }
// }

// /**
//  * Complete upload flow: image + metadata
//  * @param file - Image file
//  * @param nftData - NFT details (name, description, attributes)
//  * @returns IPFS URI for the complete metadata (to be used in mint function)
//  */
// export async function uploadNFTToPinata(
//   file: File,
//   nftData: {
//     name: string;
//     description: string;
//     attributes?: Array<{ trait_type: string; value: string | number }>;
//     external_url?: string;
//   }
// ): Promise<string> {
//   try {
//     // Step 1: Upload image to IPFS
//     console.log('Uploading image to IPFS...');
//     const imageCID = await uploadImageToPinata(file);
//     const imageURI = `ipfs://${imageCID}`;

//     console.log('Image uploaded:', imageURI);

//     // Step 2: Create metadata with image URI
//     const metadata: NFTMetadata = {
//       name: nftData.name,
//       description: nftData.description,
//       image: imageURI,
//       attributes: nftData.attributes,
//       external_url: nftData.external_url,
//     };

//     // Step 3: Upload metadata to IPFS
//     console.log('Uploading metadata to IPFS...');
//     const metadataCID = await uploadMetadataToPinata(metadata);
//     const metadataURI = `ipfs://${metadataCID}`;

//     console.log('Metadata uploaded:', metadataURI);

//     return metadataURI;
//   } catch (error) {
//     console.error('Error in uploadNFTToPinata:', error);
//     throw error;
//   }
// }

// /**
//  * Alternative: Using NFT.Storage (simpler, free, no API key limits)
//  * Uncomment this section if you prefer NFT.Storage over Pinata
//  */

// /*
// import { NFTStorage, File as NFTFile } from 'nft.storage';

// export async function uploadNFTToNFTStorage(
//   file: File,
//   nftData: {
//     name: string;
//     description: string;
//     attributes?: Array<{ trait_type: string; value: string | number }>;
//   }
// ): Promise<string> {
//   const client = new NFTStorage({ 
//     token: import.meta.env.VITE_NFT_STORAGE_KEY! 
//   });

//   // Convert browser File to NFT.Storage File
//   const imageFile = new NFTFile([file], file.name, { type: file.type });

//   // Store the NFT (automatically handles image + metadata)
//   const metadata = await client.store({
//     name: nftData.name,
//     description: nftData.description,
//     image: imageFile,
//     properties: {
//       attributes: nftData.attributes || [],
//     },
//   });

//   return metadata.url; // Returns ipfs:// URI
// }
// */

// /**
//  * Helper: Convert IPFS URI to HTTP gateway URL for display
//  * @param ipfsURI - IPFS URI (ipfs://...)
//  * @returns HTTP URL via public gateway
//  */
// export function ipfsToHttp(ipfsURI: string): string {
//   if (!ipfsURI) return '';
  
//   if (ipfsURI.startsWith('ipfs://')) {
//     const cid = ipfsURI.replace('ipfs://', '');
//     // Using Pinata's gateway (fast and reliable)
//     return `https://gateway.pinata.cloud/ipfs/${cid}`;
//     // Alternative gateways:
//     // return `https://ipfs.io/ipfs/${cid}`;
//     // return `https://cloudflare-ipfs.com/ipfs/${cid}`;
//   }
  
//   return ipfsURI; // Already an HTTP URL
// }

// /**
//  * Validate file before upload
//  * @param file - File to validate
//  * @param maxSizeMB - Maximum file size in MB (default 50MB)
//  * @returns Error message if invalid, null if valid
//  */
// export function validateImageFile(file: File, maxSizeMB: number = 50): string | null {
//   // Check file type — images + videos
//   const validTypes = [
//     'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
//     'video/mp4', 'video/webm', 'video/quicktime',
//   ];
//   if (!validTypes.includes(file.type)) {
//     return 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP image, or MP4/WebM video.';
//   }

//   // Check file size
//   const maxSizeBytes = maxSizeMB * 1024 * 1024;
//   if (file.size > maxSizeBytes) {
//     return `File too large. Maximum size is ${maxSizeMB}MB.`;
//   }

//   return null; // Valid
// }

