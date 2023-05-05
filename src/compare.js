const fs = require('fs')
const { URL } = require('url')

function readJsonFile (filename) {
  const content = fs.readFileSync(filename, 'utf-8')
  return JSON.parse(content)
}

function findReportByUrl (reports, url) {
  return reports.find(report => report.url === url)
}

function compareCookies(cookies1, cookies2, compareCookieValues) {
  if (cookies1.length !== cookies2.length) {
    return false;
  }

  for (const cookie1 of cookies1) {
    const matchingCookie = cookies2.find((cookie2) => cookie1.name === cookie2.name);

    if (!matchingCookie) {
      return false;
    }

    // Check the cookie values only if the `compareCookieValues` is true
    if (compareCookieValues && cookie1.value !== matchingCookie.value) {
      return false;
    }
  }

  return true;
}



function compareScripts (scripts1, scripts2, compareScriptNamesOnly) {
  if (scripts1.length !== scripts2.length) {
    return false
  }

  for (const script1 of scripts1) {
    let matchingScript
    if (compareScriptNamesOnly) {
      const script1Name = new URL(script1).pathname.split('/').pop()
      matchingScript = scripts2.find(script2 => {
        const script2Name = new URL(script2).pathname.split('/').pop()
        return script1Name === script2Name
      })
    } else {
      matchingScript = scripts2.find(script2 => script1 === script2)
    }

    if (!matchingScript) {
      return false
    }
  }

  return true
}

function createScriptsTable(scripts1, scripts2, fileName1, fileName2) {
  const rows = [];
  const allScripts = new Set([...scripts1, ...scripts2]);
  const sortedScripts = Array.from(allScripts).sort((a, b) => a.localeCompare(b));

  for (const script of sortedScripts) {
    const script1Exists = scripts1.includes(script);
    const script2Exists = scripts2.includes(script);
    const mismatch = script1Exists !== script2Exists;
    rows.push(
      `<tr>
        <td${mismatch ? ' class="red-text"' : ''}>${script}</td>
        <td>${script1Exists ? '✔️' : ''}</td>
        <td>${script2Exists ? '✔️' : ''}</td>
      </tr>`
    );
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Script</th>
          <th>${fileName1}</th>
          <th>${fileName2}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function createCookiesTable(cookies1, cookies2, fileName1, fileName2) {
  const rows = [];
  const allCookies = new Set([...cookies1.map((c) => c.name), ...cookies2.map((c) => c.name)]);
  const sortedCookies = Array.from(allCookies).sort((a, b) => a.localeCompare(b));

  for (const cookieName of sortedCookies) {
    const cookie1 = cookies1.find((cookie) => cookie.name === cookieName);
    const cookie2 = cookies2.find((cookie) => cookie.name === cookieName);
    const nameMismatch = !cookie1 || !cookie2;
    const valueMismatch = compareCookieValues && cookie1 && cookie2 && cookie1.value !== cookie2.value;
    rows.push(
      `<tr>
        <td${nameMismatch || valueMismatch ? ' class="red-text"' : ''}>${cookieName}</td>
        <td>${cookie1 ? '✔️' : ''}</td>
        <td>${cookie2 ? '✔️' : ''}</td>
      </tr>`
    );
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Cookie Name</th>
          <th>${fileName1}</th>
          <th>${fileName2}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function generateHtmlMismatchReport (mismatches, fileName1, fileName2) {
  const mismatchSections = mismatches.map(mismatch => {
    const scriptTable = mismatch.scriptMismatches.length > 0 && mismatch.scriptMismatches[0].length === 2
  ? createScriptsTable(mismatch.scriptMismatches[0][0], mismatch.scriptMismatches[0][1], fileName1, fileName2)
  : '';
    const cookieTable = mismatch.cookieMismatches.length > 0
      ? createCookiesTable(mismatch.cookieMismatches[0][0], mismatch.cookieMismatches[0][1], fileName1, fileName2)
      : ''
    const reasons = mismatch.mismatchReasons.map(reason => `<h4 style="color: red;">${reason}</h4>`).join('')

    return `
      <div>
        <h2>${mismatch.url}</h2>
        ${reasons}
        <h3>Scripts</h3>
        ${scriptTable}
        <h3>Cookies</h3>
        ${cookieTable}
      </div>
    `
  }).join('')

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comparison Report</title>
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
  h1 {
    font-size: 2.5rem;
  }
  h2 {
    font-size: 2rem;
  }
  h3 {
    font-size: 1.5rem;
  }
  h4 {
    font-size: 1.25rem;
  }
  .red-text {
    color: red;
  }
</style>

</head>
<body>
  <h1>Comparison Report</h1>
  ${mismatchSections}
</body>
</html>
`
  fs.writeFileSync('compare-report.html', htmlContent)
}

const args = process.argv.slice(2)

if (args.length !== 4) {
  console.error("Please provide two file names, compareScriptNamesOnly flag (true or false), and compareCookieValues flag (true or false) as command line arguments.");
  process.exit(1);
}

const [file1, file2, compareScriptNamesOnlyArg, compareCookieValuesArg] = args;
const compareScriptNamesOnly = compareScriptNamesOnlyArg.toLowerCase() === "true";
const compareCookieValues = compareCookieValuesArg.toLowerCase() === "true";

const report1 = readJsonFile(file1)
const report2 = readJsonFile(file2)

const mismatches = []

for (const entry1 of report1) {
  const entry2 = findReportByUrl(report2, entry1.url)

  if (entry2) {
    let mismatchReasons = []
    const scriptMismatches = []
    const cookieMismatches = []
    if (!compareCookies(entry1.cookies, entry2.cookies, compareCookieValues)) {
      mismatchReasons.push("Cookie mismatch");
      const sortedCookies1 = entry1.cookies.slice().sort((a, b) => a.name.localeCompare(b.name));
      const sortedCookies2 = entry2.cookies.slice().sort((a, b) => a.name.localeCompare(b.name));
      cookieMismatches.push([sortedCookies1, sortedCookies2]);
    }

    if (!compareScripts(entry1.scripts, entry2.scripts, compareScriptNamesOnly)) {
      mismatchReasons.push(compareScriptNamesOnly ? 'Script name mismatch' : 'Script URL mismatch')
      const sortedScripts1 = entry1.scripts.slice().sort((a, b) => a.localeCompare(b))
      const sortedScripts2 = entry2.scripts.slice().sort((a, b) => a.localeCompare(b))
      scriptMismatches.push([sortedScripts1, sortedScripts2])
    }

    if (mismatchReasons.length > 0) {
      mismatches.push({
        url: entry1.url,
        mismatchReasons,
        scriptMismatches,
      cookieMismatches})
    }
  }
}

if (mismatches.length > 0) {
  const outputFilename = 'mismatch-results.json'
  fs.writeFileSync(outputFilename, JSON.stringify(mismatches, null, 2))
  console.log(`Comparison complete. Mismatches saved to ${outputFilename}`)

  generateHtmlMismatchReport(mismatches, file1, file2)
  console.log('Mismatch HTML report generated: compare-report.html')
} else {
  console.log('No mismatches found.')
}
