const puppeteer = require('puppeteer');
const fs = require('fs');
const url = require('url');

async function takeScreenshots(page, folder) {
  const screenshotPath = `${folder}/screenshot.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

function extractDomainName(urlString) {
  const parsedUrl = url.parse(urlString);
  return parsedUrl.hostname;
}

async function checkLoadedScripts(page) {
  const scripts = await page.evaluate(() => {
    const scriptTags = Array.from(document.querySelectorAll('script[src]'));
    return scriptTags.map(tag => tag.src);
  });

  return scripts;
}

async function checkCookies(page) {
  const cookies = await page.cookies();
  return cookies;
}

function createScriptsTable(scripts) {
    const rows = scripts.map(script => `<tr><td>${script}</td></tr>`).join('');
    return `
      <style>
        table {
          border-collapse: collapse;
          width: 100%;
          font-family: Arial, sans-serif;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
      </style>
      <table>
        <thead>
          <tr>
            <th>Script URL</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }
  

function createCookiesTable(cookies) {
  const rows = cookies.map(cookie => `<tr><td>${cookie.name}</td><td>${cookie.value}</td></tr>`).join('');
  return `
    <table>
      <thead>
        <tr>
          <th>Cookie Name</th>
          <th>Cookie Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateHtmlReport(screenshotPath, scripts, cookies, folder) {
  const scriptsTable = createScriptsTable(scripts);
  const cookiesTable = createCookiesTable(cookies);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Report</title>
</head>
<body>
  <h1>Website Report</h1>
  <h2>Screenshot</h2>
  <div>
    <img src="screenshot.png" alt="Screenshot" style="width: 100%;">
  </div>
  <h2>Scripts</h2>
  ${scriptsTable}
  <h2>Cookies</h2>
  ${cookiesTable}
</body>
</html>
`;

  fs.writeFileSync(`${folder}/report.html`, htmlContent);
}

async function processUrl(urlString) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
  
    await page.goto(urlString, { waitUntil: 'networkidle2', timeout: 30000 });
  
    const domainName = extractDomainName(urlString);
    const timestamp = Date.now();
    const folder = `${domainName}-${timestamp}`;
  
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  
    const screenshotPath = await takeScreenshots(page, folder);
    const scripts = await checkLoadedScripts(page);
    const cookies = await checkCookies(page);
  
    generateHtmlReport(screenshotPath, scripts, cookies, folder);
  
    await browser.close();
  
    return {
      url: urlString,
      domain: domainName,
      scripts,
      cookies: cookies.map(cookie => ({ name: cookie.name, value: cookie.value })),
    };
  }
  
  const fileContent = fs.readFileSync('urls.txt', 'utf-8');
  const urls = fileContent.split('\n');
  
  (async () => {
    const results = [];
    for (const urlString of urls) {
      if (urlString.trim() !== '') {
        console.log(`Processing: ${urlString}`);
  
        const result = await processUrl(urlString);
        results.push(result);
      }
    }
  
    const timestamp = Date.now();
    const reportFileName = `report-${timestamp}.json`;
    fs.writeFileSync(reportFileName, JSON.stringify(results, null, 2));
  })();