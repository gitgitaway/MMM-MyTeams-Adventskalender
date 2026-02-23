import os
import urllib.request
import time

# Script to download random images for themes
# Designed to be path agnostic and robust
# Annotated in English as per requirements

def download_images(theme_name, keyword, count=24):
    """
    Downloads random images for a specific theme.
    Saves them as 01.jpg through 24.jpg.
    """
    # Use absolute path to the module root
    base_dir = os.path.abspath(os.path.dirname(__file__))
    target_dir = os.path.join(base_dir, 'Themes', theme_name, 'images')
    
    # Ensure directory exists
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        print(f"Created directory: {target_dir}")
    
    print(f"Starting download for theme: {theme_name} ({keyword})")
    
    # We use loremflickr for random images based on keywords
    url_base = f"https://loremflickr.com/800/600/{keyword}"
    
    for i in range(1, count + 1):
        filename = f"{str(i).zfill(2)}.jpg"
        filepath = os.path.join(target_dir, filename)
        
        # Avoid redownloading if file already exists
        if os.path.exists(filepath):
            print(f"File {filename} already exists, skipping.")
            continue
            
        try:
            # We add a timestamp to the URL to prevent caching of the same random image
            download_url = f"{url_base}?t={int(time.time()) + i}"
            print(f"Downloading {filename}...")
            
            # Simple request using standard library to minimize dependencies
            request = urllib.request.Request(
                download_url, 
                data=None, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            
            with urllib.request.urlopen(request) as response, open(filepath, 'wb') as out_file:
                out_file.write(response.read())
            
            # Brief pause to respect server rate limits
            time.sleep(1)
            
        except Exception as e:
            print(f"Error downloading {filename}: {e}")

if __name__ == "__main__":
    # Download Family themed images (Keywords: family, christmas)
    download_images("Family", "family,christmas")
    
    # Download Traditional themed images (Keywords: christmas, decoration)
    download_images("Traditional", "christmas,decoration")
    
    print("Download process complete.")
