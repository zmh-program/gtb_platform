import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { StatsDisplay } from '@/components/stats-display';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, apiKey } = body;

    if (!username || !apiKey) {
      return NextResponse.json(
        { error: 'Username and API key are required' },
        { status: 400 }
      );
    }

    // Fetch stats data
    const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, api_key: apiKey }),
    });

    const statsData = await statsResponse.json();

    if (!statsResponse.ok) {
      return NextResponse.json(
        { error: statsData.error || 'Failed to fetch stats' },
        { status: statsResponse.status }
      );
    }

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: 800,
      height: 600,
    });

    // Set dark mode
    await page.evaluateOnNewDocument(() => {
      document.documentElement.classList.add('dark');
    });

    // Render the component
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: #000;
              color: #fff;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${StatsDisplay({ stats: statsData.player })}
          </div>
        </body>
      </html>
    `;

    await page.setContent(html);

    // Wait for images to load
    await page.waitForSelector('img');

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    await browser.close();

    // Return the image
    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating stats image:', error);
    return NextResponse.json(
      { error: 'Failed to generate stats image' },
      { status: 500 }
    );
  }
} 