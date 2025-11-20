
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon, LinkIcon, GlobeIcon, LayoutGridIcon } from './icons';
import Spinner from './Spinner';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
}

// Helper to convert image URL to a File object using a canvas to bypass potential CORS issues.
const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const mimeType = blob.type || 'image/png';
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, 'image/png');
        };

        image.onerror = (error) => {
            reject(new Error(`Could not load image from URL for canvas conversion. Error: ${error}`));
        };

        image.src = url;
    });
};

// Helper to ensure the blob is a supported image type, converting if necessary (e.g. GIF to PNG)
const ensureSupportedImage = async (blob: Blob, filename: string): Promise<File> => {
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
    if (supportedTypes.includes(blob.type)) {
        return new File([blob], filename, { type: blob.type });
    }

    // Convert unsupported types (GIF, BMP, etc.) to PNG
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
            // Basic validation for tiny images (tracking pixels)
            if (img.width < 50 || img.height < 50) {
                 URL.revokeObjectURL(url);
                 reject(new Error('Image is too small to be valid.'));
                 return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Could not create canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((newBlob) => {
                URL.revokeObjectURL(url);
                if (newBlob) {
                    // Swap extension to .png
                    const newName = filename.replace(/\.[^/.]+$/, "") + ".png";
                    resolve(new File([newBlob], newName, { type: 'image/png' }));
                } else {
                    reject(new Error('Canvas toBlob failed'));
                }
            }, 'image/png');
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for conversion.'));
        };
        
        img.src = url;
    });
};

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe }) => {
    const [activeTab, setActiveTab] = useState<'wardrobe' | 'link'>('wardrobe');
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [isUrlLoading, setIsUrlLoading] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<string>('');

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || activeGarmentIds.includes(item.id)) return;
        setError(null);
        try {
            const file = await urlToFile(item.url, item.name);
            onGarmentSelect(file, item);
        } catch (err) {
            const detailedError = `Failed to load wardrobe item. This is often a CORS issue. Check the developer console for details.`;
            setError(detailedError);
            console.error(`[CORS Check] Failed to load and convert wardrobe item from URL: ${item.url}.`, err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file.');
                return;
            }
            const customGarmentInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
            };
            onGarmentSelect(file, customGarmentInfo);
        }
    };

    const processBlob = async (blob: Blob, name: string) => {
         if (!blob.type.startsWith('image/')) {
             throw new Error('Content is not an image.');
        }
        
        // Default filename based on blob type
        let extension = blob.type.split('/')[1] || 'bin';
        if (extension === 'jpeg') extension = 'jpg';
        const filename = `product-${Date.now()}.${extension}`;

        try {
            // Ensure we convert GIFs or other unsupported formats to PNG
            const file = await ensureSupportedImage(blob, filename);
            
            const customItem: WardrobeItem = {
                id: `link-${Date.now()}`,
                name: name.substring(0, 30),
                url: URL.createObjectURL(file),
            };
            
            onGarmentSelect(file, customItem);
            setUrlInput('');
        } catch (err) {
            console.error("Image processing error:", err);
            throw new Error("Failed to process the image. It might be corrupted, too small, or an unsupported format.");
        }
    }

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput.trim()) return;
        
        setIsUrlLoading(true);
        setUrlError(null);
        setLoadingStatus('Analyzing link...');
        
        try {
            // Use corsproxy.io which handles redirects (e.g. amzn.eu) and headers better than allorigins
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(urlInput)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                 throw new Error('Could not access the provided URL.');
            }

            const contentType = response.headers.get('content-type') || '';
            let finalImageUrl = '';
            let productName = 'Web Item';

            // If it's directly an image
            if (contentType.startsWith('image/')) {
                const blob = await response.blob();
                await processBlob(blob, 'Web Image');
                setIsUrlLoading(false);
                setLoadingStatus('');
                return;
            }

            // Parse HTML
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // --- Strategy 1: JSON-LD (Structured Data) ---
            // Common on major e-commerce sites (Myntra, etc.)
            const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.textContent || '{}');
                    const items = Array.isArray(json) ? json : [json];
                    for (const item of items) {
                         if (item['@type']?.includes('Product') || item['@type']?.includes('ItemPage')) {
                             if (item.image) {
                                 if (Array.isArray(item.image)) finalImageUrl = item.image[0];
                                 else if (typeof item.image === 'string') finalImageUrl = item.image;
                                 else if (item.image.url) finalImageUrl = item.image.url;
                             }
                             if (item.name && productName === 'Web Item') productName = item.name;
                         }
                    }
                } catch (e) { /* ignore parse errors */ }
            }

            // --- Strategy 2: Amazon Specific Heuristics ---
            // Amazon stores high-res images in a JSON attribute 'data-a-dynamic-image'
            if (!finalImageUrl) {
                const amazonImg = doc.getElementById('landingImage') || doc.getElementById('imgBlkFront');
                if (amazonImg) {
                    const dyn = amazonImg.getAttribute('data-a-dynamic-image');
                    if (dyn) {
                        try {
                            const images = JSON.parse(dyn);
                            // Map keys (URLs) to values [width, height]. Sort by area to get largest.
                            const sortedKeys = Object.keys(images).sort((a, b) => {
                                return (images[b][0] * images[b][1]) - (images[a][0] * images[a][1]);
                            });
                            if (sortedKeys.length > 0) finalImageUrl = sortedKeys[0];
                        } catch(e) {}
                    }
                    // Fallback to src if dynamic data fails
                    if (!finalImageUrl && (amazonImg as HTMLImageElement).src) {
                        finalImageUrl = (amazonImg as HTMLImageElement).src;
                    }
                }
            }

            // --- Strategy 3: Open Graph / Twitter Metadata ---
            if (!finalImageUrl) {
                finalImageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || 
                                doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || '';
            }

            // Try to get title if we haven't yet
            if (productName === 'Web Item') {
                 productName = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                               doc.querySelector('title')?.textContent?.split(/[:|-]/)[0].trim() || 'Web Item';
            }

            // --- Strategy 4: Brute Force Largest Image ---
            if (!finalImageUrl) {
                 const images = Array.from(doc.images);
                 for (const img of images) {
                     // Simple heuristic: needs to be absolute http url and not an icon
                     if (img.src.startsWith('http') && 
                        !img.src.includes('icon') && 
                        !img.src.includes('logo') && 
                        !img.src.includes('sprite') &&
                        !img.src.endsWith('.gif') // Avoid picking explicit gifs blindly
                        ) {
                         finalImageUrl = img.src;
                         break; // Take the first reasonable image
                     }
                 }
            }

            if (!finalImageUrl) {
                 throw new Error('Could not find a product image on this page.');
            }

            // --- Download the Image ---
            setLoadingStatus('Downloading image...');
            
            let imageBlob: Blob | null = null;
            
            // Attempt 1: Direct fetch (works if CDN allows CORS)
            try {
                const imgRes = await fetch(finalImageUrl);
                if (imgRes.ok) imageBlob = await imgRes.blob();
            } catch (e) { /* continue to proxy */ }

            // Attempt 2: Proxy fetch
            if (!imageBlob) {
                 const proxyImgUrl = `https://corsproxy.io/?${encodeURIComponent(finalImageUrl)}`;
                 const proxyImgRes = await fetch(proxyImgUrl);
                 if (proxyImgRes.ok) imageBlob = await proxyImgRes.blob();
            }

            if (!imageBlob) throw new Error('Failed to download the image file.');

            await processBlob(imageBlob, productName);

        } catch (err) {
            console.error(err);
            let msg = 'Could not process this link. Please try copying the "Image Address" directly.';
            if (err instanceof Error && err.message.includes('Failed to process')) {
                msg = err.message;
            }
            setUrlError(msg);
        } finally {
            setIsUrlLoading(false);
            setLoadingStatus('');
        }
    };

  return (
    <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
            <button
                onClick={() => setActiveTab('wardrobe')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === 'wardrobe' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <LayoutGridIcon className="w-4 h-4" />
                Wardrobe
            </button>
            <button
                onClick={() => setActiveTab('link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === 'link' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <GlobeIcon className="w-4 h-4" />
                Web Link
            </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'link' ? (
            <div className="flex-grow animate-fade-in">
                 <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-4">Add from Link</h2>
                 <form onSubmit={handleUrlSubmit} className="relative flex flex-col gap-4">
                    <div>
                         <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">
                            Product Page or Image URL
                         </label>
                        <div className="relative">
                            <input 
                                type="url" 
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://amazon.com/dp/..."
                                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                                disabled={isLoading || isUrlLoading}
                            />
                            <LinkIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                    
                    {urlError && (
                        <div className="bg-red-50 border border-red-100 rounded-md p-3">
                            <p className="text-xs text-red-600 leading-relaxed">{urlError}</p>
                        </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                         <p className="text-xs text-blue-800 font-medium mb-1">Supported sites:</p>
                         <p className="text-xs text-blue-700">
                            Amazon, Myntra, Meesho, Noon, and more. Simply paste the product page link.
                         </p>
                    </div>

                    <button 
                        type="submit"
                        disabled={!urlInput.trim() || isLoading || isUrlLoading}
                        className="mt-2 w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isUrlLoading ? (
                            <>
                                <Spinner />
                                <span>{loadingStatus}</span>
                            </>
                        ) : 'Add Item'}
                    </button>
                </form>
            </div>
        ) : (
            <div className="flex-grow animate-fade-in">
                <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-4">Wardrobe</h2>
                <div className="grid grid-cols-3 gap-3">
                    {wardrobe.map((item) => {
                    const isActive = activeGarmentIds.includes(item.id);
                    return (
                        <button
                        key={item.id}
                        onClick={() => handleGarmentClick(item)}
                        disabled={isLoading || isActive}
                        className="relative aspect-square border rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 group disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={`Select ${item.name}`}
                        >
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs font-bold text-center p-1">{item.name}</p>
                        </div>
                        {isActive && (
                            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8 text-white" />
                            </div>
                        )}
                        </button>
                    );
                    })}
                    <label htmlFor="custom-garment-upload" className={`relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 transition-colors ${isLoading ? 'cursor-not-allowed bg-gray-100' : 'hover:border-gray-400 hover:text-gray-600 cursor-pointer'}`}>
                        <UploadCloudIcon className="w-6 h-6 mb-1"/>
                        <span className="text-xs text-center">Upload</span>
                        <input id="custom-garment-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} disabled={isLoading}/>
                    </label>
                </div>
                {wardrobe.length === 0 && (
                    <p className="text-center text-sm text-gray-500 mt-4">Your uploaded garments will appear here.</p>
                )}
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            </div>
        )}
    </div>
  );
};

export default WardrobePanel;
