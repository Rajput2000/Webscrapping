const fs = require("fs");
const { plugin } = require("puppeteer-with-fingerprints");

const appendToCSV = (data) => {
  // console.log(data);
  // Append the data to the CSV file
  fs.appendFileSync("result.csv", data + "\n", "utf8");
};

const csvEscape = (text) => {
  if (text === null || text === undefined) {
    return '""';
  }
  // Escape double quotes by doubling them
  const escapedText = text.replace(/"/g, '""');
  // Enclose in double quotes
  return `"${escapedText}"`;
};

const scrapeReviews = async (page, url) => {
  // Navigate to the Cloudways reviews page
  await page.goto(url, { waitUntil: "networkidle2" });

  // let nextButtonFound = true;

  // while (nextButtonFound) {
  // console.log(nextButtonFound);
  // Wait for reviews to be loaded
  await page.waitForSelector(".nested-ajax-loading");

  // Select all review elements with the specified class name
  const reviewsHandles = await page.$$(
    ".paper.paper--white.paper--box.mb-2.position-relative.border-bottom"
  );
  console.log("Number of review elements found:", reviewsHandles.length);

  for (const reviewHandle of reviewsHandles) {
    // Extract the name using the class "link--header-color"
    const name = await page.evaluate((el) => {
      const linkElement = el.querySelector(".link--header-color");
      return linkElement ? linkElement.textContent.trim() : null;
    }, reviewHandle);
    // console.log(name || "Name not found");

    // Find the element with the class name "f-1 d-f ai-c mb-half-small-only"
    const ratings = await page.evaluate((el) => {
      const targetElement = el.querySelector(
        ".f-1.d-f.ai-c.mb-half-small-only"
      );
      if (targetElement) {
        // Get the first div within this element
        const firstDiv = targetElement.querySelector("div");
        if (firstDiv) {
          // Extract the class name of the first div
          const className = firstDiv.className;
          // Extract numbers at the end of the class name
          const numbers = className.match(/\d+$/);
          return numbers ? numbers[0] : "No numbers found";
        }
      }
      return "No matching element found";
    }, reviewHandle);
    // console.log("Extracted numbers:", ratings);

    // Extract the date using the class "x-current-review-date"
    const date = await page.evaluate((el) => {
      const linkElement = el.querySelector(".x-current-review-date");
      return linkElement ? linkElement.textContent.trim() : null;
    }, reviewHandle);
    // console.log(date);

    // Extract and print the product name from the URL
    const productName = url.match(/products\/([^\/]+)\//)[1];
    // console.log("Product name extracted from URL:", productName);

    // Find the button with the class name "js-action d-f" and extract the data-clipboard-text attribute
    const reviewURL = await page.evaluate((el) => {
      const button = el.querySelector(".js-action.d-f");
      return button
        ? button.getAttribute("data-clipboard-text")
        : "Button not found";
    }, reviewHandle);
    // console.log("Data clipboard text from button:", reviewURL);

    // Extract the text from the div with class name "m-0 l2"
    const textMain = await page.evaluate((el) => {
      const element = el.querySelector(".m-0.l2");
      return element ? element.textContent.trim() : "Text not found";
    }, reviewHandle);
    // console.log("Text of element with class 'm-0 l2':", textMain);

    // Extract the text from the div with attribute itemprop="reviewBody"
    const reviewBody = await page.evaluate((el) => {
      const reviewElement = el.querySelector('[itemprop="reviewBody"]');
      if (reviewElement) {
        // Clean up the review body text by removing " Review collected by and hosted on G2.com."
        const text = reviewElement.textContent.trim();
        return text.replace(/ Review collected by and hosted on G2.com\./g, "");
      }
      return "Review not found";
    }, reviewHandle);
    // console.log("Cleaned review body text:", reviewBody);
    // Embed reviewBody in a list

    // Format the data for CSV
    const csvRow = [
      csvEscape(name),
      csvEscape(ratings),
      csvEscape(date),
      csvEscape(productName),
      csvEscape(reviewURL),
      csvEscape(textMain),
      csvEscape(reviewBody),
    ].join(",");
    // console.log(csvRow);

    // Append the row to the CSV file
    appendToCSV(csvRow);
  }
  // const paginationComponents = await page.$$(".pagination__component"); // Find all elements with the class name

  // let nextButtonFound = false;

  // Loop through each element to check for the "Next ›" text
  // for (const component of paginationComponents) {
  // const text = await page.evaluate(
  // (el) => el.textContent.trim(),
  // component
  // ); // Extract the text content
  // console.log(text);
  // if (text === "Next ›") {
  // await component.click(); // Click the element
  // await page.waitForNavigation({ waitUntil: "networkidle2" }); // Wait for the page to load
  // nextButtonFound = true;
  // break;
  // }
  // }

  // if (!nextButtonFound) {
  // console.log("Next button not found or no more pages.");
  // }
  // }
};

const main = async () => {
  plugin.setServiceKey("");

  const fingerprint = await plugin.fetch({
    tags: ["Microsoft Windows", "Chrome"],
  });

  plugin.useFingerprint(fingerprint);

  const browser = await plugin.launch({
    headless: false,
    defaultViewport: false,
  });
  // Write the header row to CSV
  const header =
    "Name,Ratings,Date,Product Name,reviewURL,reviewHeader,reviewBody";
  if (!fs.existsSync("result.csv")) {
    fs.writeFileSync("result.csv", header + "\n", "utf8");
  }
  const page = await browser.newPage();

  await page.goto("https://www.g2.com/identities/start_login");
  await page.waitForSelector("input[type='email']");
  await page.type("input[type='email']", "YOUR-EMAIL-ADDRESS", {
    delay: 300,
  });
  await page.type("input[type='password']", "YOUR-PASSWORD", {
    delay: 300,
  });
  await page.evaluate(() => {
    document.querySelector("input[type='submit']").click();
  });

  // Increase the navigation timeout
  await page.waitForNavigation({
    timeout: 60000,
    waitUntil: "networkidle2",
  });

  // List of review URLs
  const companies = [
    "https://www.g2.com/products/cloudways/reviews?utf8=%E2%9C%93&order=most_recent",
    "https://www.g2.com/products/wp-engine/reviews?utf8=%E2%9C%93&order=most_recent",
    "https://www.g2.com/products/hostinger/reviews?utf8=%E2%9C%93&order=most_recent",
    "https://www.g2.com/products/siteground/reviews?utf8=%E2%9C%93&order=most_recent",
    "https://www.g2.com/products/pantheon/reviews?utf8=%E2%9C%93&order=most_recent",
  ];

  for (const url of companies) {
    await scrapeReviews(page, url);
  }

  // Close the browser after your interactions are complete
  await browser.close();
};

main();
