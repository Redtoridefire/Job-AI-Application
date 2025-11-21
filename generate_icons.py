#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create image with gradient-like colors
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # Draw a rounded rectangle background
    draw.rounded_rectangle([(0, 0), (size, size)], radius=size//6, fill='#667eea')
    
    # Add a circular element
    circle_size = size // 2
    circle_pos = (size // 4, size // 4)
    draw.ellipse([circle_pos, (circle_pos[0] + circle_size, circle_pos[1] + circle_size)], 
                 fill='#764ba2')
    
    # Try to add text
    try:
        font_size = size // 2
        # Use default font
        text = "🎯"
        text_bbox = draw.textbbox((0, 0), text, font=None)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        position = ((size - text_width) // 2, (size - text_height) // 2)
        draw.text(position, text, fill='white')
    except:
        # If font fails, just use a simple shape
        pass
    
    # Save image
    img.save(filename, 'PNG')
    print(f'Created {filename}')

# Create icons directory
os.makedirs('icons', exist_ok=True)

# Create icons in different sizes
create_icon(16, 'icons/icon16.png')
create_icon(48, 'icons/icon48.png')
create_icon(128, 'icons/icon128.png')

print('All icons created successfully!')
