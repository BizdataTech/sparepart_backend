import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import fs from "fs";
import puppeteer from "puppeteer";
import path from "path";

export const productListPDF = async (req, res) => {
  try {
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

    const htmlPath = path.join(
      process.cwd(),
      "./templates/warehouse.productlist.html",
    );

    let html = fs.readFileSync(htmlPath, "utf8");

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

    html = html.replace("{{rows}}", table_rows);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    let pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

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
