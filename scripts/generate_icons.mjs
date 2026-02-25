import sharp from 'sharp';
import fs from 'fs';

const imageBuffer = fs.readFileSync('./public/assets/app_icon.jpeg');

async function buildIcons() {
    // Generate rounded app icon to simulate iOS / generic app icon style if needed, 
    // or just resize the square image since app icons are automatically masked by the OS.
    await sharp(imageBuffer).resize(180, 180).png().toFile('./public/apple-touch-icon.png');
    await sharp(imageBuffer).resize(192, 192).png().toFile('./public/icon-192x192.png');
    await sharp(imageBuffer).resize(512, 512).png().toFile('./public/icon-512x512.png');
    console.log("Icons generated successfully from jpeg.");
}

buildIcons();
