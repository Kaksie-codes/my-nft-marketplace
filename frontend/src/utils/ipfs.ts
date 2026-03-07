/**
 * IPFS Upload Utilities
 *
 * File/metadata uploads go through our own backend (/api/upload/*).
 * The Pinata JWT lives in backend .env only — never exposed to the browser.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NFTMetadata {
  name:           string;
  description:    string;
  image:          string;
  animation_url?: string;
  attributes?:    Array<{ trait_type: string; value: string | number }>;
  external_url?:  string;
}

// ── Core upload helpers ───────────────────────────────────────────────────────

/**
 * Upload any file (image or video) via the backend proxy.
 * Returns the raw IPFS CID.
 */
export async function uploadImageToPinata(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_BASE}/api/upload/file`, {
    method: 'POST',
    body:   form,
    // Do NOT set Content-Type — browser sets it with boundary automatically
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${text}`);
  }

  const json = await response.json() as { success: boolean; data: { ipfsHash: string } };
  if (!json.success) throw new Error('Upload failed');
  return json.data.ipfsHash;
}

/**
 * Upload a profile avatar via the backend proxy.
 * Returns a full ipfs:// URI.
 */
export async function uploadAvatarToPinata(file: File): Promise<string> {
  const cid = await uploadImageToPinata(file);
  return `ipfs://${cid}`;
}

/**
 * Upload NFT metadata JSON via the backend proxy.
 * Returns the raw IPFS CID.
 */
export async function uploadMetadataToPinata(metadata: NFTMetadata): Promise<string> {
  const response = await fetch(`${API_BASE}/api/upload/metadata`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(metadata),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Metadata upload failed: ${text}`);
  }

  const json = await response.json() as { success: boolean; data: { ipfsHash: string } };
  if (!json.success) throw new Error('Metadata upload failed');
  return json.data.ipfsHash;
}

// ── Full NFT upload flow ──────────────────────────────────────────────────────

/**
 * Uploads file + metadata to IPFS via the backend.
 * Returns the ipfs:// URI for the metadata JSON — pass this to mintNFT().
 */
export async function uploadNFTToPinata(
  file: File,
  nftData: {
    name:          string;
    description:   string;
    isVideo?:      boolean;
    attributes?:   Array<{ trait_type: string; value: string | number }>;
    external_url?: string;
  }
): Promise<string> {
  console.log('Uploading file to IPFS via backend...');
  const fileCID = await uploadImageToPinata(file);
  const fileURI = `ipfs://${fileCID}`;
  console.log('File uploaded:', fileURI);

  const metadata: NFTMetadata = {
    name:        nftData.name,
    description: nftData.description,
    image:       fileURI,
    // For video NFTs: animation_url tells OpenSea/marketplaces to play the video.
    // Without it, video NFTs show a broken thumbnail.
    ...(nftData.isVideo && { animation_url: fileURI }),
    attributes:   nftData.attributes,
    external_url: nftData.external_url,
  };

  console.log('Uploading metadata to IPFS via backend...');
  const metadataCID = await uploadMetadataToPinata(metadata);
  const metadataURI = `ipfs://${metadataCID}`;
  console.log('Metadata uploaded:', metadataURI);

  return metadataURI;
}

// ── Helpers (unchanged) ───────────────────────────────────────────────────────

export function ipfsToHttp(ipfsURI: string): string {
  if (!ipfsURI) return '';
  if (ipfsURI.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsURI.replace('ipfs://', '')}`;
  }
  return ipfsURI;
}

export function validateImageFile(file: File, maxSizeMB = 50): string | null {
  const valid = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
  ];
  if (!valid.includes(file.type)) {
    return 'Invalid file type. Use JPEG, PNG, GIF, WebP, MP4, or WebM.';
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File too large. Maximum is ${maxSizeMB}MB.`;
  }
  return null;
}

export function resolveIpfsUrl(url: string): string {
  if (!url) return '/nft-placeholder.png';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
}






























// // utils/ipfs.ts
// /**
//  * IPFS Upload Utilities
//  * 
//  * This file handles uploading images/videos and metadata to IPFS via Pinata.
//  * 
//  * SETUP REQUIRED:
//  * 1. Sign up at https://www.pinata.cloud/
//  * 2. Create an API key (JWT) from the Pinata dashboard
//  * 3. Add to your .env file:
//  *    VITE_PINATA_JWT=your_jwt_token_here
//  * 
//  * NOTE: Vite requires the VITE_ prefix for all environment variables.
//  */

// // ============================================================
// //  TYPES
// // ============================================================

// export interface NFTMetadata {
//   name: string;
//   description: string;
//   image: string;
//   animation_url?: string;
//   attributes?: Array<{
//     trait_type: string;
//     value: string | number;
//   }>;
//   external_url?: string;
// }


// // ============================================================
// //  UPLOAD IMAGE / VIDEO FILE
// // ============================================================

// export async function uploadImageToPinata(file: File): Promise<string> {
//   const formData = new FormData();
//   formData.append('file', file);
//   formData.append('pinataMetadata', JSON.stringify({ name: file.name }));
//   formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

//   const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
//     },
//     body: formData,
//   });

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`Failed to upload file to IPFS: ${errorText}`);
//   }

//   const data = await response.json();
//   return data.IpfsHash;
// }


// // ============================================================
// //  UPLOAD AVATAR
// // ============================================================

// /**
//  * Upload a profile avatar image to Pinata/IPFS.
//  * Returns a full ipfs:// URI ready to store in the user profile.
//  *
//  * @param file - The image file selected from the user's computer
//  * @returns ipfs:// URI string (e.g. "ipfs://bafkrei...")
//  */
// export async function uploadAvatarToPinata(file: File): Promise<string> {
//   const formData = new FormData();
//   formData.append('file', file);
//   formData.append('pinataMetadata', JSON.stringify({ name: `avatar-${Date.now()}` }));
//   formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

//   const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
//     },
//     body: formData,
//   });

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`Failed to upload avatar: ${errorText}`);
//   }

//   const data = await response.json();
//   return `ipfs://${data.IpfsHash}`;
// }


// // ============================================================
// //  UPLOAD METADATA JSON
// // ============================================================

// export async function uploadMetadataToPinata(metadata: NFTMetadata): Promise<string> {
//   const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
//     },
//     body: JSON.stringify({
//       pinataContent: metadata,
//       pinataMetadata: { name: `${metadata.name}-metadata` },
//     }),
//   });

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`Failed to upload metadata to IPFS: ${errorText}`);
//   }

//   const data = await response.json();
//   return data.IpfsHash;
// }


// // ============================================================
// //  COMPLETE UPLOAD FLOW (IMAGE/VIDEO + METADATA)
// // ============================================================

// export async function uploadNFTToPinata(
//   file: File,
//   nftData: {
//     name: string;
//     description: string;
//     isVideo?: boolean;
//     attributes?: Array<{ trait_type: string; value: string | number }>;
//     external_url?: string;
//   }
// ): Promise<string> {
//   console.log('Uploading file to IPFS...');
//   const fileCID = await uploadImageToPinata(file);
//   const fileURI = `ipfs://${fileCID}`;
//   console.log('File uploaded:', fileURI);

//   const metadata: NFTMetadata = {
//     name:        nftData.name,
//     description: nftData.description,
//     image:       fileURI,
//     ...(nftData.isVideo && { animation_url: fileURI }),
//     attributes:  nftData.attributes,
//     external_url: nftData.external_url,
//   };

//   console.log('Uploading metadata to IPFS...');
//   const metadataCID = await uploadMetadataToPinata(metadata);
//   const metadataURI = `ipfs://${metadataCID}`;
//   console.log('Metadata uploaded:', metadataURI);

//   return metadataURI;
// }


// // ============================================================
// //  HELPERS
// // ============================================================

// export function ipfsToHttp(ipfsURI: string): string {
//   if (!ipfsURI) return '';
//   if (ipfsURI.startsWith('ipfs://')) {
//     const cid = ipfsURI.replace('ipfs://', '');
//     return `https://gateway.pinata.cloud/ipfs/${cid}`;
//   }
//   return ipfsURI;
// }

// export function validateImageFile(file: File, maxSizeMB: number = 50): string | null {
//   const validTypes = [
//     'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
//     'video/mp4', 'video/webm', 'video/quicktime',
//   ];
//   if (!validTypes.includes(file.type)) {
//     return 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP image or MP4/WebM video.';
//   }
//   const maxSizeBytes = maxSizeMB * 1024 * 1024;
//   if (file.size > maxSizeBytes) {
//     return `File too large. Maximum size is ${maxSizeMB}MB.`;
//   }
//   return null;
// }

// export function resolveIpfsUrl(url: string): string {
//   if (!url) return '/nft-placeholder.png';
//   if (url.startsWith('ipfs://')) {
//     return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
//   }
//   return url;
// }
