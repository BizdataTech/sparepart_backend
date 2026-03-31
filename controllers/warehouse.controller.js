import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import fs from "fs";
import puppeteer from "puppeteer";
import path from "path";

// Generates and streams a warehouse product list PDF for a given order.
// Steps:
//   1. Fetch the order by ID using aggregation — unwinds items and joins product data
//      so we have the product_title, part_number, and quantity for each line item.
//   2. Read the HTML template from the filesystem (warehouse.productlist.html).
//   3. Build an HTML table rows string by mapping each order item to a <tr> block.
//   4. Inject the rows into the template by replacing the {{rows}} placeholder.
//   5. Launch a headless Puppeteer browser, load the HTML, and render it to a PDF buffer.
//   6. Send the PDF buffer as a downloadable attachment.
// This is used in the admin/warehouse panel to print a pick list for warehouse staff.
export const productListPDF = async (req, res) => {
  try {
    // Join product details for each order item using aggregation
    let order = (
      await Order.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "autoproducts",
            localField: "items.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: "$product",
        },
        {
          // Re-group to get the order's item list in a single document
          $group: {
            _id: "$_id",
            items: {
              $push: {
                product: "$product",
                quantity: "$items.quantity",
              },
            },
            orderNumber: { $first: "$orderNumber" },
          },
        },
      ])
    )[0];

    // Load the HTML template from disk
    const htmlPath = path.join(
      process.cwd(),
      "./templates/warehouse.productlist.html",
    );

    let html = fs.readFileSync(htmlPath, "utf8");

    // Build the table rows string by mapping each product to an HTML <tr>
    let table_rows = order.items
      .map(
        (item, i) =>
          `
        <tr>
            <td>${i + 1}</td>
            <td>${item.product.product_title}</td>
            <td>${item.product.part_number}</td>
            <td>${item.quantity}</td>
        </tr>
        `,
      )
      .join("");

    // Inject rows into the template by replacing the placeholder token
    html = html.replace("{{rows}}", table_rows);

    // Use Puppeteer to render the filled HTML to a PDF buffer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    let pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Send the PDF as a downloadable file attachment
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=warehouse-product-list.pdf",
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.log("failed to download pdf:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
