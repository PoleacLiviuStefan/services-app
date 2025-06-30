// lib/zoomSdkService.ts
class ZoomSDKService {
  private static instance: ZoomSDKService;
  private zoomSDK: any = null;
  private loading = false;
  private loadPromise: Promise<any> | null = null;

  private constructor() {}

  static getInstance(): ZoomSDKService {
    if (!ZoomSDKService.instance) {
      ZoomSDKService.instance = new ZoomSDKService();
    }
    return ZoomSDKService.instance;
  }

  async loadSDK(): Promise<any> {
    // Return existing SDK if already loaded
    if (this.zoomSDK) {
      return this.zoomSDK;
    }

    // Return existing promise if currently loading
    if (this.loading && this.loadPromise) {
      return this.loadPromise;
    }

    this.loading = true;
    this.loadPromise = this._loadSDKInternal();

    try {
      this.zoomSDK = await this.loadPromise;
      return this.zoomSDK;
    } finally {
      this.loading = false;
    }
  }

  private async _loadSDKInternal(): Promise<any> {
    // Wait for DOM ready
    if (typeof window === 'undefined') {
      throw new Error('Window not available');
    }

    await new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve(), { once: true });
      }
    });

    // Try multiple loading methods
    let sdk = null;

    // Method 1: Window object
    if ((window as any).ZoomVideo) {
      sdk = (window as any).ZoomVideo;
      console.log('✅ Zoom SDK found on window');
    } 
    // Method 2: Dynamic import
    else {
      try {
        const module = await import('@zoom/videosdk');
        sdk = module.default || module;
        console.log('✅ Zoom SDK loaded via import');
      } catch (error) {
        console.warn('Dynamic import failed:', error);
        
        // Method 3: Script injection
        sdk = await this._loadViaScript();
      }
    }

    if (!sdk || typeof sdk.createClient !== 'function') {
      throw new Error('Invalid Zoom SDK - createClient not found');
    }

    return sdk;
  }

  private async _loadViaScript(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="zoom.us/videosdk"]');
      if (existingScript && (window as any).ZoomVideo) {
        resolve((window as any).ZoomVideo);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://source.zoom.us/videosdk/1.11.8/lib/index.js';
      script.async = true;
      
      script.onload = () => {
        if ((window as any).ZoomVideo) {
          console.log('✅ Zoom SDK loaded via script');
          resolve((window as any).ZoomVideo);
        } else {
          reject(new Error('Script loaded but ZoomVideo not found'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Zoom SDK script'));
      };

      document.head.appendChild(script);
    });
  }

  isLoaded(): boolean {
    return !!this.zoomSDK;
  }

  getSDK(): any {
    return this.zoomSDK;
  }

  async createClient(): Promise<any> {
    const sdk = await this.loadSDK();
    return sdk.createClient();
  }

  cleanup(): void {
    if (this.zoomSDK && typeof this.zoomSDK.destroyClient === 'function') {
      try {
        this.zoomSDK.destroyClient();
      } catch (error) {
        console.warn('Error during SDK cleanup:', error);
      }
    }
  }
}

export default ZoomSDKService.getInstance();