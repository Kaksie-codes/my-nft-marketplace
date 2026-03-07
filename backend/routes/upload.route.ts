import { Router, Request, Response } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { sendSuccess, sendBadRequest, sendServerError } from '../utils/response';

const router = Router();

// ── Multer — store file in memory (no disk writes) ────────────────────────────
// 50 MB limit matches the frontend validation.
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ALLOWED = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
    ];
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ── Pinata auth headers ───────────────────────────────────────────────────────
// Uses API key + secret (shorter than JWT — fits hosting platform limits).

function pinataHeaders(): Record<string, string> {
  const key    = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_API_SECRET;
  if (!key || !secret) throw new Error('PINATA_API_KEY or PINATA_API_SECRET is not set in .env');
  return {
    pinata_api_key:        key,
    pinata_secret_api_key: secret,
  };
}

// ── POST /api/upload/file ─────────────────────────────────────────────────────
// Accepts: multipart/form-data with field "file"
// Returns: { ipfsHash, ipfsUri }
router.post(
  '/file',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) return void sendBadRequest(res, 'No file provided');

    try {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename:    req.file.originalname,
        contentType: req.file.mimetype,
      });
      form.append('pinataMetadata', JSON.stringify({ name: req.file.originalname }));
      form.append('pinataOptions',  JSON.stringify({ cidVersion: 1 }));

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method:  'POST',
        headers: {
          ...pinataHeaders(),
          ...form.getHeaders(),
        },
        body: form,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Pinata error: ${text}`);
      }

      const data = await response.json() as { IpfsHash: string };
      sendSuccess(res, {
        ipfsHash: data.IpfsHash,
        ipfsUri:  `ipfs://${data.IpfsHash}`,
      });
    } catch (err) {
      sendServerError(res, err, 'POST /upload/file');
    }
  }
);

// ── POST /api/upload/metadata ─────────────────────────────────────────────────
// Accepts: JSON body matching the NFTMetadata shape
// Returns: { ipfsHash, ipfsUri }
router.post('/metadata', async (req: Request, res: Response): Promise<void> => {
  const metadata = req.body;

  if (!metadata?.name || !metadata?.image) {
    return void sendBadRequest(res, 'metadata.name and metadata.image are required');
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...pinataHeaders(),
      },
      body: JSON.stringify({
        pinataContent:  metadata,
        pinataMetadata: { name: `${metadata.name}-metadata` },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Pinata error: ${text}`);
    }

    const data = await response.json() as { IpfsHash: string };
    sendSuccess(res, {
      ipfsHash: data.IpfsHash,
      ipfsUri:  `ipfs://${data.IpfsHash}`,
    });
  } catch (err) {
    sendServerError(res, err, 'POST /upload/metadata');
  }
});

export default router;





// import { Router, Request, Response } from 'express';
// import multer from 'multer';
// import FormData from 'form-data';
// import fetch from 'node-fetch';
// import { sendSuccess, sendBadRequest, sendServerError } from '../utils/response';

// const router = Router();

// // ── Multer — store file in memory (no disk writes) ────────────────────────────
// // 50 MB limit matches the frontend validation.
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits:  { fileSize: 50 * 1024 * 1024 },
//   fileFilter: (_req, file, cb) => {
//     const ALLOWED = [
//       'image/jpeg', 'image/png', 'image/gif', 'image/webp',
//       'video/mp4', 'video/webm', 'video/quicktime',
//     ];
//     if (ALLOWED.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error(`Unsupported file type: ${file.mimetype}`));
//     }
//   },
// });

// // ── Pinata JWT ────────────────────────────────────────────────────────────────

// function pinataJwt(): string {
//   const jwt = process.env.PINATA_JWT;
//   if (!jwt) throw new Error('PINATA_JWT is not set in .env');
//   return jwt;
// }

// // ── POST /api/upload/file ─────────────────────────────────────────────────────
// // Accepts: multipart/form-data with field "file"
// // Returns: { ipfsHash, ipfsUri }
// router.post(
//   '/file',
//   upload.single('file'),
//   async (req: Request, res: Response): Promise<void> => {
//     if (!req.file) return void sendBadRequest(res, 'No file provided');

//     try {
//       const form = new FormData();
//       form.append('file', req.file.buffer, {
//         filename:    req.file.originalname,
//         contentType: req.file.mimetype,
//       });
//       form.append('pinataMetadata', JSON.stringify({ name: req.file.originalname }));
//       form.append('pinataOptions',  JSON.stringify({ cidVersion: 1 }));

//       const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
//         method:  'POST',
//         headers: {
//           Authorization: `Bearer ${pinataJwt()}`,
//           ...form.getHeaders(),
//         },
//         body: form,
//       });

//       if (!response.ok) {
//         const text = await response.text();
//         throw new Error(`Pinata error: ${text}`);
//       }

//       const data = await response.json() as { IpfsHash: string };
//       sendSuccess(res, {
//         ipfsHash: data.IpfsHash,
//         ipfsUri:  `ipfs://${data.IpfsHash}`,
//       });
//     } catch (err) {
//       sendServerError(res, err, 'POST /upload/file');
//     }
//   }
// );

// // ── POST /api/upload/metadata ─────────────────────────────────────────────────
// // Accepts: JSON body matching the NFTMetadata shape
// // Returns: { ipfsHash, ipfsUri }
// router.post('/metadata', async (req: Request, res: Response): Promise<void> => {
//   const metadata = req.body;

//   if (!metadata?.name || !metadata?.image) {
//     return void sendBadRequest(res, 'metadata.name and metadata.image are required');
//   }

//   try {
//     const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
//       method:  'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization:  `Bearer ${pinataJwt()}`,
//       },
//       body: JSON.stringify({
//         pinataContent:  metadata,
//         pinataMetadata: { name: `${metadata.name}-metadata` },
//       }),
//     });

//     if (!response.ok) {
//       const text = await response.text();
//       throw new Error(`Pinata error: ${text}`);
//     }

//     const data = await response.json() as { IpfsHash: string };
//     sendSuccess(res, {
//       ipfsHash: data.IpfsHash,
//       ipfsUri:  `ipfs://${data.IpfsHash}`,
//     });
//   } catch (err) {
//     sendServerError(res, err, 'POST /upload/metadata');
//   }
// });

// export default router;