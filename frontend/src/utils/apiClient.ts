// Base URL from environment — falls back to localhost for development
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ── Response shape from our backend ─────────────────────────────────────────
// Matches the response utility we built on the backend

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
type ApiPaginatedResponse<T> = PaginatedResponse<T> | ErrorResponse;

// ── Error class ──────────────────────────────────────────────────────────────
export class ApiError extends Error {
  message: string;
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.message = message;
    this.status = status;
  }
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new ApiError(json.error, response.status);
  }

  return json.data;
}

// ── Paginated fetch wrapper ──────────────────────────────────────────────────
async function requestPaginated<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<PaginatedResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const json: ApiPaginatedResponse<T> = await response.json();

  if (!json.success) {
    throw new ApiError((json as ErrorResponse).error, response.status);
  }

  return json as PaginatedResponse<T>;
}

// ── Convenience methods ──────────────────────────────────────────────────────
export const api = {
  get: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'GET' }),

  getPaginated: <T>(endpoint: string) =>
    requestPaginated<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// ── Typed API calls ──────────────────────────────────────────────────────────
// Centralise all endpoint calls here so routes are never hardcoded in components

export type UserProfile = {
  _id: string;
  address: string;
  username?: string;
  avatar?: string;
  createdAt: string;
};

export type NFT = {
  _id: string;
  tokenId: string;
  collection: string;
  owner: string;
  minter: string;
  tokenURI: string;
  category: string;
  metadata?: Record<string, unknown>;
  mintedAt: string;
  listing?: Listing | null;
  activeListing?: Listing | null;
};

export type Collection = {
  _id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  maxSupply: string;
  maxPerWallet: string;
  mintPrice: string;
  nftCount?: number;
  publicMintEnabled?: boolean;
  collaborators?: string[];
  createdAt: string;
};

export type Listing = {
  _id: string;
  listingId: string;
  type: 'fixed' | 'auction';
  collection: string;
  tokenId: string;
  seller: string;
  price: string;
  buyoutPrice?: string;
  highestBid?: string;
  highestBidder?: string;
  endTime?: string;
  buyer?: string;
  status: 'active' | 'sold' | 'cancelled' | 'ended';
  createdAt: string;
};

export type Activity = {
  _id: string;
  type: 'mint' | 'sale' | 'bid' | 'transfer' | 'list' | 'cancel' | 'price_update';
  collection: string;
  tokenId: string;
  from?: string;
  to?: string;
  price?: string;
  listingId?: string;
  timestamp: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// Users
export const usersApi = {
  connect:     (address: string) =>
    api.post<UserProfile>('/api/users/connect', { address }),

  updateProfile: (address: string, data: { username?: string; avatar?: string }) =>
    api.put<UserProfile>('/api/users/profile', { address, ...data }),

  getProfile:  (address: string) =>
    api.get<UserProfile>(`/api/users/${address}`),

  // filter='all' returns NFTs where owner OR minter === address,
  // so sold NFTs still appear under "Created" on the profile page.
  // Optional category param enables server-side filtering by category.
  getNFTs: (
    address:   string,
    page      = 1,
    limit     = 20,
    filter:    'owned' | 'created' | 'all' = 'owned',
    category?: string,
  ) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), filter });
    if (category) params.set('category', category);
    return api.getPaginated<NFT>(`/api/users/${address}/nfts?${params}`);
  },

  getActivity: (address: string, page = 1, limit = 20) =>
    api.getPaginated<Activity>(`/api/users/${address}/activity?page=${page}&limit=${limit}`),

  getTopCreators: (limit = 8, period?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (period) params.append('period', period);
    return api.get<{ address: string; nftCount: number; username?: string | null; avatar?: string | null }[]>(
      `/api/users/top-creators?${params}`
    );
  },
};

// Collections
export const collectionsApi = {
  getAll:    (params?: { creator?: string; collaborator?: string; visibility?: 'public'; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.getPaginated<Collection>(`/api/collections${query ? `?${query}` : ''}`);
  },
  getOne:    (address: string) =>
    api.get<Collection & { nftCount: number }>(`/api/collections/${address}`),

  getNFTs:   (address: string, page = 1, limit = 20) =>
    api.getPaginated<NFT>(`/api/collections/${address}/nfts?page=${page}&limit=${limit}`),
};

// NFTs
export const nftsApi = {
  getOne:      (collection: string, tokenId: string) =>
    api.get<NFT & { activeListing: Listing | null }>(`/api/nfts/${collection}/${tokenId}`),

  getByCategory: (category: string, page = 1, limit = 20) =>
    api.getPaginated<NFT>(`/api/nfts/category/${category}?page=${page}&limit=${limit}`),

  getAll: (page = 1, limit = 20) =>
    api.getPaginated<NFT>(`/api/nfts?page=${page}&limit=${limit}`),
};

// Listings
export const listingsApi = {
  getAll:     (params?: { status?: string; seller?: string; collection?: string; page?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.getPaginated<Listing>(`/api/listings${query ? `?${query}` : ''}`);
  },
  getOne:     (listingId: string) =>
    api.get<Listing>(`/api/listings/${listingId}`),

  getAuctions: (page = 1, limit = 20) =>
    api.getPaginated<Listing>(`/api/listings/auctions?page=${page}&limit=${limit}`),

  getFixed:   (page = 1, limit = 20) =>
    api.getPaginated<Listing>(`/api/listings/fixed?page=${page}&limit=${limit}`),
};

// Activity
export const activityApi = {
  getAll: (params?: { type?: string; collection?: string; page?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.getPaginated<Activity>(`/api/activity${query ? `?${query}` : ''}`);
  },
};





// // Base URL from environment — falls back to localhost for development
// const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// // ── Response shape from our backend ─────────────────────────────────────────
// // Matches the response utility we built on the backend

// interface SuccessResponse<T> {
//   success: true;
//   data: T;
// }

// interface PaginatedResponse<T> {
//   success: true;
//   data: T[];
//   pagination: {
//     total: number;
//     page: number;
//     limit: number;
//     pages: number;
//   };
// }

// interface ErrorResponse {
//   success: false;
//   error: string;
// }

// type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
// type ApiPaginatedResponse<T> = PaginatedResponse<T> | ErrorResponse;

// // ── Error class ──────────────────────────────────────────────────────────────
// export class ApiError extends Error {
//   message: string;
//   status?: number;

//   constructor(message: string, status?: number) {
//     super(message);
//     this.name = 'ApiError';
//     this.message = message;
//     this.status = status;
//   }
// }

// // ── Core fetch wrapper ───────────────────────────────────────────────────────
// async function request<T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<T> {
//   const url = `${BASE_URL}${endpoint}`;

//   const response = await fetch(url, {
//     headers: {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     },
//     ...options,
//   });

//   const json: ApiResponse<T> = await response.json();

//   if (!json.success) {
//     throw new ApiError(json.error, response.status);
//   }

//   return json.data;
// }

// // ── Paginated fetch wrapper ──────────────────────────────────────────────────
// async function requestPaginated<T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<PaginatedResponse<T>> {
//   const url = `${BASE_URL}${endpoint}`;

//   const response = await fetch(url, {
//     headers: {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     },
//     ...options,
//   });

//   const json: ApiPaginatedResponse<T> = await response.json();

//   if (!json.success) {
//     throw new ApiError((json as ErrorResponse).error, response.status);
//   }

//   return json as PaginatedResponse<T>;
// }

// // ── Convenience methods ──────────────────────────────────────────────────────
// export const api = {
//   get: <T>(endpoint: string) =>
//     request<T>(endpoint, { method: 'GET' }),

//   getPaginated: <T>(endpoint: string) =>
//     requestPaginated<T>(endpoint, { method: 'GET' }),

//   post: <T>(endpoint: string, body: unknown) =>
//     request<T>(endpoint, {
//       method: 'POST',
//       body: JSON.stringify(body),
//     }),

//   put: <T>(endpoint: string, body: unknown) =>
//     request<T>(endpoint, {
//       method: 'PUT',
//       body: JSON.stringify(body),
//     }),

//   delete: <T>(endpoint: string) =>
//     request<T>(endpoint, { method: 'DELETE' }),
// };

// // ── Typed API calls ──────────────────────────────────────────────────────────
// // Centralise all endpoint calls here so routes are never hardcoded in components

// export type UserProfile = {
//   _id: string;
//   address: string;
//   username?: string;
//   avatar?: string;
//   createdAt: string;
// };

// export type NFT = {
//   _id: string;
//   tokenId: string;
//   collection: string;
//   owner: string;
//   minter: string;
//   tokenURI: string;
//   category: string;
//   metadata?: Record<string, unknown>;
//   mintedAt: string;
//   listing?: Listing | null;
//   activeListing?: Listing | null;
// };

// export type Collection = {
//   _id: string;
//   address: string;
//   creator: string;
//   name: string;
//   symbol: string;
//   maxSupply: string;
//   maxPerWallet: string;
//   mintPrice: string;
//   nftCount?: number;
//   publicMintEnabled?: boolean;
//   collaborators?: string[];
//   createdAt: string;
// };

// export type Listing = {
//   _id: string;
//   listingId: string;
//   type: 'fixed' | 'auction';
//   collection: string;
//   tokenId: string;
//   seller: string;
//   price: string;
//   buyoutPrice?: string;
//   highestBid?: string;
//   highestBidder?: string;
//   endTime?: string;
//   buyer?: string;
//   status: 'active' | 'sold' | 'cancelled' | 'ended';
//   createdAt: string;
// };

// export type Activity = {
//   _id: string;
//   type: 'mint' | 'sale' | 'bid' | 'transfer' | 'list' | 'cancel' | 'price_update';
//   collection: string;
//   tokenId: string;
//   from?: string;
//   to?: string;
//   price?: string;
//   listingId?: string;
//   timestamp: string;
// };

// export type PaginationMeta = {
//   total: number;
//   page: number;
//   limit: number;
//   pages: number;
// };

// // Users
// export const usersApi = {
//   connect:     (address: string) =>
//     api.post<UserProfile>('/api/users/connect', { address }),

//   updateProfile: (address: string, data: { username?: string; avatar?: string }) =>
//     api.put<UserProfile>('/api/users/profile', { address, ...data }),

//   getProfile:  (address: string) =>
//     api.get<UserProfile>(`/api/users/${address}`),

//   // filter='all' returns NFTs where owner OR minter === address,
//   // so sold NFTs still appear under "Created" on the profile page.
//   getNFTs:     (address: string, page = 1, limit = 20, filter: 'owned' | 'created' | 'all' = 'owned') =>
//     api.getPaginated<NFT>(`/api/users/${address}/nfts?page=${page}&limit=${limit}&filter=${filter}`),

//   getActivity: (address: string, page = 1, limit = 20) =>
//     api.getPaginated<Activity>(`/api/users/${address}/activity?page=${page}&limit=${limit}`),

//   getTopCreators: (limit = 8, period?: string) => {
//     const params = new URLSearchParams({ limit: String(limit) });
//     if (period) params.append('period', period);
//     return api.get<{ address: string; nftCount: number; username?: string | null; avatar?: string | null }[]>(
//       `/api/users/top-creators?${params}`
//     );
//   },
// };

// // Collections
// export const collectionsApi = {
//   getAll:    (params?: { creator?: string; collaborator?: string; visibility?: 'public'; page?: number; limit?: number }) => {
//     const query = new URLSearchParams(params as Record<string, string>).toString();
//     return api.getPaginated<Collection>(`/api/collections${query ? `?${query}` : ''}`);
//   },
//   getOne:    (address: string) =>
//     api.get<Collection & { nftCount: number }>(`/api/collections/${address}`),

//   getNFTs:   (address: string, page = 1, limit = 20) =>
//     api.getPaginated<NFT>(`/api/collections/${address}/nfts?page=${page}&limit=${limit}`),
// };

// // NFTs
// export const nftsApi = {
//   getOne:      (collection: string, tokenId: string) =>
//     api.get<NFT & { activeListing: Listing | null }>(`/api/nfts/${collection}/${tokenId}`),

//   getByCategory: (category: string, page = 1, limit = 20) =>
//     api.getPaginated<NFT>(`/api/nfts/category/${category}?page=${page}&limit=${limit}`),

//   getAll: (page = 1, limit = 20) =>
//     api.getPaginated<NFT>(`/api/nfts?page=${page}&limit=${limit}`),
// };

// // Listings
// export const listingsApi = {
//   getAll:     (params?: { status?: string; seller?: string; collection?: string; page?: number }) => {
//     const query = new URLSearchParams(params as Record<string, string>).toString();
//     return api.getPaginated<Listing>(`/api/listings${query ? `?${query}` : ''}`);
//   },
//   getOne:     (listingId: string) =>
//     api.get<Listing>(`/api/listings/${listingId}`),

//   getAuctions: (page = 1, limit = 20) =>
//     api.getPaginated<Listing>(`/api/listings/auctions?page=${page}&limit=${limit}`),

//   getFixed:   (page = 1, limit = 20) =>
//     api.getPaginated<Listing>(`/api/listings/fixed?page=${page}&limit=${limit}`),
// };

// // Activity
// export const activityApi = {
//   getAll: (params?: { type?: string; collection?: string; page?: number }) => {
//     const query = new URLSearchParams(params as Record<string, string>).toString();
//     return api.getPaginated<Activity>(`/api/activity${query ? `?${query}` : ''}`);
//   },
// };