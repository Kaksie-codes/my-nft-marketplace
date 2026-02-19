// utils/ipfs.ts
/**
 * IPFS Upload Utilities
 * 
 * This file handles uploading images and metadata to IPFS.
 * We'll use Pinata (free tier) or NFT.Storage (also free)
 * 
 * SETUP REQUIRED:
 * 1. Sign up at https://www.pinata.cloud/ or https://nft.storage/
 * 2. Get your API keys
 * 3. Add to .env (Vite uses .env not .env.local):
 *    VITE_PINATA_JWT=your_jwt_token
 *    OR
 *    VITE_NFT_STORAGE_KEY=your_api_key
 * 
 * NOTE: Vite requires the VITE_ prefix for environment variables
 */

// Metadata structure for ERC721 NFTs (OpenSea standard)
export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // IPFS URL of the image
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
}

/**
 * Upload an image file to IPFS using Pinata
 * @param file - The image file to upload
 * @returns IPFS hash (CID) of the uploaded image
 */
export async function uploadImageToPinata(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const pinataMetadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', pinataOptions);

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image to IPFS');
    }

    const data = await response.json();
    return data.IpfsHash; // Returns the CID
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw error;
  }
}

/**
 * Upload metadata JSON to IPFS using Pinata
 * @param metadata - The NFT metadata object
 * @returns IPFS hash (CID) of the uploaded metadata
 */
export async function uploadMetadataToPinata(metadata: NFTMetadata): Promise<string> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name}-metadata`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    const data = await response.json();
    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading metadata to Pinata:', error);
    throw error;
  }
}

/**
 * Complete upload flow: image + metadata
 * @param file - Image file
 * @param nftData - NFT details (name, description, attributes)
 * @returns IPFS URI for the complete metadata (to be used in mint function)
 */
export async function uploadNFTToPinata(
  file: File,
  nftData: {
    name: string;
    description: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    external_url?: string;
  }
): Promise<string> {
  try {
    // Step 1: Upload image to IPFS
    console.log('Uploading image to IPFS...');
    const imageCID = await uploadImageToPinata(file);
    const imageURI = `ipfs://${imageCID}`;

    console.log('Image uploaded:', imageURI);

    // Step 2: Create metadata with image URI
    const metadata: NFTMetadata = {
      name: nftData.name,
      description: nftData.description,
      image: imageURI,
      attributes: nftData.attributes,
      external_url: nftData.external_url,
    };

    // Step 3: Upload metadata to IPFS
    console.log('Uploading metadata to IPFS...');
    const metadataCID = await uploadMetadataToPinata(metadata);
    const metadataURI = `ipfs://${metadataCID}`;

    console.log('Metadata uploaded:', metadataURI);

    return metadataURI;
  } catch (error) {
    console.error('Error in uploadNFTToPinata:', error);
    throw error;
  }
}

/**
 * Alternative: Using NFT.Storage (simpler, free, no API key limits)
 * Uncomment this section if you prefer NFT.Storage over Pinata
 */

/*
import { NFTStorage, File as NFTFile } from 'nft.storage';

export async function uploadNFTToNFTStorage(
  file: File,
  nftData: {
    name: string;
    description: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  }
): Promise<string> {
  const client = new NFTStorage({ 
    token: import.meta.env.VITE_NFT_STORAGE_KEY! 
  });

  // Convert browser File to NFT.Storage File
  const imageFile = new NFTFile([file], file.name, { type: file.type });

  // Store the NFT (automatically handles image + metadata)
  const metadata = await client.store({
    name: nftData.name,
    description: nftData.description,
    image: imageFile,
    properties: {
      attributes: nftData.attributes || [],
    },
  });

  return metadata.url; // Returns ipfs:// URI
}
*/

/**
 * Helper: Convert IPFS URI to HTTP gateway URL for display
 * @param ipfsURI - IPFS URI (ipfs://...)
 * @returns HTTP URL via public gateway
 */
export function ipfsToHttp(ipfsURI: string): string {
  if (!ipfsURI) return '';
  
  if (ipfsURI.startsWith('ipfs://')) {
    const cid = ipfsURI.replace('ipfs://', '');
    // Using Pinata's gateway (fast and reliable)
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
    // Alternative gateways:
    // return `https://ipfs.io/ipfs/${cid}`;
    // return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  
  return ipfsURI; // Already an HTTP URL
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 50MB)
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File, maxSizeMB: number = 50): string | null {
  // Check file type — images + videos
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
  ];
  if (!validTypes.includes(file.type)) {
    return 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP image, or MP4/WebM video.';
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File too large. Maximum size is ${maxSizeMB}MB.`;
  }

  return null; // Valid
}

